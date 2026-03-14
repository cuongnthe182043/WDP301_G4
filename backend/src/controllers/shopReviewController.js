const Review = require("../models/Review");

// GET /api/shop/reviews
exports.listReviews = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const { page = 1, limit = 20, status, rating } = req.query;

    const cond = { shop_id: shopId };
    if (status) cond.status = status;
    if (rating) cond.rating = Number(rating);

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Review.find(cond)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("user_id", "username avatar_url")
        .populate("product_id", "name images")
        .lean(),
      Review.countDocuments(cond),
    ]);

    res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (e) { next(e); }
};

// POST /api/shop/reviews/:id/reply
exports.replyToReview = async (req, res, next) => {
  try {
    const { reply } = req.body || {};
    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: "Nội dung phản hồi không được để trống" });
    }
    const review = await Review.findOne({ _id: req.params.id, shop_id: req.shop._id });
    if (!review) return res.status(404).json({ message: "Không tìm thấy đánh giá" });

    review.reply = reply.trim();
    review.reply_at = new Date();
    await review.save();

    res.json({ success: true, data: review });
  } catch (e) { next(e); }
};

// PATCH /api/shop/reviews/:id/hide
exports.toggleHideReview = async (req, res, next) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, shop_id: req.shop._id });
    if (!review) return res.status(404).json({ message: "Không tìm thấy đánh giá" });

    review.status = review.status === "hidden" ? "visible" : "hidden";
    await review.save();

    res.json({ success: true, data: { status: review.status } });
  } catch (e) { next(e); }
};
