const express = require('express');
const multer = require('multer');
const ewasteController = require('../controllers/ewasteController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

// Core AI Endpoints
router.post('/analyze', upload.single('image'), ewasteController.analyzeMaterial);
router.post('/voice', ewasteController.processVoiceQuery);
router.post('/handover', ewasteController.completeHandover);

// Authentication Endpoint
router.post('/auth/login', ewasteController.login);

// 6 Structured Datasets Endpoints
router.get('/datasets/materials', ewasteController.getMaterials);
router.get('/datasets/prices', ewasteController.getPrices);
router.get('/datasets/recyclers', ewasteController.getRecyclers);
router.get('/datasets/transactions', ewasteController.getTransactions);
router.get('/datasets/traceability', ewasteController.getTraceability);
router.get('/datasets/collectors', ewasteController.getCollectors);

// Legacy aliases
router.get('/catalog', ewasteController.getPrices);
router.get('/recyclers', ewasteController.getRecyclers);

module.exports = router;
