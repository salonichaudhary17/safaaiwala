const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  lotId: { type: String, required: true, ref: 'Lot' },
  collectorId: { type: String, required: true, index: true },
  recyclerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recycler', required: true },
  category: { type: String, required: true },
  weightKg: { type: Number, required: true },
  quotedPriceINR: { type: Number, required: true },
  finalPriceINR: { type: Number, required: true },
  paymentType: { type: String, enum: ['CASH', 'DIGITAL'], default: 'CASH' },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID'], default: 'PENDING' },
  transactionStatus: { type: String, enum: ['INITIATED', 'VERIFIED', 'COMPLETED'], default: 'INITIATED' },
  verificationTimestamp: Date,
  digitalHandoverRecord: {
    handoverRef: String,
    gps: { lat: Number, lng: Number },
    photoUrl: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);