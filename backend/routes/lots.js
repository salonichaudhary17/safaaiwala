const express = require("express");
const crypto = require("crypto");

const Material = require("../models/Material");
const Price = require("../models/Price");
const Recycler = require("../models/Recycler");
const Lot = require("../models/Lot");

const router = express.Router();

function isValidCoordinates(lat, lng) {
  return (
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    Number(lng) >= -180 &&
    Number(lng) <= 180
  );
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const radius = 6371;

  const dLat =
    ((Number(lat2) - Number(lat1)) * Math.PI) / 180;

  const dLng =
    ((Number(lng2) - Number(lng1)) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return (
    radius *
    2 *
    Math.asin(Math.sqrt(a))
  );
}

function makeLotId() {
  return `LOT-${Date.now()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;
}

function calculateRecyclerRate(recycler, materialCode) {
  const acceptedRate = recycler.offeredRates.find(
    (rate) =>
      rate.materialCode.toLowerCase() ===
      materialCode.toLowerCase()
  );

  return acceptedRate
    ? Number(acceptedRate.pricePerKg)
    : null;
}

router.post("/", async (req, res) => {
  try {
    const {
      clientLotId,
      collectorId,
      materialHint,
      weightKg,
      location,
      lat,
      lng,
      address,
      hasPhoto,
      imageDataUrl,
      description,
      offlineCreated,
    } = req.body;

    if (!clientLotId) {
      return res.status(400).json({
        error: "clientLotId is required",
      });
    }

    if (!collectorId) {
      return res.status(400).json({
        error: "collectorId is required",
      });
    }

    if (!materialHint) {
      return res.status(400).json({
        error: "materialHint is required",
      });
    }

    const numericWeight = Number(weightKg);

    if (
      !Number.isFinite(numericWeight) ||
      numericWeight <= 0
    ) {
      return res.status(400).json({
        error: "weightKg must be greater than zero",
      });
    }

    if (!isValidCoordinates(lat, lng)) {
      return res.status(400).json({
        error: "valid lat and lng are required",
      });
    }

    const existingLot = await Lot.findOne({
      clientLotId,
    });

    if (existingLot) {
      return res.status(200).json({
        duplicate: true,
        lot: existingLot,
        recommendedRecyclers: [],
      });
    }

    const material = await Material.findOne({
      $or: [
        { code: String(materialHint).toLowerCase() },
        {
          category: {
            $regex: `^${String(materialHint).replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            )}$`,
            $options: "i",
          },
        },
      ],
      active: true,
    });

    if (!material) {
      return res.status(400).json({
        error: "unknown material",
      });
    }

    const latestPrice = await Price.findOne({
      materialCode: material.code,
      locationName: location || "Delhi",
      active: true,
      effectiveFrom: {
        $lte: new Date(),
      },
    }).sort({
      effectiveFrom: -1,
    });

    const fallbackPrice = await Price.findOne({
      materialCode: material.code,
      active: true,
      effectiveFrom: {
        $lte: new Date(),
      },
    }).sort({
      effectiveFrom: -1,
    });

    const price = latestPrice || fallbackPrice;

    const pricePerKg = price
      ? Number(price.buyingPricePerKg)
      : null;

    const estimatedValue =
      pricePerKg !== null
        ? Math.round(pricePerKg * numericWeight)
        : null;

    const recyclers = await Recycler.find({
      authorizationStatus: "AUTHORIZED",
      active: true,
      materialsAccepted: material.code,
    }).lean();

    const rankedRecyclers = recyclers
      .map((recycler) => {
        const [
          recyclerLng,
          recyclerLat,
        ] = recycler.facilityLocation.coordinates;

        const distanceKm = haversineKm(
          lat,
          lng,
          recyclerLat,
          recyclerLng
        );

        const inServiceArea =
          distanceKm <=
          Number(recycler.serviceAreaRadiusKm || 25);

        const recyclerRate =
          calculateRecyclerRate(
            recycler,
            material.code
          );

        const rateScore =
          recyclerRate !== null
            ? recyclerRate
            : pricePerKg || 0;

        const pickupScore =
          recycler.pickupAvailable ? 1.15 : 1;

        const distanceScore = Math.max(
          0,
          1 - distanceKm / 100
        );

        const score =
          distanceScore *
          pickupScore *
          (inServiceArea ? 1 : 0.4) *
          (1 + rateScore / 1000);

        return {
          ...recycler,
          distanceKm:
            Math.round(distanceKm * 10) / 10,
          inServiceArea,
          offeredPricePerKg: recyclerRate,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const lotId = makeLotId();

    const lot = await Lot.create({
      lotId,
      clientLotId,
      collectorId,
      materialCode: material.code,
      materialName: material.label_en,
      category: material.category,
      subCategory: material.subCategory,
      description: description || "",
      imageDataUrl:
        hasPhoto && imageDataUrl
          ? imageDataUrl
          : null,
      weightKg: numericWeight,
      quotedPricePerKg: pricePerKg,
      estimatedValueINR: estimatedValue,
      collectionLocation: {
        type: "Point",
        coordinates: [
          Number(lng),
          Number(lat),
        ],
        address: address || "",
        locationName: location || "Delhi",
      },
      status:
        rankedRecyclers.length > 0
          ? "MATCHED"
          : "QUOTED",
      recommendedRecyclerIds:
        rankedRecyclers.map(
          (item) => item._id
        ),
      offlineCreated: Boolean(offlineCreated),
      syncedAt: new Date(),
    });

    return res.status(201).json({
      lot: {
        id: lot._id,
        lotId: lot.lotId,
        clientLotId: lot.clientLotId,
        material_id: material.code,
        material_label_en: material.label_en,
        material_label_hi: material.label_hi,
        material_label_mr: material.label_mr,
        category: material.category,
        hazardous: material.hazardous,
        safety_note_en: material.safety_note_en,
        safety_note_hi: material.safety_note_hi,
        safety_note_mr: material.safety_note_mr,
        weightKg: lot.weightKg,
        pricePerKg: lot.quotedPricePerKg,
        estimatedValue: lot.estimatedValueINR,
        status: lot.status,
        createdAt: lot.createdAt,
      },

      recommendedRecyclers:
        rankedRecyclers,
    });
  } catch (error) {
    console.error("Create lot error:", error);

    if (error.code === 11000) {
      const existing = await Lot.findOne({
        clientLotId: req.body.clientLotId,
      });

      return res.status(200).json({
        duplicate: true,
        lot: existing,
        recommendedRecyclers: [],
      });
    }

    return res.status(500).json({
      error: "Unable to create lot",
    });
  }
});

router.get(
  "/collector/:collectorId",
  async (req, res) => {
    try {
      const lots = await Lot.find({
        collectorId: req.params.collectorId,
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .select("-imageDataUrl")
        .lean();

      res.json(lots);
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Unable to fetch lots",
      });
    }
  }
);

router.get(
  "/:lotId/matches",
  async (req, res) => {
    try {
      const lot = await Lot.findOne({
        lotId: req.params.lotId,
      });

      if (!lot) {
        return res.status(404).json({
          error: "Lot not found",
        });
      }

      const [
        lng,
        lat,
      ] = lot.collectionLocation.coordinates;

      const recyclers = await Recycler.find({
        _id: {
          $in: lot.recommendedRecyclerIds,
        },
        authorizationStatus: "AUTHORIZED",
        active: true,
      }).lean();

      const ranked = recyclers
        .map((recycler) => {
          const [
            recyclerLng,
            recyclerLat,
          ] =
            recycler.facilityLocation.coordinates;

          const distanceKm =
            haversineKm(
              lat,
              lng,
              recyclerLat,
              recyclerLng
            );

          return {
            ...recycler,
            distanceKm:
              Math.round(
                distanceKm * 10
              ) / 10,
          };
        })
        .sort(
          (a, b) =>
            a.distanceKm - b.distanceKm
        );

      return res.json(ranked);
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: "Unable to find recyclers",
      });
    }
  }
);

module.exports = router;
