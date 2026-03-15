const express = require("express");
const router  = express.Router();
const { verifyToken }      = require("../middlewares/authMiddleware");
const { requireShopOwner } = require("../middlewares/shopMiddleware");
const ctrl = require("../controllers/voucherController");

// ── Public (no auth needed) — MUST come before /:id ──────────────────────────
router.get("/public",   ctrl.listPublicVouchers);

// ── Customer (auth required) ──────────────────────────────────────────────────
router.post("/validate", verifyToken, ctrl.validateVoucherCode);

// ── Shop owner CRUD (auth + approved shop) ────────────────────────────────────
router.get(   "/",           verifyToken, requireShopOwner, ctrl.getAllVouchers);
router.post(  "/",           verifyToken, requireShopOwner, ctrl.createVoucher);
router.get(   "/:id",        verifyToken, requireShopOwner, ctrl.getVoucherById);
router.put(   "/:id",        verifyToken, requireShopOwner, ctrl.updateVoucher);
router.patch( "/:id/toggle", verifyToken, requireShopOwner, ctrl.toggleVoucher);
router.delete("/:id",        verifyToken, requireShopOwner, ctrl.deleteVoucher);

module.exports = router;
