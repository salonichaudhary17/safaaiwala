const express = require("express");
const { load } = require("../utils/db");
const { classifyMaterial } = require("../utils/classify");
const { matchRecyclers } = require("../utils/match");
const { checkPriceAnomaly } = require("../utils/anomaly");

const router = express.Router();

// POST /api/lots
// body: { materialHint, hasPhoto, weightKg, location, lat, lng }
router.get("/", (req, res) => res.status(405).json({ error: "use POST" }));

router.post("/", (req, res) => {
  const { materialHint, hasPhoto, weightKg, location, lat, lng } = req.body;

  if (!materialHint || !weightKg || lat == null || lng == null) {
    return res
      .status(400)
      .json({ error: "materialHint, weightKg, lat, lng are required" });
  }

  const classification = classifyMaterial({ materialHint, hasPhoto });
  if (!classification.category_id) {
    return res.status(400).json({ error: "unknown material" });
  }

  const materials = load("materials");
  const material = materials.find((m) => m.id === classification.category_id);

  const byMaterial = load("prices").filter((p) => p.material_id === material.id);
  const inZone = location ? byMaterial.filter((p) => p.location === location) : byMaterial;
  // Fall back to any-location pricing if this zone has no seeded rows yet —
  // matches the same fallback used in GET /api/price.
  const priceCandidates = inZone.length > 0 ? inZone : byMaterial;
  const priceRow = priceCandidates.sort((a, b) => (a.date > b.date ? 1 : -1)).pop();
  const pricePerKg = priceRow ? priceRow.sell_price_per_kg : null;
  const estimatedValue = pricePerKg ? Math.round(pricePerKg * weightKg) : null;

  const anomaly = pricePerKg
    ? checkPriceAnomaly({ materialId: material.id, quotedPrice: pricePerKg })
    : { isAnomaly: false };

  const recyclerMatches = matchRecyclers({ materialId: material.id, lat, lng }).slice(0, 3);

  res.json({
    lot: {
      material_id: material.id,
      material_label_en: material.label_en,
      hazardous: material.hazardous,
      safety_note_en: material.safety_note_en,
      weightKg,
      pricePerKg,
      estimatedValue,
      classification,
      anomaly,
    },
    recommendedRecyclers: recyclerMatches,
  });
});

module.exports = router;
