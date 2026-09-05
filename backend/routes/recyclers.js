const express = require("express");
const { load } = require("../utils/db");
const { matchRecyclers } = require("../utils/match");

const router = express.Router();

// GET /api/recyclers - full list
router.get("/", (req, res) => {
  res.json(load("recyclers"));
});

// GET /api/recyclers/match?material=pcb&lat=28.63&lng=77.12
router.get("/match", (req, res) => {
  const { material, lat, lng } = req.query;
  if (!material || !lat || !lng) {
    return res.status(400).json({ error: "material, lat, lng are required" });
  }
  const ranked = matchRecyclers({
    materialId: material,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
  });
  res.json(ranked);
});

module.exports = router;
