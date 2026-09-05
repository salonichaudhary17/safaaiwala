const express = require("express");
const recyclerController = require("../controllers/recyclerController");
const { optionalAuth, protect, requireRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard", optionalAuth, recyclerController.dashboard);
router.patch(
  "/requests/:id/verify",
  protect,
  requireRoles("recycler"),
  recyclerController.verifyRequest
);
router.post(
  "/batches",
  protect,
  requireRoles("recycler"),
  recyclerController.logBatchWeight
);

module.exports = router;
