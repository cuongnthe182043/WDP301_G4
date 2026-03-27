/**
 * violationDetectionService.js
 *
 * Auto-detection rule engine. Scans user behavior and flags violations.
 *
 * Rules:
 * - cancel_after_confirm >= 5 in 7 days → flag (severity 2)
 * - refund_rate > 70% → flag (severity 3)
 * - report_count >= 10 → auto temp ban 24h (severity 2)
 * - shop complaint_rate > 30% → warning
 * - shop complaint_rate > 50% → ban 7 days
 */

const User      = require("../models/User");
const Shop      = require("../models/Shop");
const Order     = require("../models/Order");
const Refund    = require("../models/Refund");
const Report    = require("../models/Report");
const Violation = require("../models/Violation");
const auditLog  = require("./auditLogService");
const notif     = require("./dbNotificationService");
const trustScore = require("./trustScoreService");

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// Rule: Frequent cancellations (>= 5 in 7 days)
// ─────────────────────────────────────────────────────────────────────────────
async function detectFrequentCancellations() {
  const since = new Date(Date.now() - SEVEN_DAYS);
  const results = await Order.aggregate([
    {
      $match: {
        status: { $in: ["cancelled_by_customer", "canceled_by_customer"] },
        updatedAt: { $gte: since },
      },
    },
    { $group: { _id: "$user_id", count: { $sum: 1 } } },
    { $match: { count: { $gte: 5 } } },
  ]);

  const flagged = [];
  for (const { _id: userId, count } of results) {
    // Skip if already flagged recently
    const existing = await Violation.findOne({
      user_id: userId,
      detection_rule: "frequent_cancellation",
      createdAt: { $gte: since },
    }).lean();
    if (existing) continue;

    const user = await User.findById(userId);
    if (!user || user.is_banned) continue;

    await Violation.create({
      user_id:        userId,
      role:           "customer",
      type:           "frequent_cancellation",
      severity:       2,
      description:    `${count} cancellations in the last 7 days`,
      auto_detected:  true,
      detection_rule: "frequent_cancellation",
      detection_data: { count, period: "7d" },
      action_taken:   "warning",
    });

    await trustScore.penalize(userId, 2);
    flagged.push(userId);
  }

  return flagged;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule: High refund rate (> 70%)
// ─────────────────────────────────────────────────────────────────────────────
async function detectRefundAbuse() {
  const users = await User.find({
    status: { $in: ["active", "warning"] },
  }).select("_id").lean();

  const flagged = [];
  for (const { _id: userId } of users) {
    const totalOrders = await Order.countDocuments({ user_id: userId });
    if (totalOrders < 5) continue; // minimum order threshold

    const refunds = await Refund.countDocuments({
      user_id: userId,
      status: { $in: ["approved", "completed"] },
    });

    const rate = Math.round((refunds / totalOrders) * 100);
    if (rate <= 70) continue;

    // Skip if already flagged recently
    const threeMonths = new Date(Date.now() - 90 * 86400000);
    const existing = await Violation.findOne({
      user_id: userId,
      detection_rule: "high_refund_rate",
      createdAt: { $gte: threeMonths },
    }).lean();
    if (existing) continue;

    await Violation.create({
      user_id:        userId,
      role:           "customer",
      type:           "refund_abuse",
      severity:       3,
      description:    `Refund rate ${rate}% (${refunds}/${totalOrders} orders)`,
      auto_detected:  true,
      detection_rule: "high_refund_rate",
      detection_data: { rate, refunds, totalOrders },
    });

    await trustScore.penalize(userId, 3);
    flagged.push(userId);
  }

  return flagged;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule: Excessive reports (>= 10 unresolved reports → auto ban 24h)
// ─────────────────────────────────────────────────────────────────────────────
async function detectExcessiveReports() {
  const results = await Report.aggregate([
    { $match: { status: "pending" } },
    { $group: { _id: "$target_id", count: { $sum: 1 } } },
    { $match: { count: { $gte: 10 } } },
  ]);

  const flagged = [];
  for (const { _id: targetId, count } of results) {
    const user = await User.findById(targetId);
    if (!user || user.is_banned) continue;

    // Check if already auto-banned for this
    const oneDayAgo = new Date(Date.now() - 86400000);
    const existing = await Violation.findOne({
      user_id: targetId,
      detection_rule: "excessive_reports",
      createdAt: { $gte: oneDayAgo },
    }).lean();
    if (existing) continue;

    // Auto temporary ban 24h
    const banEnd = new Date(Date.now() + 86400000);
    user.status    = "suspended";
    user.is_banned = true;
    user.ban_type  = "temporary";
    user.ban_reason = `Auto-ban: ${count} pending reports`;
    user.ban_start = new Date();
    user.ban_end   = banEnd;
    user.ban_until = banEnd;
    user.banned_by = "system";
    await user.save();

    await Violation.create({
      user_id:        targetId,
      role:           "customer",
      type:           "policy_violation",
      severity:       2,
      description:    `Auto-banned: ${count} pending reports`,
      auto_detected:  true,
      detection_rule: "excessive_reports",
      detection_data: { count },
      action_taken:   "temp_ban",
      status:         "confirmed",
    });

    await trustScore.penalize(targetId, 2);
    notif.userBanned(targetId, "1 ngày").catch(() => {});

    auditLog.log({
      actorId: "system", action: "user.auto_ban",
      targetCollection: "users", targetId: String(targetId),
      metadata: { reason: "excessive_reports", report_count: count },
    });

    flagged.push(targetId);
  }

  return flagged;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule: Shop complaint rate
// ─────────────────────────────────────────────────────────────────────────────
async function detectShopComplaints() {
  const shops = await Shop.find({ status: "approved" }).lean();
  const flagged = [];

  for (const shop of shops) {
    const totalOrders = await Order.countDocuments({ shop_id: shop._id });
    if (totalOrders < 10) continue; // minimum threshold

    const complaints = await Report.countDocuments({ target_id: shop.owner_id, target_type: "shop" });
    const rate = Math.round((complaints / totalOrders) * 100);

    // Update shop stats
    await Shop.findByIdAndUpdate(shop._id, { complaint_count: complaints, refund_rate: rate });

    if (rate <= 30) continue;

    // Check existing recent violation
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const existing = await Violation.findOne({
      user_id: shop.owner_id,
      detection_rule: "shop_complaint_rate",
      createdAt: { $gte: thirtyDaysAgo },
    }).lean();
    if (existing) continue;

    const user = await User.findById(shop.owner_id);
    if (!user || user.is_banned) continue;

    if (rate > 50) {
      // Ban 7 days
      const banEnd = new Date(Date.now() + 7 * 86400000);
      user.status    = "suspended";
      user.is_banned = true;
      user.ban_type  = "temporary";
      user.ban_reason = `Shop complaint rate: ${rate}%`;
      user.ban_start = new Date();
      user.ban_end   = banEnd;
      user.ban_until = banEnd;
      user.banned_by = "system";
      await user.save();

      shop.status = "suspended";
      await Shop.findByIdAndUpdate(shop._id, { status: "suspended" });

      await Violation.create({
        user_id:        shop.owner_id,
        role:           "shop",
        type:           "high_complaint_rate",
        severity:       3,
        description:    `Shop complaint rate ${rate}% (>${50}% threshold)`,
        auto_detected:  true,
        detection_rule: "shop_complaint_rate",
        detection_data: { rate, complaints, totalOrders },
        action_taken:   "temp_ban",
        status:         "confirmed",
      });

      await trustScore.penalize(shop.owner_id, 3);
      notif.userBanned(shop.owner_id, "7 ngày").catch(() => {});
    } else {
      // Warning (rate > 30%)
      user.status = "warning";
      user.warning_count = (user.warning_count || 0) + 1;
      await user.save();

      await Violation.create({
        user_id:        shop.owner_id,
        role:           "shop",
        type:           "high_complaint_rate",
        severity:       2,
        description:    `Shop complaint rate ${rate}% (>${30}% threshold)`,
        auto_detected:  true,
        detection_rule: "shop_complaint_rate",
        detection_data: { rate, complaints, totalOrders },
        action_taken:   "warning",
      });

      await trustScore.penalize(shop.owner_id, 2);
      notif.userWarned(shop.owner_id, user.warning_count).catch(() => {});
    }

    flagged.push(shop.owner_id);
  }

  return flagged;
}

// ─────────────────────────────────────────────────────────────────────────────
// Run all detection rules
// ─────────────────────────────────────────────────────────────────────────────
async function runAllDetections() {
  console.log("[ViolationDetection] Running all detection rules...");
  const results = {};

  try {
    results.frequent_cancellations = await detectFrequentCancellations();
  } catch (e) { console.error("[ViolationDetection] frequent_cancellations error:", e.message); }

  try {
    results.refund_abuse = await detectRefundAbuse();
  } catch (e) { console.error("[ViolationDetection] refund_abuse error:", e.message); }

  try {
    results.excessive_reports = await detectExcessiveReports();
  } catch (e) { console.error("[ViolationDetection] excessive_reports error:", e.message); }

  try {
    results.shop_complaints = await detectShopComplaints();
  } catch (e) { console.error("[ViolationDetection] shop_complaints error:", e.message); }

  const totalFlagged = Object.values(results).reduce((s, arr) => s + (arr?.length || 0), 0);
  console.log(`[ViolationDetection] Done. ${totalFlagged} users flagged.`);
  return results;
}

module.exports = {
  detectFrequentCancellations,
  detectRefundAbuse,
  detectExcessiveReports,
  detectShopComplaints,
  runAllDetections,
};
