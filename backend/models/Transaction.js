const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    clientTransactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    lotId: {
      type: String,
      required: true,
      index: true,
    },

    collectorId: {
      type: String,
      required: true,
      index: true,
    },

    recyclerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recycler",
      required: true,
    },

    materialCode: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    weightKg: {
      type: Number,
      required: true,
      min: 0.001,
    },

    quotedPriceINR: {
      type: Number,
      required: true,
      min: 0,
    },

    finalPriceINR: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentType: {
      type: String,
      enum: ["CASH", "DIGITAL"],
      default: "CASH",
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
    },

    transactionStatus: {
      type: String,
      enum: [
        "INITIATED",
        "VERIFIED",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "INITIATED",
    },

    collectionLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        default: undefined,
      },
    },

    handoverLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        default: undefined,
      },
    },

    referenceHash: {
      type: String,
      required: true,
      unique: true,
    },

    verificationTimestamp: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    syncSource: {
      type: String,
      enum: ["ONLINE", "OFFLINE"],
      default: "ONLINE",
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({
  collectorId: 1,
  createdAt: -1,
});

transactionSchema.index({
  recyclerId: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Transaction",
  transactionSchema
);