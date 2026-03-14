const Refund = require("../models/Refund");
const Order = require("../models/Order");

// GET /api/shop/refunds
exports.listRefunds = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const { status, page = 1, limit = 20 } = req.query;

    const orderIds = await Order.distinct("_id", { shop_id: shopId });
    const cond = { order_id: { $in: orderIds } };
    if (status) cond.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Refund.find(cond).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Refund.countDocuments(cond),
    ]);

    const orders = await Order.find({ _id: { $in: items.map((r) => r.order_id) } }).lean();
    const orderMap = Object.fromEntries(orders.map((o) => [o._id, o]));
    const enriched = items.map((r) => ({ ...r, order: orderMap[r.order_id] || null }));

    res.json({ success: true, data: { items: enriched, total, page: Number(page), limit: Number(limit) } });
  } catch (e) { next(e); }
};

// GET /api/shop/refunds/:id
exports.getRefund = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const refund = await Refund.findById(req.params.id).lean();
    if (!refund) return res.status(404).json({ message: "Không tìm thấy yêu cầu hoàn tiền" });

    const order = await Order.findById(refund.order_id).lean();
    if (!order || String(order.shop_id) !== String(shopId)) {
      return res.status(403).json({ message: "Bạn không có quyền xem yêu cầu này" });
    }
    res.json({ success: true, data: { ...refund, order } });
  } catch (e) { next(e); }
};

// POST /api/shop/refunds/:id/approve
exports.approveRefund = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const refund = await Refund.findById(req.params.id);
    if (!refund) return res.status(404).json({ message: "Không tìm thấy yêu cầu hoàn tiền" });

    const order = await Order.findById(refund.order_id);
    if (!order || String(order.shop_id) !== String(shopId)) {
      return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
    }
    if (refund.status !== "requested") {
      return res.status(400).json({ message: "Yêu cầu đã được xử lý rồi" });
    }

    refund.status = "approved";
    refund.processed_by = req.userId;
    refund.processed_at = new Date();
    await refund.save();

    order.status = "refund_completed";
    order.payment_status = "refunded";
    await order.save();

    res.json({ success: true, data: refund });
  } catch (e) { next(e); }
};

// POST /api/shop/refunds/:id/reject
exports.rejectRefund = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const { note } = req.body || {};
    const refund = await Refund.findById(req.params.id);
    if (!refund) return res.status(404).json({ message: "Không tìm thấy yêu cầu hoàn tiền" });

    const order = await Order.findById(refund.order_id);
    if (!order || String(order.shop_id) !== String(shopId)) {
      return res.status(403).json({ message: "Bạn không có quyền thực hiện thao tác này" });
    }
    if (refund.status !== "requested") {
      return res.status(400).json({ message: "Yêu cầu đã được xử lý rồi" });
    }

    refund.status = "rejected";
    refund.processed_by = req.userId;
    refund.processed_at = new Date();
    if (note) refund.reason = `${refund.reason} [Shop từ chối: ${note}]`;
    await refund.save();

    order.status = "delivered";
    await order.save();

    res.json({ success: true, data: refund });
  } catch (e) { next(e); }
};
