const express = require("express");
const multer = require("multer");

const router = express.Router();

const { askOpenAI, transcribeAudio } = require("../services/openai");

const { generateRecommendations } = require("../services/recommendation");

// Temporary audio upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});


// =========================
// Text Chat
// =========================

router.post("/", async (req, res) => {

  try {

    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const reply = await askOpenAI(message);

    res.json({
      reply: reply
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to get AI response"
    });

  }

});


// =========================
// Audio Transcription
// =========================

router.post("/transcribe", upload.single("audio"), async (req, res) => {

  try {

    if (!req.file) {

      return res.status(400).json({
        error: "Audio file is required"
      });

    }

    console.log("Received audio:");
    console.log("Size:", req.file.size);
    console.log("Type:", req.file.mimetype);

    const transcript = await transcribeAudio(
        req.file.buffer,
        req.file.originalname || "recording.webm"
    );

    res.json({
      transcript: transcript
    });

  } catch (error) {

    console.error("Transcription error:", error);

    res.status(500).json({
      error: "Failed to transcribe audio"
    });

  }

});

router.post("/recommend", async (req, res) => {
  try {
    const message = typeof req.body?.message === "string"
      ? req.body.message.trim()
      : "";

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: "Message must be 2000 characters or fewer"
      });
    }

    const result = await generateRecommendations(message);

    res.json(result);

  } catch (error) {
    console.error("Recommendation error:", error);

    res.status(500).json({
      error: "Failed to generate recommendations"
    });
  }
});


module.exports = router;
