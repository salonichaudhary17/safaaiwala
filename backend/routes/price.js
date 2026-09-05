const express = require("express");
const Price = require("../models/Price");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const {
      material,
      location,
    } = req.query;

    if (!material) {
      return res.status(400).json({
        error: "material is required",
      });
    }

    const query = {
      materialCode:
        String(material).toLowerCase(),
      active: true,
      effectiveFrom: {
        $lte: new Date(),
      },
    };

    if (location) {
      query.locationName =
        String(location);
    }

    let price =
      await Price.findOne(query)
        .sort({
          effectiveFrom: -1,
        })
        .lean();

    if (!price && location) {
      delete query.locationName;

      price =
        await Price.findOne(query)
          .sort({
            effectiveFrom: -1,
          })
          .lean();
    }

    if (!price) {
      return res.status(404).json({
        error: "Price unavailable",
      });
    }

    res.json({
      material: price.materialCode,
      location: price.locationName,
      latest: price.buyingPricePerKg,
      buyingPricePerKg:
        price.buyingPricePerKg,
      marketRangeMin:
        price.marketRangeMin,
      marketRangeMax:
        price.marketRangeMax,
      effectiveFrom:
        price.effectiveFrom,
      source: price.source,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Unable to load price",
    });
  }
});

module.exports = router;
