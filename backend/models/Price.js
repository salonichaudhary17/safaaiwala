const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
  category: { type: String, required: true, index: true },
  subCategory: { type: String, default: 'Standard' },
  location: { type: String, required: true, index: true },
  buyingPricePerKg: { type: Number, required: true },
  marketRangeMin: { type: Number, required: true },
  marketRangeMax: { type: Number, required: true },
  unit: { type: String, default: 'kg' },
  recyclerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recycler' },
  effectiveDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Price', priceSchema);