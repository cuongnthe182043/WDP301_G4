/**
 * reportController.js
 *
 * User-facing endpoints: submit reports, submit appeals, check ban status.
 */

const moderation = require("../services/moderationService");
const User       = require("../models/User");

// ─── Submit a report ─────────────────────────────────────────────────────────
exports.submitReport = async (req, res, next) => {
  try {
    const { target_id, target_type, reason, description, evidence_urls } = req.body;
    if (!target_id || !reason) {
      return res.status(400).json({ message: "target_id and reason are required" });
    }
    if (target_id === req.user._id) {
      return res.status(400).json({ message: "Cannot report yourself" });
    }

    const report = await moderation.createReport({
      reporter_id: req.user._id,
      target_id,
      target_type: target_type || "user",
      reason,
      description,
      evidence_urls,
    });

    res.status(201).json({ success: true, data: report });
  } catch (e) { next(e); }
};

// ─── Submit an appeal (for banned users) ─────────────────────────────────────
exports.submitAppeal = async (req, res, next) => {
  try {
    const { reason, evidence_urls } = req.body;
    if (!reason) {
      return res.status(400).json({ message: "reason is required" });
    }

    const appeal = await moderation.createAppeal({
      user_id: req.user._id,
      reason,
      evidence_urls,
    });

    res.status(201).json({ success: true, data: appeal });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ message: e.message });
    next(e);
  }
};

// ─── Check own ban status ────────────────────────────────────────────────────
exports.getBanStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select("status is_banned ban_type ban_reason ban_start ban_end trust_score warning_count")
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      success: true,
      data: {
        status:       user.status,
        is_banned:    user.is_banned || false,
        ban_type:     user.ban_type,
        ban_reason:   user.ban_reason,
        ban_start:    user.ban_start,
        ban_end:      user.ban_end,
        trust_score:  user.trust_score,
        warning_count: user.warning_count,
      },
    });
  } catch (e) { next(e); }
};
