/**
 * checkBanStatus middleware
 *
 * Checks if the authenticated user is currently banned.
 * - Permanent ban -> block all actions (403)
 * - Temporary ban -> block until ban_end, auto-unban if expired
 *
 * Returns bilingual messages (en + vi) so the frontend can display
 * the correct language based on the user's locale preference.
 *
 * Must be placed AFTER verifyToken (needs req.user).
 */

const User = require("../models/User");

async function checkBanStatus(req, res, next) {
  try {
    // Skip if no authenticated user
    if (!req.user) return next();

    const user = req.user;

    // Quick check: not banned at all
    if (!user.is_banned && user.status !== "banned" && user.status !== "suspended" && user.status !== "banned_permanent") {
      return next();
    }

    const banReason = user.ban_reason || null;

    // Permanent ban
    if (user.status === "banned_permanent" || (user.is_banned && user.ban_type === "permanent")) {
      return res.status(403).json({
        message: "Your account has been permanently suspended due to policy violations.",
        message_vi: "Tai khoan cua ban da bi khoa vinh vien do vi pham chinh sach nen tang.",
        ban_type: "permanent",
        ban_reason: banReason,
        is_banned: true,
        code: "ACCOUNT_BANNED_PERMANENT",
      });
    }

    // Temporary ban: check if expired
    const banEnd = user.ban_end || user.ban_until;
    if (banEnd && new Date(banEnd) <= new Date()) {
      // Ban expired -> auto-unban
      await User.findByIdAndUpdate(user._id, {
        status:     "active",
        is_banned:  false,
        ban_type:   null,
        ban_reason: null,
        ban_start:  null,
        ban_end:    null,
        ban_until:  null,
        banned_by:  null,
      });
      // Update req.user for downstream middleware
      req.user.status    = "active";
      req.user.is_banned = false;
      return next();
    }

    // Temporary ban still active
    if (user.is_banned || user.status === "suspended" || user.status === "banned") {
      const endDateISO = banEnd ? new Date(banEnd).toISOString() : null;
      const endDateVI  = banEnd ? new Date(banEnd).toLocaleDateString("vi-VN") : null;
      const endDateEN  = banEnd ? new Date(banEnd).toLocaleDateString("en-US") : null;

      return res.status(403).json({
        message: endDateEN
          ? `Your account is suspended until ${endDateEN}.`
          : "Your account is currently suspended.",
        message_vi: endDateVI
          ? `Tai khoan cua ban bi tam khoa den ngay ${endDateVI}.`
          : "Tai khoan cua ban dang bi tam khoa.",
        ban_type: user.ban_type || "temporary",
        ban_reason: banReason,
        ban_end: endDateISO,
        is_banned: true,
        code: "ACCOUNT_BANNED_TEMPORARY",
      });
    }

    return next();
  } catch (err) {
    console.error("[checkBanStatus] Error:", err.message);
    return next(); // fail-open to avoid blocking legitimate users
  }
}

module.exports = checkBanStatus;
