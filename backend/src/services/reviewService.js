const Review = require("../models/Review");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { uploadBuffer } = require("./mediaService");
const { moderate, recordViolation } = require("./contentModerationService");

/**
 * Submit a review for a product in a delivered order.
 */
exports.submitReview = async (userId, { order_id, product_id, rating, comment, images, is_anonymous, size_feedback }) => {
  // Validate order belongs to user and is delivered
  const order = await Order.findById(order_id).lean();
  if (!order) {
    const e = new Error("Order not found"); e.status = 404; throw e;
  }
  if (order.user_id !== userId) {
    const e = new Error("Order does not belong to you"); e.status = 403; throw e;
  }
  if (order.status !== "delivered") {
    const e = new Error("You can only review delivered orders"); e.status = 400; throw e;
  }

  // Check product is in order
  const inOrder = order.items.some(i => i.product_id === product_id || i.variant_id === product_id);
  if (!inOrder) {
    // Also check by product_id field on item
    const hasProduct = order.items.some(i => String(i.product_id) === String(product_id));
    if (!hasProduct) {
      const e = new Error("Product is not in this order"); e.status = 400; throw e;
    }
  }

  // Prevent duplicate review
  const existing = await Review.findOne({ order_id, product_id, user_id: userId }).lean();
  if (existing) {
    const e = new Error("You already reviewed this product for this order"); e.status = 400; throw e;
  }

  const product = await Product.findById(product_id).lean();

  // Check user is not banned
  const User = require("../models/User");
  const user = await User.findById(userId).lean();
  if (user?.status === "banned") {
    const banMsg = user.ban_until
      ? `Tài khoản bị tạm khóa đến ${new Date(user.ban_until).toLocaleDateString("vi-VN")}.`
      : "Tài khoản bị khóa vĩnh viễn.";
    const e = new Error(banMsg); e.status = 403; throw e;
  }

  // Moderate comment
  const mod = moderate(comment || "");
  let reviewStatus = "visible";
  let flaggedReason = null;
  if (mod.severity >= 2) {
    reviewStatus  = "hidden";
    flaggedReason = `Từ ngữ không phù hợp: ${mod.matched.join(", ")}`;
  } else if (mod.severity === 1) {
    reviewStatus  = "pending";
    flaggedReason = `Nội dung cần kiểm duyệt: ${mod.matched.join(", ")}`;
  }

  const review = await Review.create({
    order_id,
    product_id,
    user_id: userId,
    shop_id: order.shop_id || product?.shop_id,
    rating,
    comment: comment || "",
    images: images || [],
    is_anonymous: is_anonymous ?? false,
    size_feedback: size_feedback || "unknown",
    status: reviewStatus,
    flagged_reason: flaggedReason,
  });

  // Record violation if flagged
  if (mod.severity >= 1) {
    await recordViolation(userId, flaggedReason, review._id).catch(() => {});
  }

  // Update product rating
  const stats = await Review.aggregate([
    { $match: { product_id, status: "visible" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(product_id, {
      rating_avg: Math.round(stats[0].avg * 10) / 10,
      rating_count: stats[0].count,
    });
  }

  return review;
};

/**
 * Get reviews written by this user (for "my reviews" on orders page).
 */
exports.getUserReviews = async (userId) => {
  return Review.find({ user_id: userId, status: "visible" })
    .sort({ createdAt: -1 })
    .populate("product_id", "name images slug")
    .lean();
};

/**
 * Get reviews for a specific order (to know which products are already reviewed).
 */
exports.getReviewsByOrder = async (userId, orderId) => {
  return Review.find({ order_id: orderId, user_id: userId })
    .select("product_id rating comment images createdAt")
    .lean();
};

/**
 * Update an existing review.
 */
exports.updateReview = async (userId, reviewId, { rating, comment, images, is_anonymous, size_feedback }) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    const e = new Error("Review not found"); e.status = 404; throw e;
  }
  if (review.user_id !== userId) {
    const e = new Error("Not your review"); e.status = 403; throw e;
  }

  if (rating !== undefined) review.rating = rating;
  if (images !== undefined) review.images = images;
  if (is_anonymous !== undefined) review.is_anonymous = is_anonymous;
  if (size_feedback !== undefined) review.size_feedback = size_feedback;

  if (comment !== undefined) {
    const mod = moderate(comment);
    review.comment = comment;
    if (mod.severity >= 2) {
      review.status = "hidden";
      review.flagged_reason = `Từ ngữ không phù hợp: ${mod.matched.join(", ")}`;
      await recordViolation(userId, review.flagged_reason, review._id).catch(() => {});
    } else if (mod.severity === 1) {
      review.status = "pending";
      review.flagged_reason = `Nội dung cần kiểm duyệt: ${mod.matched.join(", ")}`;
      await recordViolation(userId, review.flagged_reason, review._id).catch(() => {});
    } else if (["pending", "hidden"].includes(review.status)) {
      // Clean edit — restore visibility
      review.status = "visible";
      review.flagged_reason = null;
    }
  }

  await review.save();

  // Recalculate product rating
  const stats = await Review.aggregate([
    { $match: { product_id: review.product_id, status: "visible" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(review.product_id, {
      rating_avg: Math.round(stats[0].avg * 10) / 10,
      rating_count: stats[0].count,
    });
  }

  return review;
};

/**
 * Delete a review (soft delete).
 */
exports.deleteReview = async (userId, reviewId) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    const e = new Error("Review not found"); e.status = 404; throw e;
  }
  if (review.user_id !== userId) {
    const e = new Error("Not your review"); e.status = 403; throw e;
  }

  review.status = "deleted";
  await review.save();

  // Recalculate product rating
  const stats = await Review.aggregate([
    { $match: { product_id: review.product_id, status: "visible" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const avg = stats.length > 0 ? Math.round(stats[0].avg * 10) / 10 : 0;
  const count = stats.length > 0 ? stats[0].count : 0;
  await Product.findByIdAndUpdate(review.product_id, { rating_avg: avg, rating_count: count });

  return { deleted: true };
};

/**
 * Customer adds a reply to a shop's reply (thread).
 * Requires the review to already have a shop reply.
 */
exports.addCustomerThreadReply = async (userId, reviewId, text) => {
  if (!text || !text.trim()) {
    const e = new Error("Nội dung phản hồi không được để trống"); e.status = 400; throw e;
  }

  const review = await Review.findOne({ _id: reviewId, user_id: userId });
  if (!review) { const e = new Error("Không tìm thấy đánh giá"); e.status = 404; throw e; }
  if (!review.reply) { const e = new Error("Chưa có phản hồi của shop"); e.status = 400; throw e; }

  // Check ban
  const User = require("../models/User");
  const user = await User.findById(userId).lean();
  if (user?.status === "banned") {
    const e = new Error("Tài khoản bị khóa, không thể phản hồi"); e.status = 403; throw e;
  }

  const mod = moderate(text.trim());
  if (mod.severity >= 2) {
    await recordViolation(userId, `Phản hồi vi phạm: ${mod.matched.join(", ")}`, reviewId).catch(() => {});
    const e = new Error("Nội dung chứa từ ngữ không phù hợp và đã bị từ chối"); e.status = 400; throw e;
  }

  review.thread = review.thread || [];
  review.thread.push({ from: "customer", text: text.trim(), at: new Date() });
  await review.save();

  if (mod.severity === 1) {
    await recordViolation(userId, `Phản hồi cần kiểm duyệt: ${mod.matched.join(", ")}`, reviewId).catch(() => {});
  }

  return review;
};

/**
 * Upload review images to Cloudinary.
 */
exports.uploadReviewImages = async (files = []) => {
  const results = [];
  for (const f of files) {
    const r = await uploadBuffer(f.buffer, { folder: "dfs/reviews", resource_type: "image" });
    results.push({ url: r.secure_url, public_id: r.public_id });
  }
  return results;
};
