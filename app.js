require("dotenv").config();

const express = require("express");
const cors = require("cors");

const chatRoute = require("./routes/chat");

const app = express();

// Keep assessment headers/body limits separate from the existing voice/chat flow.
app.use("/assessment", require("./routes/assessment").createAssessmentRouter());

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  // A cross-origin iframe must also delegate this feature with allow="microphone".
  res.setHeader("Permissions-Policy", "microphone=(self)");
  next();
});
app.use(express.static("public"));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "FC AI Wellness Support"
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
    return res.status(413).json({ error: "Audio file must be 20 MB or smaller" });
  }

  console.error("Unhandled request error:", error);
  return res.status(500).json({ error: "Unexpected server error" });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, process.env.HOST || "0.0.0.0", () => {
    console.log(`FC AI Assistant running on port ${PORT}`);
  });
}

module.exports = app;
