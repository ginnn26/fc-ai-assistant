require("dotenv").config();

const express = require("express");
const cors = require("cors");

const chatRoute = require("./routes/chat");

const app = express();

// Keep assessment headers/body limits separate from the existing voice/chat flow.
app.use("/assessment", require("./routes/assessment").createAssessmentRouter());

app.use(cors());
app.use(express.json({ limit: "12kb" }));
app.use((req, res, next) => {
  // A cross-origin iframe must also delegate this feature with allow="microphone".
  res.setHeader("Permissions-Policy", "microphone=(self)");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self' https://frequencies-clinic.learnworlds.com");
  next();
});
app.get(['/', '/index.html'], (req, res, next) => {
  if (process.env.FC_CARE_CHAT_UNIFIED_ENABLED !== 'true') return next();
  res.redirect(302, '/care-chat.html' + (req.query.lang === 'en' ? '?lang=en' : ''));
});
app.use(express.static(require("node:path").join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "FC AI Wellness Support",
  });
});

app.get("/", (req, res) => {
  res.json({
    status: "FC AI Assistant backend is running",
  });
});

app.use("/chat", chatRoute);

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  if (error?.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ error: "Audio file must be 20 MB or smaller" });
  }

  // Never log health text, audio payloads or provider error objects.
  if (error?.type === "entity.too.large")
    return res.status(413).json({ error: "request_too_large" });
  return res.status(500).json({ error: "Unexpected server error" });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, process.env.HOST || "0.0.0.0", () => {
    console.log(`FC AI Assistant running on port ${PORT}`);
  });
}

module.exports = app;
