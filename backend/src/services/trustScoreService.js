/**
 * trustScoreService.js
 *
 * Manages user trust scores (0–100).
 * - Good behavior → increase
 * - Violations → decrease
 * - Triggers auto-warning / auto-ban based on thresholds
 */

const User      = require("../models/User");
const Violation = require("../models/Violation");
const notif     = require("./dbNotificationService");
const auditLog  = require("./auditLogService");

// ── Score deltas by severity ─────────────────────────────────────────────────
const SEVERITY_PENALTY = {
  1: -5,   // minor
  2: -15,  // moderate
  3: -25,  // serious
  4: -40,  // critical
};

const GOOD_BEHAVIOR_BONUS = {
  order_completed: 2,
  positive_review: 1,
  on_time_delivery: 1,   // for shops
  monthly_clean: 5,       // no violations in 30 days
};

// ── Thresholds ───────────────────────────────────────────────────────────────
const WARNING_THRESHOLD  = 40;
const AUTO_BAN_THRESHOLD = 20;
const AUTO_BAN_DAYS      = 7;

/**
 * Reduce trust score after a violation.
 * Returns the updated user doc.
 */
async function penalize(userId, severity) {
  const delta = SEVERITY_PENALTY[severity] || -10;
  const user = await User.findById(userId);
  if (!user) return null;

  const oldScore = user.trust_score ?? 80;
  user.trust_score = Math.max(0, oldScore + delta);
  await user.save();

  // Auto-actions based on new score
  await checkThresholds(user);

  return user;
}

/**
 * Reward trust score for good behavior.
 */
async function reward(userId, behaviorType) {
  const delta = GOOD_BEHAVIOR_BONUS[behaviorType] || 1;
  const user = await User.findById(userId);
  if (!user) return null;

  user.trust_score = Math.min(100, (user.trust_score ?? 80) + delta);

  // If user was in warning state and score recovered above threshold, restore active
  if (user.status === "warning" && user.trust_score >= WARNING_THRESHOLD) {
    user.status = "active";
  }

  await user.save();
  return user;
}

/**
 * Check trust score thresholds and apply auto-actions.
 */
async function checkThresholds(user) {
  if (!user || user.is_banned) return;

  const score = user.trust_score ?? 80;

  if (score < AUTO_BAN_THRESHOLD && user.status !== "suspended" && user.status !== "banned_permanent") {
    // Auto temporary ban
    const banEnd = new Date(Date.now() + AUTO_BAN_DAYS * 86400000);
    user.status    = "suspended";
    user.is_banned = true;
    user.ban_type  = "temporary";
    user.ban_reason = `Auto-ban: trust score dropped to ${score}`;
    user.ban_start = new Date();
    user.ban_end   = banEnd;
    user.ban_until = banEnd;
    user.banned_by = "system";
    await user.save();

    // Create violation record
    await Violation.create({
      user_id:        user._id,
      role:           "customer",
      type:           "policy_violation",
      severity:       3,
      description:    `Auto-ban triggered: trust score ${score} < ${AUTO_BAN_THRESHOLD}`,
      auto_detected:  true,
      detection_rule: "trust_score_auto_ban",
      action_taken:   "temp_ban",
      status:         "confirmed",
    });

    notif.userBanned(user._id, `${AUTO_BAN_DAYS} ngày`).catch(() => {});

    auditLog.log({
      actorId: "system", action: "user.auto_ban",
      targetCollection: "users", targetId: String(user._id),
      metadata: { reason: "trust_score_below_threshold", score, threshold: AUTO_BAN_THRESHOLD },
    });

  } else if (score < WARNING_THRESHOLD && user.status === "active") {
    // Auto warning
    user.status = "warning";
    user.warning_count = (user.warning_count || 0) + 1;
    await user.save();

    await Violation.create({
      user_id:        user._id,
      role:           "customer",
      type:           "policy_violation",
      severity:       1,
      description:    `Auto-warning: trust score ${score} < ${WARNING_THRESHOLD}`,
      auto_detected:  true,
      detection_rule: "trust_score_auto_warning",
      action_taken:   "warning",
      status:         "confirmed",
    });

    notif.userWarned(user._id, user.warning_count).catch(() => {});

    auditLog.log({
      actorId: "system", action: "user.auto_warn",
      targetCollection: "users", targetId: String(user._id),
      metadata: { reason: "trust_score_below_warning", score, threshold: WARNING_THRESHOLD },
    });
  }
}

/**
 * Get trust score for a user.
 */
async function getScore(userId) {
  const user = await User.findById(userId).select("trust_score").lean();
  return user?.trust_score ?? 80;
}

module.exports = {
  penalize,
  reward,
  checkThresholds,
  getScore,
  SEVERITY_PENALTY,
  GOOD_BEHAVIOR_BONUS,
  WARNING_THRESHOLD,
  AUTO_BAN_THRESHOLD,
};
