const express = require("express");
const crypto = require("crypto");

const Transaction = require("../models/Transaction");
const Lot = require("../models/Lot");

const router = express.Router();

function createReferenceHash(data) {
  return crypto
    .createHash("sha256")
    .update(
      [
        data.transactionId,
        data.lotId,
        data.collectorId,
        data.materialCode,
        data.weightKg,
        data.finalPriceINR,
        data.recyclerId,
      ].join("|")
    )
    .digest("hex");
}

function validateTransactionBody(body) {
  const required = [
    "clientTransactionId",
    "lotId",
    "collectorId",
    "materialCode",
    "weightKg",
    "quotedPriceINR",
    "finalPriceINR",
    "recyclerId",
  ];

  return required.filter(
    (field) =>
      body[field] === undefined ||
      body[field] === null ||
      body[field] === ""
  );
}

router.get("/", async (req, res) => {
  try {
    const query = {};

    if (req.query.collectorId) {
      query.collectorId =
        req.query.collectorId;
    }

    const transactions =
      await Transaction.find(query)
        .sort({ createdAt: -1 })
        .limit(200)
        .populate("recyclerId", "name")
        .lean();

    res.json(transactions);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Unable to fetch transactions",
    });
  }
});

router.post("/", async (req, res) => {
  return createTransaction(req, res, "ONLINE");
});

router.post("/sync", async (req, res) => {
  return createTransaction(req, res, "OFFLINE");
});

async function createTransaction(
  req,
  res,
  syncSource
) {
  try {
    const missing =
      validateTransactionBody(req.body);

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing fields: ${missing.join(
          ", "
        )}`,
      });
    }

    const {
      clientTransactionId,
      lotId,
      collectorId,
      materialCode,
      weightKg,
      quotedPriceINR,
      finalPriceINR,
      recyclerId,
      paymentType,
      collectionLat,
      collectionLng,
      handoverLat,
      handoverLng,
    } = req.body;

    const numericWeight =
      Number(weightKg);

    const quoted =
      Number(quotedPriceINR);

    const finalPrice =
      Number(finalPriceINR);

    if (
      !Number.isFinite(numericWeight) ||
      numericWeight <= 0
    ) {
      return res.status(400).json({
        error: "Invalid weightKg",
      });
    }

    if (
      !Number.isFinite(quoted) ||
      quoted < 0
    ) {
      return res.status(400).json({
        error: "Invalid quotedPriceINR",
      });
    }

    if (
      !Number.isFinite(finalPrice) ||
      finalPrice < 0
    ) {
      return res.status(400).json({
        error: "Invalid finalPriceINR",
      });
    }

    const existing =
      await Transaction.findOne({
        clientTransactionId,
      });

    if (existing) {
      return res.status(200).json({
        duplicate: true,
        queued: false,
        transaction: existing,
      });
    }

    const transactionId =
      `TX-${Date.now()}-${crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase()}`;

    const referenceHash =
      createReferenceHash({
        transactionId,
        lotId,
        collectorId,
        materialCode,
        weightKg: numericWeight,
        finalPriceINR: finalPrice,
        recyclerId,
      });

    const transaction =
      await Transaction.create({
        transactionId,
        clientTransactionId,
        lotId,
        collectorId,
        recyclerId,
        materialCode,
        weightKg: numericWeight,
        quotedPriceINR: quoted,
        finalPriceINR: finalPrice,
        paymentType:
          paymentType === "DIGITAL"
            ? "DIGITAL"
            : "CASH",
        paymentStatus: "PAID",
        transactionStatus: "COMPLETED",
        referenceHash,
        syncSource,
        collectionLocation:
          Number.isFinite(
            Number(collectionLat)
          ) &&
          Number.isFinite(
            Number(collectionLng)
          )
            ? {
                type: "Point",
                coordinates: [
                  Number(collectionLng),
                  Number(collectionLat),
                ],
              }
            : undefined,
        handoverLocation:
          Number.isFinite(
            Number(handoverLat)
          ) &&
          Number.isFinite(
            Number(handoverLng)
          )
            ? {
                type: "Point",
                coordinates: [
                  Number(handoverLng),
                  Number(handoverLat),
                ],
              }
            : undefined,
        verificationTimestamp:
          new Date(),
        completedAt:
          new Date(),
      });

    await Lot.updateOne(
      { lotId },
      {
        $set: {
          status: "COMPLETED",
          selectedRecyclerId: recyclerId,
        },
      }
    );

    return res.status(201).json({
      ...transaction.toObject(),
      queued: false,
    });
  } catch (error) {
    console.error(
      "Transaction creation error:",
      error
    );

    if (error.code === 11000) {
      const existing =
        await Transaction.findOne({
          clientTransactionId:
            req.body.clientTransactionId,
        });

      return res.status(200).json({
        duplicate: true,
        queued: false,
        transaction: existing,
      });
    }

    return res.status(500).json({
      error: "Unable to create transaction",
    });
  }
}

module.exports = router;
