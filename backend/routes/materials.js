const express = require("express");
const { load } = require("../utils/db");

const router = express.Router();

// GET /api/materials - list all material categories (for the tap-to-select UI)
router.get("/", (req, res) => {
  res.json(load("materials"));
});

module.exports = router;
