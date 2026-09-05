const mongoose = require('mongoose');

const lotSchema = new mongoose.Schema({
  lotId: { type: String, required: true, unique: true },
  collectorId: { type: String, required: true, index: true },
  category: { 
    type: String, 
    required: true, 
    enum: ['CRTs', 'LCD panels', 'PCBs', 'Cables', 'Batteries', 'Motors', 'Mixed plastics'] 
  },
  subCategory: { type: String, default: 'General' },
  description: { type: String, default: '' },
  imageUrl: { type: String, required: true },
  approxWeightKg: { type: Number, required: true },
  estimatedValueINR: { type: Number, required: true },
  collectionLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: '' }
  },
  handoverLocation: {
    lat: Number,
    lng: Number,
    address: String
  },
  status: { 
    type: String, 
    enum: ['CREATED', 'QUOTED', 'MATCHED', 'HANDOVER_PENDING', 'COMPLETED', 'CANCELLED'], 
    default: 'CREATED' 
  },
  handoverCode: { type: String },
  recyclerConfirmation: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Lot', lotSchema);