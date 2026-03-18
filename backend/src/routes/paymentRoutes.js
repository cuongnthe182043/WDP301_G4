const express    = require("express");
const router     = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl       = require("../controllers/paymentController");

// ── PayPal ────────────────────────────────────────────────────────────────────
router.post("/create-order",  verifyToken, ctrl.createOrder);
router.post("/capture-order", verifyToken, ctrl.captureOrder);
router.post("/refund",        verifyToken, ctrl.refund);

// ── VNPAY ─────────────────────────────────────────────────────────────────────
// Authenticated: user requests a payment URL for their own pending order
router.post("/vnpay/create",  verifyToken, ctrl.vnpayCreate);

// No auth: VNPAY server calls IPN directly (server-to-server)
router.get("/vnpay/ipn",                   ctrl.vnpayIpn);

// No auth: VNPAY redirects user's browser here after payment (browser redirect)
router.get("/vnpay/return",                ctrl.vnpayReturn);

module.exports = router;
