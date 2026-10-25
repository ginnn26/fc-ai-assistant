const express = require("express");
const multer = require("multer");
const { prepareConversation, answerConversation } = require('../services/care-chat');
const { createConfiguredMemberBudget } = require('../services/supabase-chat-store');
const { createEmailAuth } = require('../services/care-chat-email-auth');
const { transcribeAudio, transcribeCareVoice } = require("../services/openai");
const { inspectVoiceWav, MAX_BYTES } = require('../services/care-chat-audio');
const {
  generateRecommendations,
} = require("../services/assistant-recommendation");
function validAudio(file) {
  const b = file.buffer;
  const ext = (file.originalname || "").split(".").pop().toLowerCase();
  if (
    ![
      "webm",
      "m4a",
      "mp4",
      "mp3",
      "mpeg",
      "mpga",
      "ogg",
      "wav",
      "flac",
    ].includes(ext)
  )
    return false;
  if (b.length < 44) return false;
  return (
    b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) ||
    ["RIFF", "OggS", "fLaC"].includes(b.toString("ascii", 0, 4)) ||
    b.toString("ascii", 4, 8) === "ftyp" ||
    b.toString("ascii", 0, 3) === "ID3" ||
    (b[0] === 255 && (b[1] & 224) === 224)
  );
}
function createChatRouter({
  transcribe = transcribeAudio,
  transcribeVoice = transcribeCareVoice,
  careVoiceEnabled = process.env.FC_CARE_CHAT_VOICE_ENABLED === 'true',
  recommend = generateRecommendations,
  maxRequests = 60,
  now = Date.now,
  memberBudget = createConfiguredMemberBudget(),
  converse = answerConversation,
  enforceMemberBudget = memberBudget.ready === true || process.env.FC_CARE_CHAT_ENABLED === 'true',
  emailAuth = createEmailAuth({ url: process.env.FC_SUPABASE_URL,
    publicKey: process.env.FC_SUPABASE_PUBLISHABLE_KEY,
    enabled: process.env.FC_CARE_CHAT_ENABLED === 'true' }),
} = {}) {
  const router = express.Router(),
    upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 2 },
    });
  let active = 0,
    requests = 0,
    until = 0;
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("Referrer-Policy", "no-referrer");
    res.set("X-Content-Type-Options", "nosniff");
    const self =
      process.env.RENDER_EXTERNAL_URL || `http://${req.headers.host}`;
    const publicFeatures = req.method === 'GET' && req.path === '/features' && !req.headers.origin;
    if (!publicFeatures &&
      ![self, "https://frequencies-clinic.learnworlds.com"].includes(req.headers.origin))
      return res.status(403).json({ error: "origin_not_allowed" });
    if (now() > until) {
      requests = 0;
      until = now() + 600000;
    }
    if (++requests > maxRequests) {
      res.set("Retry-After", String(Math.ceil((until - now()) / 1000)));
      return res.status(429).json({ error: "please_wait" });
    }
    next();
  });
  const withSlot = (fn) => async (req, res) => {
    if (active >= 2) return res.status(429).json({ error: "please_wait" });
    active++;
    try {
      await fn(req, res);
    } catch {
      res.status(503).json({ error: "temporarily_unavailable" });
    } finally {
      active--;
    }
  };
  async function reserveAllowance(req, res, voice = false) {
    try { return await (voice ? memberBudget.reserveVoice(req) : memberBudget.reserveText(req)); }
    catch (error) {
      const known = ['member_budget_not_ready', 'member_login_required', 'monthly_allowance_reached'];
      const code = known.includes(error.message) ? error.message : 'member_budget_unavailable';
      res.status(code === 'member_login_required' ? 401 : code === 'monthly_allowance_reached' ? 429 : 503).json({ error: code });
      return null;
    }
  }
  router.get('/features', (req, res) => res.json({
    name: { zh: 'FC 暖心聊聊', en: 'FC Care Chat' },
    conversation: memberBudget.ready === true,
    emailLogin: memberBudget.ready === true && emailAuth.ready === true,
    allowanceStatus: typeof memberBudget.status === 'function',
    voiceInput: careVoiceEnabled && memberBudget.ready === true && typeof memberBudget.reserveVoice === 'function',
    monthlyAllowance: { scope: 'per_member', includedTextAttempts: memberBudget.includedTextAttempts || null,
      resetsIn: 'Asia/Kuala_Lumpur' },
  }));
  router.post('/allowance', withSlot(async (req, res) => {
    if (!memberBudget.ready || typeof memberBudget.status !== 'function')
      return res.status(503).json({ error: 'member_budget_not_ready' });
    try { res.json({ allowance: await memberBudget.status(req) }); }
    catch (error) {
      const code = error.message === 'member_login_required' ? 'member_login_required' : 'member_budget_unavailable';
      res.status(code === 'member_login_required' ? 401 : 503).json({ error: code });
    }
  }));
  const authAction = action => withSlot(async (req, res) => {
    if (!emailAuth.ready || !memberBudget.ready)
      return res.status(503).json({ error: 'member_budget_not_ready' });
    try {
      if (action === 'logout') {
        const authorization = req.headers.authorization;
        if (typeof authorization !== 'string' || !/^Bearer [A-Za-z0-9_.-]{30,8192}$/.test(authorization))
          return res.status(422).json({ error: 'invalid_login' });
        await emailAuth.signOut(authorization.slice(7));
        return res.json({ signedOut: true });
      }
      if (action === 'refresh') {
        const token = req.body?.refreshToken;
        if (typeof token !== 'string' || token.length < 8 || token.length > 1024)
          return res.status(422).json({ error: 'invalid_login' });
        return res.json(await emailAuth.refresh(token));
      }
      const email = req.body?.email;
      if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(422).json({ error: 'invalid_login' });
      if (action === 'request') {
        await emailAuth.requestCode(email.trim());
        return res.json({ sent: true });
      }
      const code = req.body?.code;
      if (typeof code !== 'string' || !/^\d{6,10}$/.test(code))
        return res.status(422).json({ error: 'invalid_login' });
      res.json(await emailAuth.verifyCode(email.trim(), code));
    } catch (error) {
      const code = ['auth_please_wait', 'invalid_or_expired_code', 'member_login_required'].includes(error.message) ? error.message : 'email_auth_unavailable';
      res.status(code === 'auth_please_wait' ? 429 : code === 'invalid_or_expired_code' ? 422 : code === 'member_login_required' ? 401 : 503).json({
        error: code,
      });
    }
  });
  router.post('/auth/request-code', authAction('request'));
  router.post('/auth/verify-code', authAction('verify'));
  router.post('/auth/refresh', authAction('refresh'));
  router.post('/auth/logout', authAction('logout'));
  router.post('/conversation', withSlot(async (req, res) => {
    if (req.body?.consent !== true)
      return res.status(422).json({ error: 'consent_required' });
    let prepared;
    try { prepared = prepareConversation(req.body.turns, req.body.language || 'zh'); }
    catch (error) { return res.status(422).json({ error: error.message }); }
    const allowance = await reserveAllowance(req, res);
    if (!allowance) return;
    const answer = await converse(prepared);
    res.json({ ...answer, allowance });
  }));
  router.post('/voice-draft', multer({ storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: 1, fields: 1 } }).single('audio'), withSlot(async (req, res) => {
    if (!careVoiceEnabled || !memberBudget.ready || typeof memberBudget.reserveVoice !== 'function')
      return res.status(503).json({ error: 'voice_input_not_ready' });
    if (req.body?.consent !== 'true') return res.status(422).json({ error: 'consent_required' });
    if (!req.file) return res.status(422).json({ error: 'audio_required' });
    try { inspectVoiceWav(req.file.buffer); }
    catch (error) { return res.status(422).json({ error: error.message }); }
    const allowance = await reserveAllowance(req, res, true);
    if (!allowance) return;
    const transcript = String(await transcribeVoice(req.file.buffer) || '').trim();
    if (!transcript || /^\[?(music|silence|blank audio|音乐|静音)\]?$/i.test(transcript))
      return res.status(422).json({ error: 'speech_not_clear', allowance });
    if (transcript.length > 1200) return res.status(422).json({ error: 'please_shorten', allowance });
    // Return a draft only. Never invoke conversation/recommendation here.
    res.json({ transcript, allowance });
  }));
  router.post(
    "/transcribe",
    upload.single("audio"),
    withSlot(async (req, res) => {
      if (req.body.consent !== "true")
        return res.status(422).json({ error: "consent_required" });
      if (!req.file) return res.status(400).json({ error: "audio_required" });
      if (!validAudio(req.file))
        return res.status(415).json({ error: "unsupported_audio" });
      // Keep paid voice closed until SERVER-side duration validation and voice
      // reservations share the member ledger. A browser duration is not proof.
      if (enforceMemberBudget)
        return res.status(503).json({ error: 'voice_allowance_not_ready' });
      const transcript = String(
        (await transcribe(req.file.buffer, req.file.originalname)) || "",
      ).trim();
      if (
        !transcript ||
        /^\[?(music|silence|blank audio|音乐|静音)\]?$/i.test(transcript)
      )
        return res.status(422).json({ error: "speech_not_clear" });
      if (transcript.length > 2000)
        return res.status(422).json({ error: "please_shorten" });
      res.json({ transcript });
    }),
  );
  const recommendation = withSlot(async (req, res) => {
    if (req.body?.consent !== true)
      return res.status(422).json({ error: "consent_required" });
    if (
      typeof req.body?.message !== "string" ||
      !req.body.message.trim() ||
      req.body.message.length > 2000
    )
      return res.status(422).json({ error: "invalid_message" });
    if (
      !["any", "intensive", "smooth", "bgm"].includes(
        req.body.preference || "any",
      )
    )
      return res.status(422).json({ error: "invalid_preference" });
    if (
      req.body.language !== undefined &&
      !["zh", "en"].includes(req.body.language)
    )
      return res.status(422).json({ error: "invalid_language" });
    const allowance = enforceMemberBudget ? await reserveAllowance(req, res) : null;
    if (enforceMemberBudget && !allowance) return;
    const result = await recommend(req.body.message.trim(), {
      language: req.body.language,
      preference: req.body.preference || "any",
    });
    const response = allowance ? { ...result, allowance } : result;
    res.json(req.path === "/" ? { reply: result.message, ...response } : response);
  });
  router.post("/recommend", recommendation);
  router.post("/", recommendation);
  router.use((err, req, res, next) =>
    res
      .status(err?.code === "LIMIT_FILE_SIZE" ? 413 : 400)
      .json({
        error:
          err?.code === "LIMIT_FILE_SIZE"
            ? "audio_too_large"
            : "invalid_upload",
      }),
  );
  return router;
}
module.exports = createChatRouter();
module.exports.createChatRouter = createChatRouter;
module.exports.validAudio = validAudio;
