const express = require("express");
const router  = express.Router();
const { verifyToken }      = require("../middlewares/authMiddleware");
const { requireAnyRole }   = require("../middlewares/rbacMiddleware");
const ctrl                 = require("../controllers/adminReviewController");

const isAdmin = [verifyToken, ...requireAnyRole("system_admin")];

// ── Flagged reviews ──────────────────────────────────────────────────────────
router.get("/reviews",                isAdmin, ctrl.listReviews);
router.patch("/reviews/:id/approve",  isAdmin, ctrl.approveReview);
router.patch("/reviews/:id/hide",     isAdmin, ctrl.toggleHideReview);
router.patch("/reviews/:id/delete",   isAdmin, ctrl.deleteReview);

// ── User violations & bans ───────────────────────────────────────────────────
router.get("/users",               isAdmin, ctrl.listViolationUsers);
router.post("/users/:id/warn",     isAdmin, ctrl.warnUser);
router.post("/users/:id/ban",      isAdmin, ctrl.banUser);
router.post("/users/:id/unban",    isAdmin, ctrl.unbanUser);

module.exports = router;
