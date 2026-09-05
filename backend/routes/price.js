const express = require("express");
const { load } = require("../utils/db");

const router = express.Router();

// GET /api/price?material=pcb&location=Mayapuri
router.get("/", (req, res) => {
  const { material, location } = req.query;
  let prices = load("prices");

  if (material) prices = prices.filter((p) => p.material_id === material);

  let usedFallback = false;
  if (location) {
    const inZone = prices.filter((p) => p.location === location);
    if (inZone.length > 0) {
      prices = inZone;
    } else {
      // No price history recorded for this zone yet (e.g. a collector's
      // GPS resolved to Wazirpur/Naraina, which aren't seeded with price
      // rows in this dev dataset) — better to show the nearest available
      // market rate than to show nothing at all.
      usedFallback = true;
    }
  }

  prices = prices.sort((a, b) => (a.date > b.date ? 1 : -1));

  const latest = prices[prices.length - 1] || null;
  const trend = prices.map((p) => ({ date: p.date, sell_price_per_kg: p.sell_price_per_kg }));

  res.json({ latest, trend, usedFallback });
});

module.exports = router;
