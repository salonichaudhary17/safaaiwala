const mongoose = require("mongoose");
const {
  Transaction,
  Recycler,
  Traceability,
  Collector,
} = require("../models/Schemas");
const { emitTransaction } = require("../utils/realtime");

async function dashboard(req, res) {
  try {
    const recyclerId =
      req.query.recyclerId || req.user?.linkedRecyclerId || null;

    const recyclerQuery = recyclerId
      ? { _id: recyclerId }
      : { active: true };

    const recycler = await Recycler.findOne(recyclerQuery).lean();
    if (!recycler) {
      return res.status(404).json({ error: "Recycler not found" });
    }

    const requests = await Transaction.find({ recyclerId: recycler._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const traces = await Traceability.find({
      transactionId: { $in: requests.map((row) => row._id) },
    }).lean();

    const traceMap = new Map(
      traces.map((trace) => [String(trace.transactionId), trace])
    );

    const collectorIds = [...new Set(requests.map((row) => row.collectorId))];
    const collectors = await Collector.find({
      collectorId: { $in: collectorIds },
    }).lean();
    const collectorMap = new Map(
      collectors.map((collector) => [collector.collectorId, collector])
    );

    const incoming = requests.map((txn) => {
      const trace = traceMap.get(String(txn._id));
      const collector = collectorMap.get(txn.collectorId);
      return {
        id: String(txn._id),
        transactionId: txn.transactionId,
        status: txn.status || txn.transactionStatus,
        verificationStatus: txn.verificationStatus,
        totalAmount: txn.totalAmount || txn.finalPriceINR,
        weightKg: txn.weightKg,
        itemsList: txn.itemsList,
        origin: {
          collectorId: txn.collectorId,
          collectorName: collector?.name || collector?.displayName || "Collector",
          zone: collector?.assignedZone || collector?.locationName || "",
          address: txn.collectionLocation?.address || "",
          notes: txn.originNotes || "",
        },
        currentStage: trace?.currentStage || "collected",
        custodyChainLog: trace?.custodyChainLog || [],
        batchHash: trace?.batchHash || txn.referenceHash,
        createdAt: txn.createdAt,
      };
    });

    const pendingWeight = incoming
      .filter((row) => row.status !== "completed" && row.status !== "COMPLETED")
      .reduce((sum, row) => sum + Number(row.weightKg || 0), 0);

    return res.json({
      recycler: {
        id: String(recycler._id),
        name: recycler.name,
        location: recycler.location || recycler.facilityLocation?.address,
        city: recycler.facilityLocation?.city,
        capacityKg: recycler.capacityKg,
        licenseNo: recycler.licenseNo || recycler.authorizationNumber,
        authorizationStatus: recycler.authorizationStatus,
        authorizedCategories:
          recycler.authorizedCategories || recycler.materialsAccepted,
      },
      summary: {
        incomingCount: incoming.length,
        pendingVerification: incoming.filter(
          (row) => row.verificationStatus === "pending"
        ).length,
        pendingWeightKg: Number(pendingWeight.toFixed(2)),
        loggedBatches: (recycler.batchWeightLogs || []).length,
      },
      incoming,
      batchWeightLogs: recycler.batchWeightLogs || [],
    });
  } catch (error) {
    console.error("recycler dashboard error:", error);
    return res.status(500).json({ error: "Unable to load recycler dashboard" });
  }
}

async function verifyRequest(req, res) {
  try {
    const { decision = "verified", notes = "" } = req.body || {};
    const id = req.params.id;
    const query = [{ transactionId: id }];
    if (mongoose.isValidObjectId(id)) query.push({ _id: id });
    const transaction = await Transaction.findOne({ $or: query });

    if (!transaction) {
      return res.status(404).json({ error: "Request not found" });
    }

    const accepted = decision !== "rejected";
    transaction.verificationStatus = accepted ? "verified" : "rejected";
    transaction.status = accepted ? "verified" : "cancelled";
    transaction.transactionStatus = accepted ? "VERIFIED" : "CANCELLED";
    transaction.verificationTimestamp = new Date();
    if (notes) transaction.originNotes = notes;
    await transaction.save();

    await Traceability.updateOne(
      { transactionId: transaction._id },
      {
        $set: { currentStage: accepted ? "verified" : "closed" },
        $push: {
          custodyChainLog: {
            stage: accepted ? "verified" : "closed",
            actorRole: "recycler",
            actorId: req.user?.id || "",
            notes: notes || (accepted ? "Material verified" : "Request rejected"),
            at: new Date(),
          },
        },
      }
    );

    emitTransaction("transaction:verified", {
      transactionId: transaction.transactionId,
      recyclerId: String(transaction.recyclerId),
      collectorId: transaction.collectorId,
      userId: transaction.userId ? String(transaction.userId) : null,
      verificationStatus: transaction.verificationStatus,
      status: transaction.status,
    });

    return res.json({
      ok: true,
      transactionId: transaction.transactionId,
      verificationStatus: transaction.verificationStatus,
    });
  } catch (error) {
    console.error("verifyRequest error:", error);
    return res.status(500).json({ error: "Unable to verify request" });
  }
}

async function logBatchWeight(req, res) {
  try {
    const { transactionId, weightKg, notes = "" } = req.body || {};
    if (!transactionId || !weightKg) {
      return res.status(400).json({
        error: "transactionId and weightKg are required",
      });
    }

    const query = [{ transactionId }];
    if (mongoose.isValidObjectId(transactionId)) query.push({ _id: transactionId });
    const transaction = await Transaction.findOne({ $or: query });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const recycler = await Recycler.findById(transaction.recyclerId);
    if (!recycler) {
      return res.status(404).json({ error: "Recycler not found" });
    }

    recycler.batchWeightLogs.push({
      transactionId: transaction.transactionId,
      weightKg: Number(weightKg),
      verifiedBy: req.user?.id || "recycler",
      notes,
      loggedAt: new Date(),
    });
    await recycler.save();

    transaction.weightKg = Number(weightKg);
    transaction.status = "completed";
    transaction.transactionStatus = "COMPLETED";
    transaction.completedAt = new Date();
    await transaction.save();

    await Traceability.updateOne(
      { transactionId: transaction._id },
      {
        $set: { currentStage: "processed" },
        $push: {
          custodyChainLog: {
            stage: "processed",
            actorRole: "recycler",
            actorId: req.user?.id || "",
            notes: `Batch weight logged: ${weightKg} kg`,
            at: new Date(),
          },
        },
      }
    );

    emitTransaction("batch:logged", {
      transactionId: transaction.transactionId,
      recyclerId: String(recycler._id),
      collectorId: transaction.collectorId,
      userId: transaction.userId ? String(transaction.userId) : null,
      weightKg: Number(weightKg),
    });

    return res.status(201).json({
      ok: true,
      batchWeightLogs: recycler.batchWeightLogs,
    });
  } catch (error) {
    console.error("logBatchWeight error:", error);
    return res.status(500).json({ error: "Unable to log batch weight" });
  }
}

module.exports = {
  dashboard,
  verifyRequest,
  logBatchWeight,
};
