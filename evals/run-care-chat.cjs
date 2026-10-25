// Fictional data only. Default is a no-spend plan. --run requires a server-side
// OPENAI_API_KEY; never pass the key as a command argument or save it in results.
const fs = require('node:fs');
const path = require('node:path');
const { prepareConversation, answerConversation, MODEL, CANDIDATE_MODEL, MAX_INPUT_BYTES, MAX_OUTPUT_TOKENS } = require('../services/care-chat');
const cases = require('./care-chat-cases.json');
const MODELS = [MODEL, CANDIDATE_MODEL];
const MAX_PAID_CALLS = 20;
const RESERVE_SEN = 10;
const BUDGET_SEN = 200;
const INPUT_TOKEN_ENVELOPE = 13000;
const RATES = { 'gpt-5.4-nano': [0.20, 1.25], 'gpt-5.4-mini': [0.75, 4.50] };
// RM6/USD with 20% fee/tax headroom is an explicit test-budget assumption,
// not a current exchange quote or a guarantee about billing conversion.
const MYR_PER_USD_WITH_MARGIN = 6 * 1.2;

async function run({ live = false, output = null } = {}) {
  if (live && !process.env.OPENAI_API_KEY) throw Error('No API credential available; real-model comparison was not run.');
  const client = live ? new (require('openai'))({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 25000 }) : null;
  let calls = 0, reservedSen = 0;
  const rows = [];
  for (const model of MODELS) for (const item of cases) {
    const prepared = prepareConversation(item.turns, item.language);
    const row = { id: item.id, model, expectedStatus: item.status, reviewChecklist: item.review,
      realModelCalled: false, humanQualityReview: 'pending' };
    const answer = await answerConversation(prepared, { model, ask: async (input, options) => {
      if (!live) return '[PLAN ONLY — no model response generated]';
      const [inputRate, outputRate] = RATES[model];
      const worstSen = (INPUT_TOKEN_ENVELOPE * inputRate + MAX_OUTPUT_TOKENS * outputRate) / 1e6 * MYR_PER_USD_WITH_MARGIN * 100;
      if (Buffer.byteLength(JSON.stringify(input), 'utf8') > MAX_INPUT_BYTES ||
          worstSen > RESERVE_SEN || calls >= MAX_PAID_CALLS || reservedSen + RESERVE_SEN > BUDGET_SEN)
        throw Error('Comparison budget or input bound reached; no call made.');
      // Reserve before attempting. A timeout/failure consumes the reservation.
      calls++; reservedSen += RESERVE_SEN; row.realModelCalled = true;
      try {
        const response = await client.responses.create({ model: options.model, input,
          store: false, max_output_tokens: options.maxOutputTokens, reasoning: { effort: 'none' } });
        const usage = response.usage;
        if (usage) row.usage = { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens };
        return response.output_text;
      } catch { row.providerError = 'provider_call_failed'; return '[PROVIDER FAILED — no reply to review]'; }
    } });
    row.status = answer.status; row.reply = answer.reply;
    row.routePassed = answer.status === item.status;
    rows.push(row);
  }
  const result = { mode: live ? 'real-model-comparison' : 'plan-only-no-model-calls',
    callsAttempted: calls, reservedSen, budgetSen: BUDGET_SEN,
    realModelQualityVerified: false, note: 'Human review of each response is required. Program checks do not establish empathy or factual accuracy.', rows };
  if (output) fs.writeFileSync(path.resolve(output), JSON.stringify(result, null, 2));
  return result;
}
if (require.main === module) {
  const args = process.argv.slice(2), outputAt = args.indexOf('--output');
  run({ live: args.includes('--run'), output: outputAt >= 0 ? args[outputAt + 1] : null })
    .then(result => console.log(JSON.stringify({ mode: result.mode, cases: result.rows.length,
      callsAttempted: result.callsAttempted, reservedSen: result.reservedSen, realModelQualityVerified: false })))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { run };
