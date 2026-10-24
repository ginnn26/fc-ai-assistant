const express = require("express");
const multer = require("multer");
const { screen, validateIntake } = require("../services/assistant-intake");
const { knowledge } = require("../services/assistant-knowledge");
const { createUsage } = require("../services/assistant-usage");
const { wavDuration } = require("../services/assistant-audio");
const { transcribeAudio } = require("../services/openai");
const {
  generateRecommendations,
  clinical,
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
  recommend = generateRecommendations,
  maxRequests = 60,
  now = Date.now,
  usage = createUsage(),
  source = knowledge,
} = {}) {
  const router = express.Router(),
    upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1,
        fields: 4,
        fieldSize: 4000,
      },
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
    if (
      ![self, "https://frequencies-clinic.learnworlds.com"].includes(
        req.headers.origin,
      )
    )
      return res.status(403).json({ error: "origin_not_allowed" });
    // Safety responses must not wait behind provider slots or usage/rate limits.
    if (
      req.method === "POST" &&
      ["/recommend", "/"].includes(req.path) &&
      req.body?.consent === true &&
      typeof req.body.message === "string" &&
      req.body.message.length <= 2000
    ) {
      try {
        const immediate = screen(
          req.body.message,
          validateIntake(req.body.intake),
          req.body.language,
        );
        if (immediate?.status === "safety")
          return res.json({
            ...immediate,
            mode: "guided",
            knowledge: source.status(),
          });
      } catch {}
    }
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
    } catch (e) {
      const known = [
        "daily_limit",
        "daily_budget",
        "consultation_limit",
        "session_required",
        "consultation_expired",
        "membership_not_connected",
        "invalid_membership_ticket",
        "usage_not_configured",
        "usage_storage_unavailable",
      ];
      const error = known.includes(e.message)
        ? e.message
        : "temporarily_unavailable";
      res
        .status(
          ["daily_limit", "daily_budget", "consultation_limit"].includes(error)
            ? 429
            : error === "session_required"
              ? 401
              : 503,
        )
        .json({ error, ...res.locals.allowance });
    } finally {
      active--;
    }
  };
  router.post(
    "/session",
    withSlot(async (req, res) => {
      const session = await usage.session(
        req.body?.sessionToken,
        req.body?.ticket,
      );
      res.json({
        ...session,
        knowledge: source.status(),
        model: process.env.ASSISTANT_MODEL || "gpt-5.4-mini",
      });
    }),
  );
  router.post(
    "/transcribe",
    upload.single("audio"),
    withSlot(async (req, res) => {
      if (req.body.consent !== "true")
        return res.status(422).json({ error: "consent_required" });
      if (!req.file) return res.status(400).json({ error: "audio_required" });
      if (!validAudio(req.file))
        return res.status(415).json({ error: "unsupported_audio" });
      const duration = wavDuration(req.file.buffer);
      if (duration === null)
        return res.status(415).json({ error: "audio_needs_conversion" });
      if (duration < 0.5 || duration > 60.1)
        return res.status(422).json({ error: "invalid_audio_duration" });
      const allowance = usage.reserve(
        req.body.sessionToken,
        req.body.consultationToken,
        "transcribe",
      );
      res.locals.allowance = allowance;
      const transcript = String(
        (await transcribe(req.file.buffer, req.file.originalname)) || "",
      ).trim();
      if (
        !transcript ||
        /^\[?(music|silence|blank audio|音乐|静音)\]?$/i.test(transcript)
      )
        return res
          .status(422)
          .json({ error: "speech_not_clear", ...allowance });
      if (transcript.length > 2000)
        return res.status(422).json({ error: "please_shorten", ...allowance });
      res.json({ transcript, ...allowance });
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
    let intake;
    try {
      intake = validateIntake(req.body.intake);
    } catch {
      return res.status(422).json({ error: "invalid_intake" });
    }
    const screened = screen(req.body.message.trim(), intake, req.body.language);
    if (screened?.status === "safety")
      return res.json({
        ...screened,
        mode: "guided",
        knowledge: source.status(),
      });
    const combined = [req.body.message, ...Object.values(intake)].join("\n");
    const separateGoal =
      /放松|放鬆|平静|平靜|relax|calm|sleep routine|睡前习惯|睡前習慣/i.test(
        intake.goal || "",
      );
    if (clinical(combined) && !separateGoal) {
      const medical = await generateRecommendations(combined, {
        language: req.body.language,
        source,
      });
      return res.json(medical);
    }
    if (screened)
      return res.json({
        ...screened,
        mode: "guided",
        knowledge: source.status(),
      });
    let allowance = {};
    const context = Object.entries(intake)
      .map(([key, value]) => key + ": " + value)
      .join("\n");
    // When a physical concern was disclosed, an explicit separate relaxation goal
    // is the only content-selection input. Medical details are not sent to the model.
    const selectionMessage = separateGoal
      ? intake.goal
      : req.body.message.trim() + (context ? "\n" + context : "");
    const result = await recommend(selectionMessage, {
      language: req.body.language,
      preference: req.body.preference || "any",
      source,
      beforeProvider: () => {
        allowance = usage.reserve(
          req.body.sessionToken,
          req.body.consultationToken,
          "recommend",
        );
        res.locals.allowance = allowance;
      },
    });
    res.json(
      req.path === "/"
        ? { reply: result.message, ...result, ...allowance }
        : { ...result, ...allowance },
    );
  });
  router.post("/recommend", recommendation);
  router.post("/", recommendation);
  router.use((err, req, res, next) =>
    res.status(err?.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      error:
        err?.code === "LIMIT_FILE_SIZE" ? "audio_too_large" : "invalid_upload",
    }),
  );
  return router;
}
module.exports = createChatRouter();
module.exports.createChatRouter = createChatRouter;
module.exports.validAudio = validAudio;
