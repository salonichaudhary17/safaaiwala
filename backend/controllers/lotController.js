const Lot = require('../models/Lot');
const Price = require('../models/Price');
const Recycler = require('../models/Recycler');
const crypto = require('crypto');

exports.createLot = async (req, res) => {
  try {
    const { collectorId, category, subCategory, description, imageUrl, approxWeightKg, location } = req.body;
    
    // Auto-calculate estimate using recent price dataset
    const priceDoc = await Price.findOne({ category }).sort({ effectiveDate: -1 });
    const pricePerKg = priceDoc ? priceDoc.buyingPricePerKg : 20;
    const estimatedValueINR = Math.round(pricePerKg * approxWeightKg);
    const lotId = 'LOT-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const newLot = new Lot({
      lotId,
      collectorId,
      category,
      subCategory,
      description,
      imageUrl,
      approxWeightKg,
      estimatedValueINR,
      collectionLocation: location,
      handoverCode: Math.floor(1000 + Math.random() * 9000).toString()
    });

    await newLot.save();
    res.status(201).json({ success: true, data: newLot });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getMatchingRecyclers = async (req, res) => {
  try {
    const { lotId } = req.params;
    const lot = await Lot.findOne({ lotId });
    if (!lot) return res.status(404).json({ success: false, message: 'Lot not found' });

    const recyclers = await Recycler.find({
      authorizationStatus: 'AUTHORIZED',
      materialsAccepted: lot.category
    });

    // Distance calculation (Haversine Formula) & Ranking
    const ranked = recyclers.map(r => {
      const R = 6371;
      const dLat = (r.facilityLocation.lat - lot.collectionLocation.lat) * Math.PI / 180;
      const dLng = (r.facilityLocation.lng - lot.collectionLocation.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lot.collectionLocation.lat * Math.PI / 180) * Math.cos(r.facilityLocation.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const distanceKm = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
      
      const rateObj = r.offeredRates.find(rate => rate.category === lot.category);
      const rate = rateObj ? rateObj.pricePerKg : 0;
      const projectedEarnings = Math.round(rate * lot.approxWeightKg);

      return {
        recyclerId: r._id,
        name: r.name,
        facilityLocation: r.facilityLocation,
        distanceKm: Number(distanceKm.toFixed(2)),
        offeredRatePerKg: rate,
        projectedEarnings,
        pickupAvailable: r.pickupAvailable,
        authorizationNumber: r.authorizationNumber
      };
    }).sort((a, b) => b.projectedEarnings - a.projectedEarnings || a.distanceKm - b.distanceKm);

    res.status(200).json({ success: true, count: ranked.length, data: ranked });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};