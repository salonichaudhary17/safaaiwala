const crypto = require("crypto");
const mongoose = require("mongoose");
const Lot = require("../models/Lot");
const {
  Transaction,
  Traceability,
  Collector,
  hashPayload,
} = require("../models/Schemas");
const { emitTransaction } = require("../utils/realtime");

function validateLegacyBody(body) {
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
    (field) => body[field] === undefined || body[field] === null || body[field] === ""
  );
}

function impactScore(items, weightKg) {
  const hazardWeight = {
    LOW: 8,
    MEDIUM: 14,
    HIGH: 22,
    CRITICAL: 28,
  };

  const fromItems = (items || []).reduce((sum, item) => {
    return (
      sum +
      Number(item.weightKg || 0) * (hazardWeight[item.hazardLevel] || 12)
    );
  }, 0);

  const fallback = Number(weightKg || 0) * 15;
  return Math.min(100, Math.round(fromItems || fallback));
}

function receiptPayload(transaction) {
  const items = transaction.itemsList?.length
    ? transaction.itemsList
    : [
        {
          materialCode: transaction.materialCode,
          itemType: transaction.materialCode,
          category: transaction.materialCode,
          weightKg: transaction.weightKg,
          ratePerKg:
            transaction.weightKg > 0
              ? (transaction.finalPriceINR || 0) / transaction.weightKg
              : 0,
          amount: transaction.finalPriceINR,
        },
      ];

  const subtotal = Number(
    transaction.totalAmount || transaction.finalPriceINR || 0
  );
  const taxAmount = Number(transaction.taxAmount || 0);
  const environmentalImpactScore =
    transaction.environmentalImpactScore ||
    impactScore(items, transaction.weightKg);

  return {
    platform: "Safaaiwala",
    title: "Digital Scrap Receipt",
    transactionId: transaction.transactionId,
    status: transaction.status || transaction.transactionStatus,
    createdAt: transaction.createdAt,
    collectorId: transaction.collectorId,
    recycler: transaction.recyclerId,
    items,
    subtotal,
    taxAmount,
    totalAmount: Number((subtotal + taxAmount).toFixed(2)),
    weightKg: transaction.weightKg,
    environmentalImpactScore,
    referenceHash: transaction.referenceHash,
    dynamicQrCode: transaction.dynamicQrCode,
    verificationStatus: transaction.verificationStatus,
  };
}

async function attachTraceability(transaction, actor) {
  const batchHash = hashPayload([
    transaction.transactionId,
    transaction.referenceHash,
    String(Date.now()),
  ]);

  return Traceability.create({
    transactionId: transaction._id,
    publicTransactionId: transaction.transactionId,
    batchHash,
    currentStage: "collected",
    custodyChainLog: [
      {
        stage: "collected",
        actorRole: actor?.role || "collector",
        actorId: actor?.id || transaction.collectorId,
        location: transaction.collectionLocation?.address || "",
        notes: "Transaction opened and QR issued",
        at: new Date(),
      },
    ],
  });
}

async function list(req, res) {
  try {
    const query = {};

    if (req.query.collectorId) {
      query.collectorId = req.query.collectorId;
    } else if (req.user?.linkedCollectorId) {
      query.collectorId = req.user.linkedCollectorId;
    }

    if (req.query.recyclerId) {
      query.recyclerId = req.query.recyclerId;
    } else if (req.user?.role === "recycler" && req.user.linkedRecyclerId) {
      query.recyclerId = req.user.linkedRecyclerId;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("recyclerId", "name location licenseNo authorizationNumber facilityLocation")
      .lean();

    return res.json(transactions);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to fetch transactions" });
  }
}

async function create(req, res) {
  if (Array.isArray(req.body?.itemsList) && req.body.itemsList.length > 0) {
    return createReceiptTransaction(req, res, "ONLINE");
  }
  return createLegacyTransaction(req, res, "ONLINE");
}

async function syncOffline(req, res) {
  if (Array.isArray(req.body?.itemsList) && req.body.itemsList.length > 0) {
    return createReceiptTransaction(req, res, "OFFLINE");
  }
  return createLegacyTransaction(req, res, "OFFLINE");
}

async function createReceiptTransaction(req, res, syncSource) {
  try {
    const {
      recyclerId,
      collectorId,
      itemsList,
      originNotes = "",
      address = "",
      lat,
      lng,
    } = req.body || {};

    if (!recyclerId) {
      return res.status(400).json({ error: "recyclerId is required" });
    }

    const resolvedCollector =
      collectorId ||
      req.user?.linkedCollectorId ||
      req.user?.id ||
      `guest_${crypto.randomBytes(4).toString("hex")}`;

    const normalizedItems = itemsList.map((item) => {
      const weightKg = Number(item.weightKg || 0);
      const ratePerKg = Number(item.ratePerKg || item.estimatedValuePerKg || 0);
      const amount = Number(item.amount || weightKg * ratePerKg);
      return {
        materialCode: String(item.materialCode || "mixed").toLowerCase(),
        itemType: item.itemType || item.materialCode || "mixed waste",
        category: item.category || item.materialCode || "mixed",
        weightKg,
        ratePerKg,
        amount: Number(amount.toFixed(2)),
        hazardLevel: item.hazardLevel || "MEDIUM",
        recyclability: item.recyclability || "medium",
      };
    });

    const totalAmount = Number(
      normalizedItems
        .reduce((sum, item) => sum + Number(item.amount || 0), 0)
        .toFixed(2)
    );

    const taxAmount = Number((totalAmount * 0).toFixed(2));
    const environmentalImpactScore = impactScore(normalizedItems, 0);

    const transaction = await Transaction.create({
      userId: req.user?.id || null,
      recyclerId,
      collectorId: resolvedCollector,
      itemsList: normalizedItems,
      totalAmount,
      taxAmount,
      environmentalImpactScore,
      status: "requested",
      originNotes,
      syncSource,
      paymentStatus: "PENDING",
      collectionLocation: {
        type: "Point",
        coordinates:
          Number.isFinite(Number(lng)) && Number.isFinite(Number(lat))
            ? [Number(lng), Number(lat)]
            : undefined,
        address,
      },
    });

    await attachTraceability(transaction, req.user);

    await Collector.updateOne(
      { collectorId: resolvedCollector },
      { $inc: { totalPickups: 1 }, $set: { lastSeenAt: new Date() } }
    );

    const populated = await Transaction.findById(transaction._id)
      .populate("recyclerId", "name location licenseNo authorizationNumber")
      .lean();

    const receipt = receiptPayload(populated);

    emitTransaction("transaction:created", {
      transactionId: populated.transactionId,
      recyclerId: String(populated.recyclerId?._id || recyclerId),
      collectorId: resolvedCollector,
      userId: req.user?.id || null,
      totalAmount,
      status: populated.status,
      receipt,
    });

    return res.status(201).json({
      queued: false,
      transaction: populated,
      receipt,
    });
  } catch (error) {
    console.error("createReceiptTransaction error:", error);
    return res.status(500).json({ error: "Unable to create receipt transaction" });
  }
}

async function createLegacyTransaction(req, res, syncSource) {
  try {
    const missing = validateLegacyBody(req.body);
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing fields: ${missing.join(", ")}`,
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

    const numericWeight = Number(weightKg);
    const quoted = Number(quotedPriceINR);
    const finalPrice = Number(finalPriceINR);

    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      return res.status(400).json({ error: "Invalid weightKg" });
    }
    if (!Number.isFinite(quoted) || quoted < 0) {
      return res.status(400).json({ error: "Invalid quotedPriceINR" });
    }
    if (!Number.isFinite(finalPrice) || finalPrice < 0) {
      return res.status(400).json({ error: "Invalid finalPriceINR" });
    }

    const existing = await Transaction.findOne({ clientTransactionId });
    if (existing) {
      return res.status(200).json({
        duplicate: true,
        queued: false,
        transaction: existing,
      });
    }

    const transactionId = `TX-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;

    const referenceHash = hashPayload([
      transactionId,
      lotId,
      collectorId,
      materialCode,
      numericWeight,
      finalPrice,
      recyclerId,
    ]);

    const transaction = await Transaction.create({
      transactionId,
      clientTransactionId,
      lotId,
      collectorId,
      recyclerId,
      userId: req.user?.id || null,
      materialCode,
      weightKg: numericWeight,
      quotedPriceINR: quoted,
      finalPriceINR: finalPrice,
      totalAmount: finalPrice,
      paymentType: paymentType === "DIGITAL" ? "DIGITAL" : "CASH",
      paymentStatus: "PAID",
      transactionStatus: "COMPLETED",
      status: "completed",
      verificationStatus: "verified",
      referenceHash,
      syncSource,
      environmentalImpactScore: impactScore(
        [{ weightKg: numericWeight, hazardLevel: "MEDIUM" }],
        numericWeight
      ),
      collectionLocation:
        Number.isFinite(Number(collectionLat)) &&
        Number.isFinite(Number(collectionLng))
          ? {
              type: "Point",
              coordinates: [Number(collectionLng), Number(collectionLat)],
            }
          : undefined,
      handoverLocation:
        Number.isFinite(Number(handoverLat)) &&
        Number.isFinite(Number(handoverLng))
          ? {
              type: "Point",
              coordinates: [Number(handoverLng), Number(handoverLat)],
            }
          : undefined,
      verificationTimestamp: new Date(),
      completedAt: new Date(),
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

    await attachTraceability(transaction, req.user).catch(() => null);

    const populated = await Transaction.findById(transaction._id)
      .populate("recyclerId", "name location licenseNo")
      .lean();

    emitTransaction("transaction:created", {
      transactionId: populated.transactionId,
      recyclerId: String(recyclerId),
      collectorId,
      userId: req.user?.id || null,
      totalAmount: finalPrice,
      status: populated.status,
      receipt: receiptPayload(populated),
    });

    return res.status(201).json({
      ...populated,
      queued: false,
      receipt: receiptPayload(populated),
    });
  } catch (error) {
    console.error("Transaction creation error:", error);

    if (error.code === 11000) {
      const existing = await Transaction.findOne({
        clientTransactionId: req.body.clientTransactionId,
      });
      return res.status(200).json({
        duplicate: true,
        queued: false,
        transaction: existing,
      });
    }

    return res.status(500).json({ error: "Unable to create transaction" });
  }
}

async function getReceipt(req, res) {
  try {
    const id = req.params.id;
    const query = [{ transactionId: id }];
    if (mongoose.isValidObjectId(id)) query.push({ _id: id });
    const transaction = await Transaction.findOne({ $or: query })
      .populate("recyclerId", "name location licenseNo authorizationNumber")
      .lean();

    if (!transaction) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    return res.json({ receipt: receiptPayload(transaction) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to load receipt" });
  }
}

module.exports = {
  list,
  create,
  syncOffline,
  getReceipt,
  receiptPayload,
};
