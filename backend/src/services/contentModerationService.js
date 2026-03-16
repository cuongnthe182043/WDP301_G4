/**
 * contentModerationService.js
 *
 * Vietnamese content moderation — checks text for inappropriate language.
 * No external API required; operates on a local word list.
 *
 * Severity levels:
 *   0 — clean
 *   1 — mild (flag as pending, notify user)
 *   2 — severe (auto-hide, count as violation)
 */

// ─── Word lists ───────────────────────────────────────────────────────────────
// Common Vietnamese profanity / hate speech keywords (normalised, no diacritics).
// We match against a normalised version of the input so accent variants are caught.

const SEVERE = [
  "đụ","đéo","địt","lồn","cặc","buồi","cu","dái","chịch",
  "đcm","vcl","vkl","clgt","đmm","địt mẹ","đụ má",
  "fuck","bitch","shit","cunt","nigger","faggot",
];

const MILD = [
  "ngu","ngốc","óc chó","chó","mẹ mày","con chó","đồ ngu",
  "thằng ngu","con ngu","vô học","mất dạy","khốn nạn",
  "trash","scam","lừa đảo","rác","phế",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Remove Vietnamese diacritics for fuzzy matching.
 */
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^\w\s]/g, " ");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check a text string for inappropriate content.
 *
 * @param {string} text
 * @returns {{ clean: boolean, severity: 0|1|2, matched: string[] }}
 */
function moderate(text) {
  if (!text || typeof text !== "string") return { clean: true, severity: 0, matched: [] };

  const norm    = normalize(text);
  const matched = [];
  let severity  = 0;

  for (const word of SEVERE) {
    if (norm.includes(normalize(word))) {
      matched.push(word);
      severity = 2;
    }
  }

  if (severity < 2) {
    for (const word of MILD) {
      if (norm.includes(normalize(word))) {
        matched.push(word);
        severity = Math.max(severity, 1);
      }
    }
  }

  return { clean: severity === 0, severity, matched: [...new Set(matched)] };
}

/**
 * Record a violation on a user and potentially auto-ban.
 * Returns the updated user.
 *
 * Thresholds:
 *   3 violations → warning notification
 *   5 violations → 7-day temporary ban
 *  10 violations → permanent ban
 */
async function recordViolation(userId, reason, reviewId) {
  const User = require("../models/User");
  const notif = require("./dbNotificationService");

  const user = await User.findById(userId);
  if (!user) return null;

  user.warning_count = (user.warning_count || 0) + 1;
  user.violation_history = user.violation_history || [];
  user.violation_history.push({ reason, review_id: reviewId, at: new Date() });

  const count = user.warning_count;

  if (count >= 10) {
    user.status   = "banned";
    user.ban_until = null; // permanent
    notif.userBanned(userId, "vĩnh viễn").catch(() => {});
  } else if (count >= 5) {
    user.status    = "banned";
    const until    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    user.ban_until = until;
    notif.userBanned(userId, "7 ngày").catch(() => {});
  } else if (count >= 3) {
    notif.userWarned(userId, count).catch(() => {});
  }

  await user.save();
  return user;
}

module.exports = { moderate, recordViolation };
