const mongoose = require('mongoose');

// 1. Material Schema
const materialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ['e-waste', 'plastic', 'metal', 'paper', 'glass', 'hazardous']
  },
  hazardRating: { type: Number, min: 1, max: 5, default: 1 },
  defaultRate: { type: Number, required: true } // Price per KG in INR
}, { timestamps: true });

// 2. Price Schema
const priceSchema = new mongoose.Schema({
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
  currentRate: { type: Number, required: true },
  trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
  city: { type: String, required: true, default: 'Delhi' },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// 3. Recycler Schema
const recyclerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  capacityKg: { type: Number, required: true },
  authorizedCategories: [{ type: String }],
  licenseNo: { type: String, required: true, unique: true }
}, { timestamps: true });

// 4. Transaction Schema
const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recyclerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recycler' },
  collectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector' },
  itemsList: [{
    materialName: String,
    category: String,
    weightKg: Number,
    ratePerKg: Number,
    subtotal: Number
  }],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'collected', 'recycled', 'cancelled'],
    default: 'pending'
  },
  dynamicQrCode: { type: String }
}, { timestamps: true });

// 5. Traceability Schema
const traceabilitySchema = new mongoose.Schema({
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  batchHash: { type: String, required: true },
  currentStage: {
    type: String,
    enum: ['pickup_scheduled', 'in_transit', 'received_at_facility', 'processing', 'recycled'],
    default: 'pickup_scheduled'
  },
  custodyChainLog: [{
    stage: String,
    handler: String,
    timestamp: { type: Date, default: Date.now },
    notes: String
  }]
}, { timestamps: true });

// 6. Collector Schema
const collectorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vehicleType: { type: String, required: true },
  activeStatus: { type: Boolean, default: true },
  assignedZone: { type: String, required: true },
  totalPickups: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = {
  Material: mongoose.model('Material', materialSchema),
  Price: mongoose.model('Price', priceSchema),
  Recycler: mongoose.model('Recycler', recyclerSchema),
  Transaction: mongoose.model('Transaction', transactionSchema),
  Traceability: mongoose.model('Traceability', traceabilitySchema),
  Collector: mongoose.model('Collector', collectorSchema)
};