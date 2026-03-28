// orderRoutes.js
const express = require("express");

const router = express.Router();
const ctrl = require("../controllers/orderController");
const { verifyToken } = require("../middlewares/authMiddleware");
const checkBanStatus  = require("../middlewares/checkBanStatus");

router.use(verifyToken);

// Read-only — allowed for banned users (view their own data)
router.get("/", ctrl.list);
router.get("/revenue-by-category", ctrl.getRevenueByCategoryController);
router.get("/:id", ctrl.detail);
router.get("/:id/tracking", ctrl.tracking);
router.get("/:id/invoice", ctrl.invoicePdf);

// Write operations — blocked for banned users
router.post("/:id/cancel",          ctrl.cancel);
router.post("/:id/confirm-receipt", ctrl.confirmReceipt);
router.post("/:id/reorder",         checkBanStatus, ctrl.reorder);
router.post("/:id/refund",          ctrl.requestRefund);
router.post("/:id/review-reminder", checkBanStatus, ctrl.sendReviewReminder); 

module.exports = router;