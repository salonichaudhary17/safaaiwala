const express = require("express");
const { answerQuery } = require("../utils/ragAssistant");

const router = express.Router();

// POST /api/assistant  body: { text, lang, location }
router.post("/", (req, res) => {
  const { text, lang = "en", location = "Mayapuri" } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  const result = answerQuery({ text, lang, location });
  res.json(result);
});

module.exports = router;
