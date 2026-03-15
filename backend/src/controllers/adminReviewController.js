// controllers/adminReviewController.js
// Admin moderation: flagged reviews, user warnings/bans

const Review  = require("../models/Review");
const User    = require("../models/User");
const Product = require("../models/Product");
const notif   = require("../services/dbNotificationService");

// ─────────────────────────────────────────────────────────────────────────────
// listReviews  GET /api/admin/reviews
// ─────────────────────────────────────────────────────────────────────────────
exports.listReviews = async (req, res, next) => {
  try {
    const { status = "pending", page = 1, limit = 20, product_id } = req.query;
    const cond = {};
    if (status)     cond.status     = status;
    if (product_id) cond.product_id = product_id;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Review.find(cond)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("user_id",    "username name avatar_url email warning_count status ban_until")
        .populate("product_id", "name images")
        .lean(),
      Review.countDocuments(cond),
    ]);

    res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// approveReview  PATCH /api/admin/reviews/:id/approve
// ─────────────────────────────────────────────────────────────────────────────
exports.approveReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Không tìm thấy đánh giá" });

    review.status        = "visible";
    review.flagged_reason = null;
    await review.save();

    // Recalculate product rating
    const stats = await Review.aggregate([
      { $match: { product_id: review.product_id, status: "visible" } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (stats.length > 0) {
      await Product.findByIdAndUpdate(review.product_id, {
        rating_avg:   Math.round(stats[0].avg * 10) / 10,
        rating_count: stats[0].count,
      });
    }

    // Notify reviewer
    notif.reviewApproved(review.user_id, review._id).catch(() => {});

    res.json({ success: true, data: { status: review.status } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// toggleHideReview  PATCH /api/admin/reviews/:id/hide
// ─────────────────────────────────────────────────────────────────────────────
exports.toggleHideReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Không tìm thấy đánh giá" });

    review.status = review.status === "hidden" ? "visible" : "hidden";
    await review.save();

    res.json({ success: true, data: { status: review.status } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// deleteReview  PATCH /api/admin/reviews/:id/delete
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Không tìm thấy đánh giá" });

    review.status = "deleted";
    await review.save();

    res.json({ success: true });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// listUsers  GET /api/admin/moderation/users
// Users with violations, for ban management
// ─────────────────────────────────────────────────────────────────────────────
exports.listViolationUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const cond = { warning_count: { $gt: 0 } };
    if (status) cond.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      User.find(cond)
        .sort({ warning_count: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select("_id name username email status warning_count ban_until violation_history createdAt")
        .lean(),
      User.countDocuments(cond),
    ]);

    res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// banUser  POST /api/admin/moderation/users/:id/ban
// ─────────────────────────────────────────────────────────────────────────────
exports.banUser = async (req, res, next) => {
  try {
    const { days, reason = "Vi phạm chính sách đánh giá" } = req.body || {};
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

    user.status    = "banned";
    user.ban_until = days ? new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000) : null;
    user.violation_history = user.violation_history || [];
    user.violation_history.push({ reason: `Admin ban: ${reason}`, at: new Date() });
    await user.save();

    const duration = days ? `${days} ngày` : "vĩnh viễn";
    notif.userBanned(user._id, duration).catch(() => {});

    res.json({ success: true, data: { status: user.status, ban_until: user.ban_until } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// unbanUser  POST /api/admin/moderation/users/:id/unban
// ─────────────────────────────────────────────────────────────────────────────
exports.unbanUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

    user.status    = "active";
    user.ban_until = null;
    await user.save();

    res.json({ success: true, data: { status: user.status } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// warnUser  POST /api/admin/moderation/users/:id/warn
// ─────────────────────────────────────────────────────────────────────────────
exports.warnUser = async (req, res, next) => {
  try {
    const { reason = "Nội dung vi phạm" } = req.body || {};
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

    user.warning_count = (user.warning_count || 0) + 1;
    user.violation_history = user.violation_history || [];
    user.violation_history.push({ reason: `Admin warn: ${reason}`, at: new Date() });
    await user.save();

    notif.userWarned(user._id, user.warning_count).catch(() => {});
    res.json({ success: true, data: { warning_count: user.warning_count } });
  } catch (e) { next(e); }
};
