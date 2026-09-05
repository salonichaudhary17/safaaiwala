const mongoose = require("mongoose");

const lotSchema = new mongoose.Schema(
  {
    lotId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    clientLotId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    collectorId: {
      type: String,
      required: true,
      index: true,
    },

    materialCode: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    materialName: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      required: true,
    },

    subCategory: {
      type: String,
      default: "General",
    },

    description: {
      type: String,
      default: "",
    },

    imageDataUrl: {
      type: String,
      default: null,
      select: false,
    },

    imageUrl: {
      type: String,
      default: null,
    },

    weightKg: {
      type: Number,
      required: true,
      min: 0.001,
    },

    quotedPricePerKg: {
      type: Number,
      default: null,
      min: 0,
    },

    estimatedValueINR: {
      type: Number,
      default: null,
      min: 0,
    },

    collectionLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        required: true,
      },

      address: {
        type: String,
        default: "",
      },

      locationName: {
        type: String,
        default: "",
      },
    },

    status: {
      type: String,
      enum: [
        "CREATED",
        "QUOTED",
        "MATCHED",
        "HANDOVER_PENDING",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "CREATED",
      index: true,
    },

    recommendedRecyclerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Recycler",
      },
    ],

    selectedRecyclerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recycler",
      default: null,
    },

    offlineCreated: {
      type: Boolean,
      default: false,
    },

    syncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

lotSchema.index({
  collectionLocation: "2dsphere",
});

lotSchema.index({
  collectorId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Lot", lotSchema);