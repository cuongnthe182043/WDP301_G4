/**
 * moderationRoutes.js
 *
 * Admin moderation endpoints: /api/admin/moderation/*
 */

const express = require("express");
const router  = express.Router();
const { verifyToken }    = require("../middlewares/authMiddleware");
const { requireAnyRole } = require("../middlewares/rbacMiddleware");
const ctrl               = require("../controllers/moderationController");

const isAdmin = [verifyToken, ...requireAnyRole("system_admin")];

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get("/dashboard", isAdmin, ctrl.getDashboard);

// ── Users ────────────────────────────────────────────────────────────────────
router.get("/users",              isAdmin, ctrl.listUsers);
router.get("/users/:id",          isAdmin, ctrl.getUserDetail);
router.post("/users/:id/ban",     isAdmin, ctrl.banUser);
router.post("/users/:id/unban",   isAdmin, ctrl.unbanUser);
router.post("/users/:id/warn",    isAdmin, ctrl.warnUser);

// ── Violations ───────────────────────────────────────────────────────────────
router.get("/violations",           isAdmin, ctrl.listViolations);
router.patch("/violations/:id",     isAdmin, ctrl.reviewViolation);

// ── Reports ──────────────────────────────────────────────────────────────────
router.get("/reports",              isAdmin, ctrl.listReports);
router.patch("/reports/:id",        isAdmin, ctrl.resolveReport);

// ── Appeals ──────────────────────────────────────────────────────────────────
router.get("/appeals",              isAdmin, ctrl.listAppeals);
router.patch("/appeals/:id",        isAdmin, ctrl.reviewAppeal);

// ── Manual Detection ─────────────────────────────────────────────────────────
router.post("/run-detection",       isAdmin, ctrl.runDetection);

module.exports = router;
