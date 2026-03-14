const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const { requireShopOwner } = require("../middlewares/shopMiddleware");

const shopCtrl      = require("../controllers/shopController");
const orderCtrl     = require("../controllers/shopOrderController");
const refundCtrl    = require("../controllers/shopRefundController");
const customerCtrl  = require("../controllers/shopCustomerController");
const reviewCtrl    = require("../controllers/shopReviewController");
const walletCtrl    = require("../controllers/shopWalletController");

const router = express.Router();

// All shop routes require auth + role + approved shop
router.use(verifyToken, ...requireAnyRole("shop_owner", "sales", "system_admin"), requireShopOwner);

// ── Legacy analytics (kept for backward compat) ────────────────────────────
router.get("/analytics", shopCtrl.getAnalytics);

// ── Orders ─────────────────────────────────────────────────────────────────
router.get("/orders",              orderCtrl.listOrders);
router.get("/orders/:id",          orderCtrl.getOrder);
router.post("/orders/:id/confirm", orderCtrl.confirmOrder);
router.post("/orders/:id/cancel",  orderCtrl.cancelOrder);
router.post("/orders/:id/ghn",     orderCtrl.pushToGhn);
router.get("/orders/:id/track",    orderCtrl.trackOrder);
router.put("/orders/:id/status",   orderCtrl.updateOrderStatus);

// ── Refunds ────────────────────────────────────────────────────────────────
router.get("/refunds",               refundCtrl.listRefunds);
router.get("/refunds/:id",           refundCtrl.getRefund);
router.post("/refunds/:id/approve",  refundCtrl.approveRefund);
router.post("/refunds/:id/reject",   refundCtrl.rejectRefund);

// ── Customers ──────────────────────────────────────────────────────────────
router.get("/customers",      customerCtrl.listCustomers);
router.get("/customers/:id",  customerCtrl.getCustomer);

// ── Reviews ────────────────────────────────────────────────────────────────
router.get("/reviews",                  reviewCtrl.listReviews);
router.post("/reviews/:id/reply",       reviewCtrl.replyToReview);
router.patch("/reviews/:id/hide",       reviewCtrl.toggleHideReview);

// ── Wallet ─────────────────────────────────────────────────────────────────
router.get("/wallet",               walletCtrl.getWallet);
router.get("/wallet/transactions",  walletCtrl.getTransactions);
router.post("/wallet/withdraw",     walletCtrl.requestWithdraw);

module.exports = router;
