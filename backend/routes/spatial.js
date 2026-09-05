import express from 'express';
import { ScrapCenter } from '../models/ScrapCenter.js';

const router = express.Router();

/**
 * GET /api/centers/nearby
 * Query Params: lat, lng, radiusKm (default: 5km)
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and Longitude are required' });
    }

    const radiusInMeters = parseFloat(radiusKm) * 1000;

    const nearbyCenters = await ScrapCenter.find({
      isOpen: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: radiusInMeters,
        },
      },
    }).select('name phone location acceptedMaterials');

    res.status(200).json({ count: nearbyCenters.length, centers: nearbyCenters });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nearby centers', details: error.message });
  }
});

export default router;