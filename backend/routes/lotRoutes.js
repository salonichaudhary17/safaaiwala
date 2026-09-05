const express = require('express');
const router = express.Router();
const lotController = require('../controllers/lotController');

router.post('/create', lotController.createLot);
router.get('/:lotId/matches', lotController.getMatchingRecyclers);

module.exports = router;