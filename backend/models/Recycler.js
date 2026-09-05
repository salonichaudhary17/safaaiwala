const mongoose = require("mongoose");

const recyclerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    authorizationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    authorizationStatus: {
      type: String,
      enum: ["AUTHORIZED", "PENDING", "EXPIRED"],
      default: "AUTHORIZED",
      index: true,
    },

    contactPhone: {
      type: String,
      default: "",
      trim: true,
    },

    facilityLocation: {
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
        required: true,
        trim: true,
      },

      city: {
        type: String,
        default: "",
        trim: true,
      },
    },

    materialsAccepted: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],

    pickupAvailable: {
      type: Boolean,
      default: true,
    },

    serviceAreaRadiusKm: {
      type: Number,
      default: 25,
      min: 1,
    },

    offeredRates: [
      {
        materialCode: {
          type: String,
          lowercase: true,
          trim: true,
        },

        pricePerKg: {
          type: Number,
          min: 0,
        },
      },
    ],

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

recyclerSchema.index({
  facilityLocation: "2dsphere",
});

module.exports = mongoose.model("Recycler", recyclerSchema);