const express = require("express");
const transactionController = require("../controllers/transactionController");
const { optionalAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", optionalAuth, transactionController.list);
router.post("/", optionalAuth, transactionController.create);
router.post("/sync", optionalAuth, transactionController.syncOffline);
router.get("/:id/receipt", optionalAuth, transactionController.getReceipt);

module.exports = router;
