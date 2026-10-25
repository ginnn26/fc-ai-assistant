// Fictional data only. No-spend plan by default. Credentials belong only in the
// environment. simulateResponse is an offline test seam, explicitly labelled.
const fs = require('node:fs');
const path = require('node:path');
const { prepareConversation, answerConversation, MODEL, BASELINE_MODEL, CANDIDATE_MODEL, MAX_INPUT_BYTES, MAX_OUTPUT_TOKENS } = require('../services/care-chat');
const { RATES, MYR_PER_USD_WITH_MARGIN, estimateTextCost } = require('./care-chat-costs.cjs');
const cases = require('./care-chat-cases.json');
const followupCases = require('./care-chat-followup-cases.json');
const MODELS = [BASELINE_MODEL, CANDIDATE_MODEL];
const RESERVE_SEN = 10, INPUT_TOKEN_ENVELOPE = 13000;

async function run({ live = false, output = null, simulateResponse = null, maxPaidCalls = 20, budgetSen = 200, followup = false } = {}) {
  if (!Number.isInteger(maxPaidCalls) || maxPaidCalls < 0 || maxPaidCalls > 20 ||
      !Number.isInteger(budgetSen) || budgetSen < 0 || budgetSen > 200) throw Error('Evaluation limits cannot exceed the approved RM2/20-call envelope.');
  if (live && simulateResponse) throw Error('Simulation cannot be labelled a live evaluation.');
  if (live && !process.env.OPENAI_API_KEY) throw Error('No API credential available; real-model comparison was not run.');
  const client = live ? new (require('openai'))({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 25000 }) : null;
  const execute = simulateResponse || (live ? input => client.responses.create(input) : null);
  let calls = 0, reservedSen = 0, stopPaidCalls = false;
  const rows = [];
  // Interleave models, so a limited/partial run never uses all its calls on one.
  for (const item of (followup ? followupCases : cases)) for (const model of MODELS) {
    const prepared = prepareConversation(item.turns, item.language);
    const row = { id: item.id, model, expectedStatus: item.status, reviewChecklist: item.review,
      realModelCalled: false, providerAttempted: false, humanQualityReview: 'pending', reply: null };
    try {
      const answer = await answerConversation(prepared, { model, ask: async (input, options) => {
        if (!execute) { row.outcome = 'plan-only'; return '[PLAN ONLY]'; }
        const [inputRate, outputRate] = RATES[model];
        const worstSen = (INPUT_TOKEN_ENVELOPE * inputRate + MAX_OUTPUT_TOKENS * outputRate) / 1e6 * MYR_PER_USD_WITH_MARGIN * 100;
        if (Buffer.byteLength(JSON.stringify(input), 'utf8') > MAX_INPUT_BYTES || worstSen > RESERVE_SEN ||
            stopPaidCalls || calls >= maxPaidCalls || reservedSen + RESERVE_SEN > budgetSen) {
          row.outcome = 'not-run-budget'; throw Error('evaluation_not_run');
        }
        calls++; reservedSen += RESERVE_SEN; row.providerAttempted = true; row.realModelCalled = live;
        let response;
        try {
          response = await execute({ model: options.model, input, store: false,
            max_output_tokens: options.maxOutputTokens, reasoning: { effort: 'none' } });
         } catch (error) {
          row.outcome = 'provider-failed';
          const status = Number(error?.status);
          row.failureKind = status === 401 ? 'authentication' : status === 403 ? 'permission' : status === 429 ? 'rate-or-credit-limit' : 'unavailable';
          if ([401,403,429].includes(status)) stopPaidCalls = true;
          throw Error('evaluation_provider_failed');
        }
        row.costEstimate = estimateTextCost(model, response?.usage);
        if (row.costEstimate) {
          row.usage = { inputTokens: row.costEstimate.inputTokens, outputTokens: row.costEstimate.outputTokens };
          if (row.costEstimate.estimatedSenWithMargin > RESERVE_SEN) {
            stopPaidCalls = true; row.reservationOverrun = true;
          }
        }
        if (response?.status !== 'completed') { row.outcome = 'incomplete-response'; throw Error('evaluation_incomplete'); }
        row.outcome = 'response-received'; return response.output_text;
      } });
      row.status = answer.status;
      row.routePassed = answer.status === item.status;
      if (row.outcome !== 'plan-only') row.reply = answer.reply;
      if (!row.outcome) row.outcome = 'rules-only';
    } catch {
      row.routePassed = false;
      if (!row.outcome || row.outcome === 'response-received') row.outcome = 'invalid-response';
      // No raw provider errors/credentials or placeholder replies presented as AI.
    }
    rows.push(row);
  }
  const costs = MODELS.map(model => {
    const attempted = rows.filter(row => row.model === model && row.providerAttempted);
    const known = attempted.filter(row => row.costEstimate);
    return { model, attempted: attempted.length, responsesReceived: attempted.filter(row => row.reply !== null).length,
      usageKnown: known.length, costUnknownAttempts: attempted.length - known.length,
      estimatedUsdForKnownUsage: known.reduce((sum,row) => sum + row.costEstimate.estimatedUsd,0),
      estimatedSenWithMarginForKnownUsage: known.reduce((sum,row) => sum + row.costEstimate.estimatedSenWithMargin,0) };
  });
  const result = { mode: live ? 'real-model-comparison' : simulateResponse ? 'simulated-provider-no-real-calls' : 'plan-only-no-model-calls',
    suite: followup ? 'followup-short-and-long' : 'initial-comparison',
    callsAttempted: calls, reservedSen, budgetSen, realModelQualityVerified: false,
    costAssumptions: { rates: RATES, myrPerUsdWithMargin: MYR_PER_USD_WITH_MARGIN,
      cachedInputDiscountApplied: false, invoiceVerified: false,
      source: 'https://developers.openai.com/api/docs/pricing' }, costs,
    note: 'Human review is required. Usage estimates are not invoices. Unknown-cost attempts must not be treated as free. No final customer quota is established.', rows };
  if (output) fs.writeFileSync(path.resolve(output), JSON.stringify(result,null,2));
  return result;
}
if (require.main === module) {
  const args = process.argv.slice(2), outputAt = args.indexOf('--output');
  run({ live: args.includes('--run'), followup: args.includes('--follow-up'),
    ...(args.includes('--follow-up') ? {maxPaidCalls:10,budgetSen:100} : {}),
    output: outputAt >= 0 ? args[outputAt+1] : null })
    .then(result => console.log(JSON.stringify({mode:result.mode,cases:result.rows.length,callsAttempted:result.callsAttempted,reservedSen:result.reservedSen,realModelQualityVerified:false})))
    .catch(error => { console.error(error.message); process.exitCode=1; });
}
module.exports = { run };
