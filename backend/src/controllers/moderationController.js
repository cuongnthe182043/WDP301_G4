/**
 * moderationController.js
 *
 * Admin moderation endpoints: users, violations, reports, appeals, dashboard.
 */

const moderation = require("../services/moderationService");
const detection  = require("../services/violationDetectionService");
const auditLog   = require("../services/auditLogService");

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard stats
// ─────────────────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const stats = await moderation.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────
exports.listUsers = async (req, res, next) => {
  try {
    const data = await moderation.listUsers(req.query);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

exports.getUserDetail = async (req, res, next) => {
  try {
    const data = await moderation.getUserModerationDetail(req.params.id);
    if (!data) return res.status(404).json({ message: "User not found" });
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

exports.banUser = async (req, res, next) => {
  try {
    const { days, reason, severity } = req.body || {};
    const data = await moderation.banUser(req.params.id, {
      days,
      reason,
      adminId: req.user._id,
      severity: severity || (days ? 2 : 4),
    });

    await auditLog.log({
      actorId: req.user._id, action: "moderation.ban",
      targetCollection: "users", targetId: req.params.id,
      ip: auditLog.getIp(req), userAgent: auditLog.getUA(req),
      metadata: { days, reason, severity },
    });

    res.json({ success: true, data });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
};

exports.unbanUser = async (req, res, next) => {
  try {
    const data = await moderation.unbanUser(req.params.id, req.user._id);

    await auditLog.log({
      actorId: req.user._id, action: "moderation.unban",
      targetCollection: "users", targetId: req.params.id,
      ip: auditLog.getIp(req), userAgent: auditLog.getUA(req),
    });

    res.json({ success: true, data });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
};

exports.warnUser = async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const data = await moderation.warnUser(req.params.id, {
      reason,
      adminId: req.user._id,
    });

    await auditLog.log({
      actorId: req.user._id, action: "moderation.warn",
      targetCollection: "users", targetId: req.params.id,
      ip: auditLog.getIp(req), userAgent: auditLog.getUA(req),
      metadata: { reason },
    });

    res.json({ success: true, data });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Violations
// ─────────────────────────────────────────────────────────────────────────────
exports.listViolations = async (req, res, next) => {
  try {
    const data = await moderation.listViolations(req.query);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

exports.reviewViolation = async (req, res, next) => {
  try {
    const { status, action_taken } = req.body || {};
    if (!status) return res.status(400).json({ message: "status is required" });

    const data = await moderation.reviewViolation(req.params.id, {
      adminId: req.user._id,
      status,
      action_taken,
    });

    await auditLog.log({
      actorId: req.user._id, action: "moderation.review_violation",
      targetCollection: "violations", targetId: req.params.id,
      ip: auditLog.getIp(req), userAgent: auditLog.getUA(req),
      metadata: { status, action_taken },
    });

    res.json({ success: true, data });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────────────────────
exports.listReports = async (req, res, next) => {
  try {
    const data = await moderation.listReports(req.query);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

exports.resolveReport = async (req, res, next) => {
  try {
    const { status, resolution_note } = req.body || {};
    if (!status || !["resolved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be 'resolved' or 'rejected'" });
    }

    const data = await moderation.resolveReport(req.params.id, {
      adminId: req.user._id,
      status,
      resolution_note,
    });

    await auditLog.log({
      actorId: req.user._id, action: "moderation.resolve_report",
      targetCollection: "reports", targetId: req.params.id,
      ip: auditLog.getIp(req), userAgent: auditLog.getUA(req),
      metadata: { status, resolution_note },
    });

    res.json({ success: true, data });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Appeals
// ─────────────────────────────────────────────────────────────────────────────
exports.listAppeals = async (req, res, next) => {
  try {
    const data = await moderation.listAppeals(req.query);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

exports.reviewAppeal = async (req, res, next) => {
  try {
    const { status, admin_note } = req.body || {};
    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
    }

    const data = await moderation.reviewAppeal(req.params.id, {
      adminId: req.user._id,
      status,
      admin_note,
    });

    await auditLog.log({
      actorId: req.user._id, action: "moderation.review_appeal",
      targetCollection: "appeals", targetId: req.params.id,
      ip: auditLog.getIp(req), userAgent: auditLog.getUA(req),
      metadata: { status, admin_note },
    });

    res.json({ success: true, data });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Manual trigger: run violation detection
// ─────────────────────────────────────────────────────────────────────────────
exports.runDetection = async (req, res, next) => {
  try {
    const results = await detection.runAllDetections();

    await auditLog.log({
      actorId: req.user._id, action: "moderation.run_detection",
      ip: auditLog.getIp(req), userAgent: auditLog.getUA(req),
      metadata: { results },
    });

    res.json({ success: true, data: results });
  } catch (e) { next(e); }
};
