import express from 'express';
import { Transaction } from '../models/Transaction.js';

const router = express.Router();

/**
 * POST /api/handover/verify
 * Confirms transaction completion upon aggregator scanning QR / submitting OTP
 */
router.post('/verify', async (req, res) => {
  try {
    const { collectorId, aggregatorId, materials, totalAmount, paymentMethod, location, code } = req.body;

    // Basic payload check
    if (!collectorId || !aggregatorId || !code) {
      return res.status(400).json({ error: 'Missing transaction validation parameters' });
    }

    const newTransaction = await Transaction.create({
      collectorId,
      aggregatorId,
      materials,
      totalAmount,
      paymentMethod,
      handoverCode: code,
      location,
      status: 'COMPLETED',
    });

    res.status(201).json({
      success: true,
      message: 'Handover verified and recorded',
      transactionId: newTransaction._id,
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed', details: error.message });
  }
});

export default router;