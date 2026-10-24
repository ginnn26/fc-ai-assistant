const express = require("express");
const multer = require("multer");
const { transcribeAudio } = require("../services/openai");
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
  recommend = generateRecommendations,
  maxRequests = 60,
  now = Date.now,
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
    if (
      ![self, "https://frequencies-clinic.learnworlds.com"].includes(
        req.headers.origin,
      )
    )
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
  router.post(
    "/transcribe",
    upload.single("audio"),
    withSlot(async (req, res) => {
      if (req.body.consent !== "true")
        return res.status(422).json({ error: "consent_required" });
      if (!req.file) return res.status(400).json({ error: "audio_required" });
      if (!validAudio(req.file))
        return res.status(415).json({ error: "unsupported_audio" });
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
    const result = await recommend(req.body.message.trim(), {
      language: req.body.language,
      preference: req.body.preference || "any",
    });
    res.json(req.path === "/" ? { reply: result.message, ...result } : result);
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
