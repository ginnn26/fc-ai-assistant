const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


// =========================
// Text Chat
// =========================

async function askOpenAI(message) {

  const response = await client.responses.create({
    model: "gpt-5.4-nano",
    input: message,
  });

  return response.output_text;
}


// =========================
// Audio Transcription
// =========================

async function transcribeAudio(audioBuffer, filename) {

  const file = await OpenAI.toFile(
      audioBuffer,
      filename
  );

  const transcription =
      await client.audio.transcriptions.create({
        model: "gpt-4o-mini-transcribe",
        file: file
      });

  return transcription.text;
}


module.exports = {
  askOpenAI,
  transcribeAudio
};