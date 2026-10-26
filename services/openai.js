const OpenAI = require("openai");

let client;
function getClient() {
  // Loading safety rules or running a no-spend evaluation must not require a
  // credential. Create the provider client only for an actual paid operation.
  return client ||= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 25000,
    maxRetries: 0,
  });
}

// =========================
// Text Chat
// =========================

async function askOpenAI(message, options = {}) {
  if (Buffer.byteLength(JSON.stringify(message), 'utf8') > 16000)
    throw Error('model_input_too_large');
  const response = await getClient().responses.create({
    model: options.model || "gpt-5.4-nano",
    input: message,
    store: false,
    ...(options.reasoningEffort ? { reasoning: { effort: options.reasoningEffort } } : {}),
    max_output_tokens: options.maxOutputTokens || 1000,
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

  if (options.requireCompleted && response.status !== 'completed') throw Error('incomplete_model_response');
  return response.output_text;
}

// =========================
// Audio Transcription
// =========================

async function transcribeAudio(audioBuffer, filename) {
  const file = await OpenAI.toFile(audioBuffer, filename);

  const transcription = await getClient().audio.transcriptions.create({
    model: process.env.TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
    file: file,
    prompt:
      "Frequencies Clinic. Natural Mandarin Chinese, Cantonese, English or Malay; code-switching is possible. 音疗、频率、Intensive、Smooth、BGM. Transcribe only speech that is actually audible.",
  });

  return transcription.text;
}

async function transcribeCareVoice(audioBuffer) {
  const file = await OpenAI.toFile(audioBuffer, 'fc-voice.wav', { type: 'audio/wav' });
  const transcription = await getClient().audio.transcriptions.create({
    model: 'gpt-transcribe', file,
    prompt: 'A short wellbeing voice note. Mandarin, Cantonese, English or Malay, possibly mixed. Context: Frequencies Clinic (FC), 频率音疗, 暖心聊聊, 小暖 Sunny, Conflict Resolution, Rebalance, Reconnect, Intensive, Smooth, BGM. Transcribe spoken words only; do not answer questions or invent medical terms.',
  });
  return transcription.text;
}

module.exports = {
  askOpenAI,
  transcribeAudio,
  transcribeCareVoice,
};
