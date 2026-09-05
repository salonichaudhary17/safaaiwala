const { Transaction, Traceability } = require('../models/Schemas');
const crypto = require('crypto');

exports.createTransaction = async (req, res) => {
  try {
    const { userId, itemsList, totalAmount, recyclerId, collectorId } = req.body;

    const qrData = JSON.stringify({
      txnId: `TXN-${Date.now()}`,
      userId,
      amount: totalAmount,
      date: new Date().toISOString()
    });

    const transaction = new Transaction({
      userId,
      recyclerId,
      collectorId,
      itemsList,
      totalAmount,
      status: 'pending',
      dynamicQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`
    });

    const savedTxn = await transaction.save();

    // Create entry in Traceability custody chain
    const batchHash = crypto.createHash('sha256').update(savedTxn._id.toString() + Date.now()).digest('hex');
    const traceability = new Traceability({
      transactionId: savedTxn._id,
      batchHash,
      currentStage: 'pickup_scheduled',
      custodyChainLog: [{
        stage: 'pickup_scheduled',
        handler: 'Platform Automated System',
        notes: 'Transaction created and collection scheduled'
      }]
    });

    await traceability.save();

    // Trigger Socket.io real-time alert to recyclers
    const io = req.app.get('socketio');
    if (io) {
      io.emit('new_transaction', {
        transaction: savedTxn,
        traceability
      });
    }

    return res.status(201).json({
      success: true,
      transaction: savedTxn,
      traceability
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id)
      .populate('userId')
      .populate('recyclerId')
      .populate('collectorId');
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    return res.status(200).json(txn);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};