const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    label_en: {
      type: String,
      required: true,
      trim: true,
    },

    label_hi: {
      type: String,
      required: true,
      trim: true,
    },

    label_mr: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    subCategory: {
      type: String,
      default: "General",
      trim: true,
    },

    hazardous: {
      type: Boolean,
      default: false,
    },

    safety_note_en: {
      type: String,
      default: "",
    },

    safety_note_hi: {
      type: String,
      default: "",
    },

    safety_note_mr: {
      type: String,
      default: "",
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

materialSchema.index({
  code: 1,
  active: 1,
});

module.exports = mongoose.model("Material", materialSchema);