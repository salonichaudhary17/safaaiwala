const mongoose = require("mongoose");

const priceSchema = new mongoose.Schema(
  {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
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

    locationName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    buyingPricePerKg: {
      type: Number,
      required: true,
      min: 0,
    },

    sellingPricePerKg: {
      type: Number,
      default: null,
      min: 0,
    },

    marketRangeMin: {
      type: Number,
      required: true,
      min: 0,
    },

    marketRangeMax: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },

    source: {
      type: String,
      enum: ["ADMIN", "RECYCLER", "MARKET", "SEEDED"],
      default: "ADMIN",
    },

    recycler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recycler",
      default: null,
    },

    effectiveFrom: {
      type: Date,
      default: Date.now,
      index: true,
    },

    effectiveUntil: {
      type: Date,
      default: null,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

priceSchema.index({
  materialCode: 1,
  locationName: 1,
  effectiveFrom: -1,
});

module.exports = mongoose.model("Price", priceSchema);