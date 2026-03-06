const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/refundController");

// POST /api/refunds — request a refund for a delivered order
router.post("/", verifyToken, ctrl.requestRefund);

// GET /api/refunds/my — get all refund requests by current user
router.get("/my", verifyToken, ctrl.getUserRefunds);

module.exports = router;
