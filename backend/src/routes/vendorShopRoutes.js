const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const ctrl = require("../controllers/multivendorShopController");

const router = express.Router();

// ─── Public routes ────────────────────────────────────────────────────────────
router.get("/slug/:slug", ctrl.getShopBySlug);
router.get("/slug/:slug/products", ctrl.getShopProducts);

// ─── Authenticated — any logged-in user can register / view own shop ──────────
router.use(verifyToken);
router.post("/register", ctrl.registerShop);
router.get("/my", ctrl.getMyShop);
router.put("/my", ctrl.updateMyShop);

// ─── Admin routes ─────────────────────────────────────────────────────────────
router.get("/admin/list", ...requireAnyRole("system_admin"), ctrl.adminListShops);
router.get("/admin/:id/stats", ...requireAnyRole("system_admin"), ctrl.adminGetShopStats);
router.patch("/admin/:id/approve", ...requireAnyRole("system_admin"), ctrl.adminApproveShop);
router.patch("/admin/:id/suspend", ...requireAnyRole("system_admin"), ctrl.adminSuspendShop);
router.patch("/admin/:id/reject", ...requireAnyRole("system_admin"), ctrl.adminRejectShop);

module.exports = router;
