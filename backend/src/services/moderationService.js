/**
 * moderationService.js
 *
 * Core moderation logic: ban, unban, warn, create violations, resolve reports.
 */

const User       = require("../models/User");
const Shop       = require("../models/Shop");
const Violation  = require("../models/Violation");
const Report     = require("../models/Report");
const Appeal     = require("../models/Appeal");
const Order      = require("../models/Order");
const Refund     = require("../models/Refund");
const Review     = require("../models/Review");
const auditLog   = require("./auditLogService");
const notif      = require("./dbNotificationService");
const trustScore = require("./trustScoreService");

// ── Helpers ───────────────────────────────────────────────────────────────────
function err(msg, status = 400) {
  return Object.assign(new Error(msg), { status });
}

const VALID_BAN_DAYS_MIN = 1;
const VALID_BAN_DAYS_MAX = 365;

// ─────────────────────────────────────────────────────────────────────────────
// Ban user
// ─────────────────────────────────────────────────────────────────────────────
async function banUser(targetId, { days, reason, adminId, severity = 3 }) {
  // ── Validation ──────────────────────────────────────────────────────────
  if (!reason || !reason.trim()) throw err("Ban reason is required");
  if (targetId === adminId) throw err("Cannot ban yourself");

  const user = await User.findById(targetId);
  if (!user) throw err("User not found", 404);

  // Prevent banning system_admin accounts
  const Role = require("../models/Role");
  const role = await Role.findById(user.role_id).lean();
  if (role && role.name === "system_admin") throw err("Cannot ban a system admin");

  // Prevent invalid transitions
  if (user.status === "banned_permanent") throw err("User is already permanently banned");

  const isPermanent = !days;
  if (!isPermanent) {
    const numDays = Number(days);
    if (!Number.isFinite(numDays) || numDays < VALID_BAN_DAYS_MIN || numDays > VALID_BAN_DAYS_MAX) {
      throw err(`Temporary ban duration must be between ${VALID_BAN_DAYS_MIN} and ${VALID_BAN_DAYS_MAX} days`);
    }
  }

  const banEnd = isPermanent ? null : new Date(Date.now() + Number(days) * 86400000);

  user.status    = isPermanent ? "banned_permanent" : "suspended";
  user.is_banned = true;
  user.ban_type  = isPermanent ? "permanent" : "temporary";
  user.ban_reason = reason || "Violation of platform policy";
  user.ban_start = new Date();
  user.ban_end   = banEnd;
  user.ban_until = banEnd;
  user.banned_by = adminId;

  user.violation_history = user.violation_history || [];
  user.violation_history.push({
    reason: `Admin ban: ${reason || "Policy violation"}`,
    severity,
    at: new Date(),
  });

  await user.save();

  // Also suspend shop if shop_owner
  const shop = await Shop.findOne({ owner_id: targetId });
  if (shop && shop.status !== "suspended") {
    shop.status = "suspended";
    await shop.save();
  }

  // Create violation record
  await Violation.create({
    user_id:     targetId,
    role:        shop ? "shop" : "customer",
    type:        "policy_violation",
    severity,
    description: reason || "Admin manual ban",
    action_taken: isPermanent ? "perm_ban" : "temp_ban",
    reviewed_by: adminId,
    reviewed_at: new Date(),
    status:      "confirmed",
  });

  // Reduce trust score
  await trustScore.penalize(targetId, severity);

  const duration = isPermanent
    ? "vinh vien / permanently"
    : `${days} ngay / ${days} day(s)`;
  notif.userBanned(targetId, duration).catch(() => {});

  return { status: user.status, ban_type: user.ban_type, ban_end: user.ban_end };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unban user
// ─────────────────────────────────────────────────────────────────────────────
async function unbanUser(targetId, adminId) {
  const user = await User.findById(targetId);
  if (!user) throw err("User not found", 404);

  if (!user.is_banned && user.status !== "banned" && user.status !== "suspended" && user.status !== "banned_permanent") {
    throw err("User is not currently banned");
  }

  user.status    = "active";
  user.is_banned = false;
  user.ban_type  = null;
  user.ban_reason = null;
  user.ban_start = null;
  user.ban_end   = null;
  user.ban_until = null;
  user.banned_by = null;
  await user.save();

  // Reactivate shop if exists
  const shop = await Shop.findOne({ owner_id: targetId });
  if (shop && shop.status === "suspended") {
    shop.status = "approved";
    await shop.save();
  }

  notif.userUnbanned(targetId).catch(() => {});

  return { status: user.status };
}

// ─────────────────────────────────────────────────────────────────────────────
// Warn user
// ─────────────────────────────────────────────────────────────────────────────
async function warnUser(targetId, { reason, adminId }) {
  if (!reason || !reason.trim()) throw err("Warning reason is required");
  if (targetId === adminId) throw err("Cannot warn yourself");

  const user = await User.findById(targetId);
  if (!user) throw err("User not found", 404);

  // Cannot warn permanently banned users
  if (user.status === "banned_permanent") throw err("Cannot warn a permanently banned user");

  user.warning_count = (user.warning_count || 0) + 1;
  if (user.status === "active") user.status = "warning";

  user.violation_history = user.violation_history || [];
  user.violation_history.push({
    reason: `Admin warn: ${reason || "Content violation"}`,
    severity: 1,
    at: new Date(),
  });
  await user.save();

  await trustScore.penalize(targetId, 1);

  const shop = await Shop.findOne({ owner_id: targetId }).lean();
  await Violation.create({
    user_id:     targetId,
    role:        shop ? "shop" : "customer",
    type:        "policy_violation",
    severity:    1,
    description: reason || "Admin warning",
    action_taken: "warning",
    reviewed_by: adminId,
    reviewed_at: new Date(),
    status:      "confirmed",
  });

  notif.userWarned(targetId, user.warning_count).catch(() => {});

  return { warning_count: user.warning_count, trust_score: user.trust_score ?? 80 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Get user moderation detail (stats, violations, orders, etc.)
// ─────────────────────────────────────────────────────────────────────────────
async function getUserModerationDetail(userId) {
  const user = await User.findById(userId)
    .populate("role_id", "name permissions")
    .select("-password_hash -refresh_token")
    .lean();
  if (!user) return null;

  const shop = await Shop.findOne({ owner_id: userId }).lean();

  // Parallel stats
  const [
    totalOrders,
    cancelledOrders,
    totalRefunds,
    approvedRefunds,
    violations,
    pendingReports,
    totalReports,
    reviews,
    appeals,
  ] = await Promise.all([
    Order.countDocuments({ user_id: userId }),
    Order.countDocuments({
      user_id: userId,
      status: { $in: ["cancelled_by_customer", "canceled_by_customer"] },
    }),
    Refund.countDocuments({ user_id: userId }),
    Refund.countDocuments({ user_id: userId, status: { $in: ["approved", "completed"] } }),
    Violation.find({ user_id: userId }).sort({ createdAt: -1 }).limit(50).lean(),
    Report.countDocuments({ target_id: userId, status: "pending" }),
    Report.countDocuments({ target_id: userId }),
    Review.countDocuments({ user_id: userId }),
    Appeal.find({ user_id: userId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  // Recent cancellations in last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const recentCancellations = await Order.countDocuments({
    user_id: userId,
    status: { $in: ["cancelled_by_customer", "canceled_by_customer"] },
    updatedAt: { $gte: sevenDaysAgo },
  });

  const cancelRate  = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0;
  const refundRate  = totalOrders > 0 ? Math.round((approvedRefunds / totalOrders) * 100) : 0;

  // Shop-specific stats
  let shopStats = null;
  if (shop) {
    const [shopOrders, shopComplaints, shopRefunds] = await Promise.all([
      Order.countDocuments({ shop_id: shop._id }),
      Report.countDocuments({ target_id: shop.owner_id, target_type: "shop" }),
      Refund.countDocuments({
        order_id: { $in: (await Order.find({ shop_id: shop._id }).select("_id").lean()).map(o => o._id) },
        status: { $in: ["approved", "completed"] },
      }),
    ]);
    const complaintRate = shopOrders > 0 ? Math.round((shopComplaints / shopOrders) * 100) : 0;
    const shopRefundRate = shopOrders > 0 ? Math.round((shopRefunds / shopOrders) * 100) : 0;

    shopStats = {
      ...shop,
      total_orders: shopOrders,
      complaint_count: shopComplaints,
      complaint_rate: complaintRate,
      refund_rate: shopRefundRate,
    };
  }

  return {
    ...user,
    shop: shopStats,
    stats: {
      total_orders: totalOrders,
      cancelled_orders: cancelledOrders,
      cancel_rate: cancelRate,
      recent_cancellations_7d: recentCancellations,
      total_refunds: totalRefunds,
      approved_refunds: approvedRefunds,
      refund_rate: refundRate,
      total_reports: totalReports,
      pending_reports: pendingReports,
      total_reviews: reviews,
    },
    violations,
    appeals,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// List users with moderation filters
// ─────────────────────────────────────────────────────────────────────────────
async function listUsers({ q, status, role, sort_by, page = 1, limit = 20 }) {
  const filter = {};

  if (q) {
    filter.$or = [
      { name:     { $regex: q, $options: "i" } },
      { email:    { $regex: q, $options: "i" } },
      { username: { $regex: q, $options: "i" } },
      { phone:    { $regex: q, $options: "i" } },
    ];
  }

  // Filter by moderation status groups
  if (status === "banned") {
    filter.$or = [
      { status: "suspended" },
      { status: "banned_permanent" },
      { status: "banned" },          // legacy
      { is_banned: true },
    ];
    // override any q-based $or
    if (q) {
      filter.$and = [
        { $or: [
          { name:     { $regex: q, $options: "i" } },
          { email:    { $regex: q, $options: "i" } },
          { username: { $regex: q, $options: "i" } },
        ]},
        { $or: [
          { status: "suspended" },
          { status: "banned_permanent" },
          { status: "banned" },
          { is_banned: true },
        ]},
      ];
      delete filter.$or;
    }
  } else if (status === "warning") {
    filter.status = "warning";
  } else if (status === "active") {
    filter.status = "active";
  } else if (status) {
    filter.status = status;
  }

  if (role) {
    const Role = require("../models/Role");
    const roleDoc = await Role.findOne({ name: role }).lean();
    if (roleDoc) filter.role_id = roleDoc._id;
  }

  let sortObj = { createdAt: -1 };
  if (sort_by === "trust_score_asc") sortObj = { trust_score: 1 };
  if (sort_by === "trust_score_desc") sortObj = { trust_score: -1 };
  if (sort_by === "warnings") sortObj = { warning_count: -1 };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    User.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .populate("role_id", "name")
      .select("-password_hash -refresh_token -wishlist -recently_viewed -preferences")
      .lean(),
    User.countDocuments(filter),
  ]);

  return { items, total, page: Number(page), limit: Number(limit) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reports CRUD
// ─────────────────────────────────────────────────────────────────────────────
async function createReport({ reporter_id, target_id, target_type, reason, description, evidence_urls }) {
  return Report.create({ reporter_id, target_id, target_type, reason, description, evidence_urls });
}

async function listReports({ status, page = 1, limit = 20 }) {
  const filter = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("reporter_id", "name email avatar_url")
      .populate("target_id", "name email avatar_url status trust_score")
      .lean(),
    Report.countDocuments(filter),
  ]);
  return { items, total, page: Number(page), limit: Number(limit) };
}

async function resolveReport(reportId, { adminId, status, resolution_note }) {
  const report = await Report.findById(reportId);
  if (!report) throw Object.assign(new Error("Report not found"), { status: 404 });

  report.status = status; // "resolved" or "rejected"
  report.resolved_by = adminId;
  report.resolved_at = new Date();
  report.resolution_note = resolution_note || "";
  await report.save();
  return report;
}

// ─────────────────────────────────────────────────────────────────────────────
// Violations
// ─────────────────────────────────────────────────────────────────────────────
async function listViolations({ user_id, status, type, page = 1, limit = 20 }) {
  const filter = {};
  if (user_id) filter.user_id = user_id;
  if (status) filter.status = status;
  if (type) filter.type = type;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Violation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("user_id", "name email avatar_url status trust_score")
      .lean(),
    Violation.countDocuments(filter),
  ]);
  return { items, total, page: Number(page), limit: Number(limit) };
}

async function reviewViolation(violationId, { adminId, status, action_taken }) {
  const violation = await Violation.findById(violationId);
  if (!violation) throw Object.assign(new Error("Violation not found"), { status: 404 });

  violation.status = status;
  violation.reviewed_by = adminId;
  violation.reviewed_at = new Date();
  if (action_taken) violation.action_taken = action_taken;
  await violation.save();
  return violation;
}

// ─────────────────────────────────────────────────────────────────────────────
// Appeals
// ─────────────────────────────────────────────────────────────────────────────
async function createAppeal({ user_id, reason, evidence_urls }) {
  // Only banned users can appeal
  const user = await User.findById(user_id).lean();
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  if (!user.is_banned && user.status !== "suspended" && user.status !== "banned_permanent" && user.status !== "banned") {
    throw Object.assign(new Error("Only banned users can submit appeals"), { status: 400 });
  }
  // Check for existing pending appeal
  const existing = await Appeal.findOne({ user_id, status: "pending" }).lean();
  if (existing) throw Object.assign(new Error("You already have a pending appeal"), { status: 400 });

  return Appeal.create({ user_id, reason, evidence_urls });
}

async function listAppeals({ status, page = 1, limit = 20 }) {
  const filter = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Appeal.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("user_id", "name email avatar_url status trust_score ban_reason ban_end")
      .lean(),
    Appeal.countDocuments(filter),
  ]);
  return { items, total, page: Number(page), limit: Number(limit) };
}

async function reviewAppeal(appealId, { adminId, status, admin_note }) {
  const appeal = await Appeal.findById(appealId);
  if (!appeal) throw Object.assign(new Error("Appeal not found"), { status: 404 });

  appeal.status = status;
  appeal.reviewed_by = adminId;
  appeal.reviewed_at = new Date();
  appeal.admin_note = admin_note || "";
  await appeal.save();

  // If approved, unban the user
  if (status === "approved") {
    await unbanUser(appeal.user_id, adminId);
    auditLog.log({
      actorId: adminId, action: "user.appeal_approved",
      targetCollection: "users", targetId: String(appeal.user_id),
      metadata: { appeal_id: appealId, admin_note },
    });
  }

  return appeal;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard stats
// ─────────────────────────────────────────────────────────────────────────────
async function getDashboardStats() {
  const [
    totalUsers,
    activeUsers,
    bannedUsers,
    warningUsers,
    pendingReports,
    pendingViolations,
    pendingAppeals,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: "active" }),
    User.countDocuments({ is_banned: true }),
    User.countDocuments({ status: "warning" }),
    Report.countDocuments({ status: "pending" }),
    Violation.countDocuments({ status: "pending" }),
    Appeal.countDocuments({ status: "pending" }),
  ]);

  return {
    totalUsers,
    activeUsers,
    bannedUsers,
    warningUsers,
    pendingReports,
    pendingViolations,
    pendingAppeals,
  };
}

module.exports = {
  banUser,
  unbanUser,
  warnUser,
  getUserModerationDetail,
  listUsers,
  createReport,
  listReports,
  resolveReport,
  listViolations,
  reviewViolation,
  createAppeal,
  listAppeals,
  reviewAppeal,
  getDashboardStats,
};
