const { load } = require("./db");

/**
 * checkPriceAnomaly
 * Flags a quoted price as abnormal if it deviates from the historical mean
 * for that material by more than `threshold` standard deviations.
 * Deliberately a simple, explainable statistical check (not a black-box
 * model) so a hackathon panel can be walked through exactly why a
 * transaction was flagged — defensible in Q&A, which matters more than
 * sophistication for this kind of trust-sensitive feature.
 */
function checkPriceAnomaly({ materialId, quotedPrice, threshold = 1.5 }) {
  const prices = load("prices").filter((p) => p.material_id === materialId);
  if (prices.length < 2) {
    return { isAnomaly: false, reason: "insufficient-history" };
  }

  const values = prices.map((p) => p.sell_price_per_kg);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance) || 1;

  const zScore = (quotedPrice - mean) / stdDev;
  const isAnomaly = Math.abs(zScore) > threshold;

  return {
    isAnomaly,
    zScore: Math.round(zScore * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    direction: zScore < 0 ? "below_market" : "above_market",
  };
}

module.exports = { checkPriceAnomaly };
