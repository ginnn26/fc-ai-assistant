const express = require("express");
const router = express.Router();

const { askOpenAI } = require("../services/openai");

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const reply = await askOpenAI(message);

    res.json({
      reply: reply,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to get AI response",
    });
  }
});

module.exports = router;