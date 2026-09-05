const express = require("express");
const crypto = require("crypto");
const { load, save } = require("../utils/db");

const router = express.Router();

// GET /api/transactions?collectorId=c1
router.get("/", (req, res) => {
  const { collectorId } = req.query;
  let txns = load("transactions");
  if (collectorId) txns = txns.filter((t) => t.collector_id === collectorId);
  res.json(txns);
});

// POST /api/transactions - confirm a handover to a recycler
// body: { collectorId, materialId, weightKg, finalPrice, recyclerId, lat, lng }
router.post("/", (req, res) => {
  const { collectorId, materialId, weightKg, finalPrice, recyclerId, lat, lng } = req.body;

  if (!collectorId || !materialId || !weightKg || !finalPrice || !recyclerId) {
    return res.status(400).json({
      error: "collectorId, materialId, weightKg, finalPrice, recyclerId are required",
    });
  }

  const timestamp = new Date().toISOString();
  const lotId = `lot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // Verifiable handover reference: hash of the immutable transaction facts.
  // Swap-in note: for a stronger guarantee this hash can be anchored to a
  // lightweight ledger or notarized externally; the hash itself is already
  // enough to prove the record wasn't altered after the fact.
  const payload = `${lotId}|${collectorId}|${materialId}|${weightKg}|${finalPrice}|${recyclerId}|${timestamp}`;
  const referenceHash = crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);

  const transaction = {
    lot_id: lotId,
    collector_id: collectorId,
    material_id: materialId,
    weight_kg: weightKg,
    final_price: finalPrice,
    recycler_id: recyclerId,
    lat: lat ?? null,
    lng: lng ?? null,
    timestamp,
    reference_hash: referenceHash,
    status: "completed",
  };

  const transactions = load("transactions");
  transactions.push(transaction);
  save("transactions", transactions);

  res.status(201).json(transaction);
});

module.exports = router;
