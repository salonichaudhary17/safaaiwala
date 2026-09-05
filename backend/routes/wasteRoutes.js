const express = require("express");
const wasteController = require("../controllers/wasteController");
const { optionalAuth, protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/classify", optionalAuth, wasteController.classifyImage);
router.get("/prices", optionalAuth, wasteController.getLivePrices);
router.get("/prices/stream", wasteController.streamPrices);
router.post("/pickup", protect, wasteController.schedulePickup);

module.exports = router;
