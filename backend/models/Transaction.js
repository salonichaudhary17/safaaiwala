import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    collectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    aggregatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    materials: [
      {
        materialType: { type: String, required: true }, // e.g., 'copper_wire', 'lead_acid_battery'
        weightKg: { type: Number, required: true },
        ratePerKg: { type: Number, required: true },
        subtotal: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['CASH', 'UPI'], required: true },
    handoverCode: { type: String, required: true }, // Verification OTP/Hash
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'CANCELLED'], default: 'PENDING' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    syncedFromOffline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

transactionSchema.index({ location: '2dsphere' });

export const Transaction = mongoose.model('Transaction', transactionSchema);