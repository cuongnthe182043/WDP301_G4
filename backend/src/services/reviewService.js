const Review = require("../models/Review");
const Order = require("../models/Order");
const Product = require("../models/Product");

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
    status: "visible",
  });

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
    .lean();
};
