const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/shopMarketingController");

// All routes here are already protected by shopRoutes middleware (verifyToken + requireShopOwner)

// ── Campaigns ─────────────────────────────────────────────────────────────────
router.get( "/campaigns",                      ctrl.listCampaigns);
router.post("/campaigns",                      ctrl.createCampaign);

// ── Voucher distribution ──────────────────────────────────────────────────────
router.post("/vouchers/:voucherId/distribute", ctrl.distributeVoucher);

// ── Shop credits ──────────────────────────────────────────────────────────────
router.get( "/credits",                        ctrl.listShopCredits);
router.post("/credits/give",                   ctrl.giveCredits);
router.get( "/credits/customer/:userId",       ctrl.getCustomerCredit);

module.exports = router;
