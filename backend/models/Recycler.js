const mongoose = require('mongoose');

const recyclerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  facilityLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  materialsAccepted: [{ type: String }],
  authorizationNumber: { type: String, required: true },
  authorizationStatus: { type: String, enum: ['AUTHORIZED', 'PENDING', 'EXPIRED'], default: 'AUTHORIZED' },
  contactPhone: { type: String, required: true },
  pickupAvailable: { type: Boolean, default: true },
  serviceAreaRadiusKm: { type: Number, default: 25 },
  offeredRates: [{
    category: String,
    pricePerKg: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('Recycler', recyclerSchema);