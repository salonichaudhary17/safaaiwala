const express = require("express");
const { load } = require("../utils/db");

const router = express.Router();

// Informal-market baseline: what a street kabadiwala typically pays,
// expressed as a fraction of the formal recycler's price. This single
// national average is a simplification — real informal rates vary by city
// and material. Replace with real numbers from field interviews with
// collectors in each launch city as required by the PS.
const INFORMAL_RATE_FRACTION = 0.72;

// GET /api/ledger/:collectorId
router.get("/:collectorId", (req, res) => {
  const { collectorId } = req.params;
  const transactions = load("transactions").filter(
    (t) => t.collector_id === collectorId
  );

  const totalEarned = transactions.reduce((sum, t) => sum + t.final_price, 0);
  const totalWeight = transactions.reduce((sum, t) => sum + t.weight_kg, 0);
  const informalEquivalent = Math.round(totalEarned * INFORMAL_RATE_FRACTION);
  const upliftAmount = totalEarned - informalEquivalent;
  const upliftPercent = informalEquivalent
    ? Math.round((upliftAmount / informalEquivalent) * 100)
    : 0;

  res.json({
    collectorId,
    transactionCount: transactions.length,
    totalWeightKg: Math.round(totalWeight * 10) / 10,
    totalEarned,
    informalEquivalent,
    upliftAmount,
    upliftPercent,
    transactions,
  });
});

module.exports = router;
