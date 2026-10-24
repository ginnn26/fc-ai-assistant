const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 25000,
  maxRetries: 0,
});

// =========================
// Text Chat
// =========================

async function askOpenAI(message, options = {}) {
  const response = await client.responses.create({
    model: options.model || "gpt-5.4-nano",
    input: message,
    store: false,
    max_output_tokens: options.model === "gpt-5.4-mini" ? 1800 : 1000,
    ...(options.schema
      ? {
          text: {
            format: {
              type: "json_schema",
              name: "fc_audio_selection",
              strict: true,
              schema: options.schema,
            },
          },
        }
      : {}),
  });

  return response.output_text;
}

// =========================
// Audio Transcription
// =========================

async function transcribeAudio(audioBuffer, filename) {
  const file = await OpenAI.toFile(audioBuffer, filename);

  const transcription = await client.audio.transcriptions.create({
    model: process.env.TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
    file: file,
    prompt:
      "Frequencies Clinic. Natural Mandarin Chinese, Cantonese, English or Malay; code-switching is possible. 音疗、频率、Intensive、Smooth、BGM. Transcribe only speech that is actually audible.",
  });

  return transcription.text;
}

module.exports = {
  askOpenAI,
  transcribeAudio,
};
