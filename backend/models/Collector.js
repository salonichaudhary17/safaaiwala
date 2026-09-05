const mongoose = require("mongoose");

const collectorSchema = new mongoose.Schema(
  {
    collectorId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    displayName: {
      type: String,
      default: "Collector",
      trim: true,
    },

    phone: {
      type: String,
      default: null,
      trim: true,
    },

    preferredLanguage: {
      type: String,
      enum: ["en", "hi", "mr"],
      default: "hi",
    },

    location: {
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

    locationName: {
      type: String,
      default: "Delhi",
      trim: true,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

collectorSchema.index({
  location: "2dsphere",
});

module.exports = mongoose.model("Collector", collectorSchema);