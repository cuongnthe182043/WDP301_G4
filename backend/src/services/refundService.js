const Refund = require("../models/Refund");
const Order = require("../models/Order");

exports.requestRefund = async (userId, { order_id, reason }) => {
  if (!order_id || !reason) {
    const e = new Error("order_id and reason are required"); e.status = 400; throw e;
  }

  const order = await Order.findById(order_id).lean();
  if (!order) { const e = new Error("Order not found"); e.status = 404; throw e; }
  if (order.user_id !== userId) { const e = new Error("Forbidden"); e.status = 403; throw e; }

  const refundable = ["delivered", "confirmed", "shipping"];
  if (!refundable.includes(order.status)) {
    const e = new Error("Order is not eligible for refund"); e.status = 400; throw e;
  }

  const existing = await Refund.findOne({ order_id, user_id: userId }).lean();
  if (existing) { const e = new Error("Refund already requested for this order"); e.status = 400; throw e; }

  const refund = await Refund.create({
    order_id,
    user_id: userId,
    reason,
    amount: order.total_price,
    status: "requested",
  });

  // Mark order as refund pending
  await Order.findByIdAndUpdate(order_id, { status: "refund_pending" });

  return refund;
};

exports.getUserRefunds = async (userId) => {
  return Refund.find({ user_id: userId }).sort({ createdAt: -1 }).lean();
};
