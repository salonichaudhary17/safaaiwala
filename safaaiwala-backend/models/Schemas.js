const mongoose = require('mongoose');

// 1. Material Schema
const materialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['PCB', 'Lithium Battery', 'Copper Wires', 'CRT Monitor', 'Mixed Plastic', 'Aluminium Scrap']
    },
    hazardRating: { type: Number, min: 1, max: 5, default: 2 },
    defaultRate: { type: Number, required: true },
    unit: { type: String, default: 'INR/KG' },
    safetyNotes: {
      en: { type: String, default: '' },
      hi: { type: String, default: '' },
      mr: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

// 2. Price Schema (City-by-City live benchmark pricing)
const priceSchema = new mongoose.Schema(
  {
    materialName: { type: String, required: true },
    category: { type: String, required: true },
    city: { type: String, required: true, default: 'Delhi' },
    currentRate: { type: Number, required: true },
    minRate: { type: Number, required: true },
    maxRate: { type: Number, required: true },
    trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
    lastUpdated: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// 3. Recycler Schema (CPCB EPR Registered Facilities)
const recyclerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    city: { type: String, required: true },
    location: { type: String, required: true },
    licenseNo: { type: String, required: true, unique: true },
    capacityKgPerYear: { type: Number, required: true },
    acceptedMaterials: [{ type: String }],
    offeredRateIndex: { type: Number, default: 1.0 },
    contactPhone: { type: String, required: true },
    isEprAuthorized: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// 4. Transaction Schema (Handover records)
const transactionSchema = new mongoose.Schema(
  {
    txnId: { type: String, required: true, unique: true },
    collectorId: { type: String, required: true },
    recyclerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recycler' },
    itemsList: [
      {
        materialName: String,
        category: String,
        weightKg: Number,
        ratePerKg: Number,
        subtotal: Number
      }
    ],
    totalAmount: { type: Number, required: true },
    totalWeightKg: { type: Number, required: true },
    handoverHash: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'collected', 'verified', 'recycled'],
      default: 'verified'
    },
    dynamicQrCode: { type: String }
  },
  { timestamps: true }
);

// 5. Traceability Schema (Immutable audit log and custody stages)
const traceabilitySchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true },
    batchHash: { type: String, required: true, unique: true },
    currentStage: {
      type: String,
      enum: ['pickup_scheduled', 'in_transit', 'received_at_facility', 'processing', 'recycled'],
      default: 'received_at_facility'
    },
    custodyChainLog: [
      {
        stage: String,
        handler: String,
        timestamp: { type: Date, default: Date.now },
        notes: String
      }
    ]
  },
  { timestamps: true }
);

// 6. Collector Schema (Informal kabadiwala profile - minimal per PS requirements)
const collectorSchema = new mongoose.Schema(
  {
    collectorId: { type: String, required: true, unique: true },
    phone: { type: String, default: '+91 98XXXXXX01' },
    assignedZone: { type: String, default: 'Delhi Central' },
    vehicleType: { type: String, enum: ['Cycle Rickshaw', 'Three-Wheeler Tempo', 'Hand Cart', 'E-Rickshaw'], default: 'E-Rickshaw' },
    activeStatus: { type: Boolean, default: true },
    totalPickups: { type: Number, default: 0 },
    totalEarningsInr: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// 7. Backward-compatible PriceCatalog and MaterialLot
const PriceCatalog = mongoose.model('PriceCatalog', priceSchema);
const MaterialLot = mongoose.model('MaterialLot', transactionSchema);

const Material = mongoose.model('Material', materialSchema);
const Price = mongoose.model('Price', priceSchema);
const Recycler = mongoose.model('Recycler', recyclerSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Traceability = mongoose.model('Traceability', traceabilitySchema);
const Collector = mongoose.model('Collector', collectorSchema);

module.exports = {
  Material,
  Price,
  Recycler,
  Transaction,
  Traceability,
  Collector,
  PriceCatalog,
  MaterialLot
};
