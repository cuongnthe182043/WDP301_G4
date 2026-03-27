const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const { requireShopOwner } = require("../middlewares/shopMiddleware");

const shopCtrl    = require("../controllers/shopController");
const orderCtrl = require("../controllers/shopOrderController");
const refundCtrl = require("../controllers/shopRefundController");
const customerCtrl = require("../controllers/shopCustomerController");
const reviewCtrl = require("../controllers/shopReviewController");
const walletCtrl = require("../controllers/shopWalletController");
const marketingRoutes = require("./shopMarketingRoutes");
const flashCtrl = require("../controllers/flashsaleController");

const router = express.Router();

// All shop routes require auth + role + approved shop
router.use(verifyToken, ...requireAnyRole("shop_owner", "sales", "system_admin"), requireShopOwner);

// ── Legacy analytics (kept for backward compat) ────────────────────────────
router.get("/analytics", shopCtrl.getAnalytics);

// ── Inventory ───────────────────────────────────────────────────────────────
router.get("/inventory/low-stock", shopCtrl.getLowStock);

// ── GHN pickup address ──────────────────────────────────────────────────────
router.get("/pickup-address",    shopCtrl.getPickupAddress);
router.put("/pickup-address",    shopCtrl.updatePickupAddress);

// ── GHN location data (province / district / ward) ─────────────────────────
router.get("/ghn/provinces", shopCtrl.ghnProvinces);
router.get("/ghn/districts",  shopCtrl.ghnDistricts);
router.get("/ghn/wards",      shopCtrl.ghnWards);

// ── Orders ─────────────────────────────────────────────────────────────────
router.get("/orders", orderCtrl.listOrders);
router.get("/orders/:id", orderCtrl.getOrder);
router.post("/orders/:id/confirm", orderCtrl.confirmOrder);
router.post("/orders/:id/cancel", orderCtrl.cancelOrder);
router.post("/orders/:id/ghn",            orderCtrl.pushToGhn);
router.post("/orders/:id/dev-reset-ghn", orderCtrl.devResetForGhn);
router.post("/orders/:id/sync-ghn",      orderCtrl.syncFromGhn);
router.get("/orders/:id/track",          orderCtrl.trackOrder);
router.put("/orders/:id/status",         orderCtrl.updateOrderStatus);

// ── Refunds ────────────────────────────────────────────────────────────────
router.get("/refunds", refundCtrl.listRefunds);
router.get("/refunds/:id", refundCtrl.getRefund);
router.post("/refunds/:id/approve", refundCtrl.approveRefund);
router.post("/refunds/:id/reject", refundCtrl.rejectRefund);
router.post("/refunds/:id/complete", refundCtrl.completeRefund);

// ── Customers ──────────────────────────────────────────────────────────────
router.get("/customers", customerCtrl.listCustomers);
router.get("/customers/:id", customerCtrl.getCustomer);

// ── Reviews ────────────────────────────────────────────────────────────────
router.get("/reviews", reviewCtrl.listReviews);
router.post("/reviews/:id/reply", reviewCtrl.replyToReview);

// ── Wallet ─────────────────────────────────────────────────────────────────
router.get("/wallet", walletCtrl.getWallet);
router.get("/wallet/transactions", walletCtrl.getTransactions);
router.post("/wallet/withdraw", walletCtrl.requestWithdraw);

// ── Shop products listing (for shop owner UI) ───────────────────────────────
router.get("/products", shopCtrl.getShopProducts);

// ── Flash Sales ─────────────────────────────────────────────────────────────
router.get("/flashsales",              flashCtrl.shopList);
router.get("/flashsales/:id",          flashCtrl.shopGet);
router.post("/flashsales",             flashCtrl.shopCreate);
router.put("/flashsales/:id",          flashCtrl.shopUpdate);
router.patch("/flashsales/:id/status", flashCtrl.shopUpdateStatus);
router.delete("/flashsales/:id",       flashCtrl.shopDelete);

// ── Marketing (campaigns, voucher distribution, credits) ───────────────────
router.use("/marketing", marketingRoutes);

module.exports = router;
