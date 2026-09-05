const express = require("express");
const Material = require("../models/Material");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const materials =
      await Material.find({
        active: true,
      })
        .sort({
          category: 1,
          label_en: 1,
        })
        .lean();

    const response =
      materials.map((material) => ({
        id: material.code,
        code: material.code,
        label_en: material.label_en,
        label_hi: material.label_hi,
        label_mr: material.label_mr,
        category: material.category,
        subCategory:
          material.subCategory,
        hazardous:
          material.hazardous,
        safety_note_en:
          material.safety_note_en,
        safety_note_hi:
          material.safety_note_hi,
        safety_note_mr:
          material.safety_note_mr,
      }));

    res.json(response);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Unable to load materials",
    });
  }
});

module.exports = router;
