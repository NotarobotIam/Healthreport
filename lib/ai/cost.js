// Rough per-request cost, from the model's list prices in US dollars per million tokens. Used only to show the
// operator what the AI features are costing; if a model isn't listed the cost is left unknown rather than guessed.
const PRICES = {
  'claude-haiku-4-5': { input: 1, output: 5 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-opus-5': { input: 5, output: 25 },
};

function estimateCostUsd(model, usage) {
  const key = Object.keys(PRICES).find((k) => String(model || '').startsWith(k));
  if (!key || !usage) return null;
  const { input, output } = PRICES[key];
  return ((usage.inputTokens || 0) * input + (usage.outputTokens || 0) * output) / 1e6;
}

module.exports = { estimateCostUsd, PRICES };
