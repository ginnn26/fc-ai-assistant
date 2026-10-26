// Internal evaluation estimates, not invoices or customer-facing balances.
// Standard text rates checked 26 Oct 2026 against official model pages.
const RATES = Object.freeze({ 'gpt-5.4-nano': [0.20, 1.25], 'gpt-5.4-mini': [0.75, 4.50] });
const MYR_PER_USD_WITH_MARGIN = 6 * 1.2;
function estimateTextCost(model, usage) {
  if (!RATES[model] || !Number.isSafeInteger(usage?.input_tokens) || usage.input_tokens < 0 ||
      !Number.isSafeInteger(usage?.output_tokens) || usage.output_tokens < 0) return null;
  const [inputRate, outputRate] = RATES[model];
  // Conservatively price all input at the standard uncached rate. Output usage
  // already includes reasoning: never add reasoning tokens a second time.
  const usd = (usage.input_tokens * inputRate + usage.output_tokens * outputRate) / 1e6;
  return { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens,
    estimatedUsd: usd, estimatedSenWithMargin: usd * MYR_PER_USD_WITH_MARGIN * 100 };
}
module.exports = { RATES, MYR_PER_USD_WITH_MARGIN, estimateTextCost };
