const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function askOpenAI(message) {
  const response = await client.responses.create({
    model: "gpt-5.4-nano",
    input: message,
  });

  return response.output_text;
}

module.exports = {
  askOpenAI,
};