const Refund = require("../models/Refund");
const Order  = require("../models/Order");
const notif  = require("../services/dbNotificationService");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function pushOrderHistory(order, status, by = "shop", note = "") {
  if (!order.status_history) order.status_history = [];
  order.status_history.push({ status, at: new Date(), by, note });
}

async function findRefundForShop(refundId, shopId) {
  const refund = await Refund.findById(refundId);
  if (!refund) return { err: 404, msg: "Không tìm thấy yêu cầu hoàn/đổi" };

  const order = await Order.findById(refund.order_id);
  if (!order || String(order.shop_id) !== String(shopId)) {
    return { err: 403, msg: "Bạn không có quyền thực hiện thao tác này" };
  }

  return { refund, order };
}

// ─────────────────────────────────────────────────────────────────────────────
// listRefunds  GET /api/shop/refunds
// ─────────────────────────────────────────────────────────────────────────────
exports.listRefunds = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const { status, type, page = 1, limit = 20 } = req.query;

    const orderIds = await Order.distinct("_id", { shop_id: shopId });
    const cond = { order_id: { $in: orderIds } };
    if (status) cond.status = status;
    if (type)   cond.type   = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Refund.find(cond).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Refund.countDocuments(cond),
    ]);

    const orders   = await Order.find({ _id: { $in: items.map((r) => r.order_id) } }).lean();
    const orderMap = Object.fromEntries(orders.map((o) => [o._id, o]));
    const enriched = items.map((r) => ({ ...r, order: orderMap[r.order_id] || null }));

    res.json({ success: true, data: { items: enriched, total, page: Number(page), limit: Number(limit) } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// getRefund  GET /api/shop/refunds/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getRefund = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const refund = await Refund.findById(req.params.id).lean();
    if (!refund) return res.status(404).json({ message: "Không tìm thấy yêu cầu hoàn/đổi" });

    const order = await Order.findById(refund.order_id).lean();
    if (!order || String(order.shop_id) !== String(shopId)) {
      return res.status(403).json({ message: "Bạn không có quyền xem yêu cầu này" });
    }

    res.json({ success: true, data: { ...refund, order } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// approveRefund  POST /api/shop/refunds/:id/approve
// Accepts the request → order moves to return_approved, customer notified
// ─────────────────────────────────────────────────────────────────────────────
exports.approveRefund = async (req, res, next) => {
  try {
    const { note = "" } = req.body || {};
    const { refund, order, err, msg } = await findRefundForShop(req.params.id, req.shop._id);
    if (err) return res.status(err).json({ message: msg });

    if (refund.status !== "pending") {
      return res.status(400).json({ message: "Yêu cầu đã được xử lý rồi" });
    }

    refund.status       = "approved";
    refund.shop_note    = note.trim();
    refund.processed_by = req.userId;
    refund.processed_at = new Date();
    await refund.save();

    pushOrderHistory(order, "return_approved", "shop", note.trim() || "Shop đã duyệt yêu cầu hoàn/đổi");
    order.status = "return_approved";
    await order.save();

    notif.refundApproved(order.user_id, order.order_code).catch(() => {});
    res.json({ success: true, data: { refund_id: refund._id, order_status: order.status } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// rejectRefund  POST /api/shop/refunds/:id/reject
// Declines the request → order reverts to return_rejected, customer notified
// ─────────────────────────────────────────────────────────────────────────────
exports.rejectRefund = async (req, res, next) => {
  try {
    const { note = "" } = req.body || {};
    const { refund, order, err, msg } = await findRefundForShop(req.params.id, req.shop._id);
    if (err) return res.status(err).json({ message: msg });

    if (refund.status !== "pending") {
      return res.status(400).json({ message: "Yêu cầu đã được xử lý rồi" });
    }

    refund.status       = "rejected";
    refund.shop_note    = note.trim();
    refund.processed_by = req.userId;
    refund.processed_at = new Date();
    await refund.save();

    pushOrderHistory(order, "return_rejected", "shop", note.trim() || "Shop từ chối yêu cầu hoàn/đổi");
    order.status = "return_rejected";
    await order.save();

    notif.refundRejected(order.user_id, order.order_code, note.trim()).catch(() => {});
    res.json({ success: true, data: { refund_id: refund._id, order_status: order.status } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// completeRefund  POST /api/shop/refunds/:id/complete
// Shop confirms receipt of returned item and finalises refund/exchange
// ─────────────────────────────────────────────────────────────────────────────
exports.completeRefund = async (req, res, next) => {
  try {
    const { note = "" } = req.body || {};
    const { refund, order, err, msg } = await findRefundForShop(req.params.id, req.shop._id);
    if (err) return res.status(err).json({ message: msg });

    if (refund.status !== "approved") {
      return res.status(400).json({ message: "Chỉ có thể hoàn tất yêu cầu đã được duyệt" });
    }

    refund.status       = "completed";
    refund.shop_note    = note.trim() || refund.shop_note;
    refund.processed_by = req.userId;
    refund.processed_at = new Date();
    await refund.save();

    pushOrderHistory(order, "refund_completed", "shop", note.trim() || "Đã xử lý hoàn/đổi hoàn tất");
    order.status         = "refund_completed";
    order.payment_status = "refunded";
    await order.save();

    notif.refundCompleted(order.user_id, order.order_code).catch(() => {});
    res.json({ success: true, data: { refund_id: refund._id, order_status: order.status } });
  } catch (e) { next(e); }
};
