// controllers/shopOrderController.js
//
// Shop order management with GHN shipping integration.

const Order   = require("../models/Order");
const User    = require("../models/User");
const notif   = require("../services/dbNotificationService");
const ghn     = require("../services/ghnService");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Append a status history entry to an order document.
 * Does NOT call order.save().
 */
function pushStatusHistory(order, status, by = "shop", note = "") {
  if (!order.status_history) order.status_history = [];
  order.status_history.push({ status, at: new Date(), by, note });
}

/** Statuses from which the shop CAN cancel */
const CANCELLABLE_STATUSES = new Set([
  "order_created", "payment_pending", "payment_failed", "payment_confirmed",
  "processing", "packed",
  // legacy
  "pending", "confirmed",
]);

/** Statuses considered "in shipping" — cannot be cancelled */
const SHIPPING_STATUSES = new Set([
  "picking", "in_transit", "out_for_delivery",
  "shipping", // legacy
]);

// ─────────────────────────────────────────────────────────────────────────────
// listOrders  GET /api/shop/orders
// ─────────────────────────────────────────────────────────────────────────────
exports.listOrders = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const { status, page = 1, limit = 20, q } = req.query;

    const cond = { shop_id: shopId };

    // Support comma-separated status groups (e.g. "order_created,payment_pending,pending")
    if (status) {
      const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        cond.status = statuses[0];
      } else if (statuses.length > 1) {
        cond.status = { $in: statuses };
      }
    }

    // Search by order_code or (via User lookup) customer name
    if (q) {
      cond.$or = [
        { order_code: new RegExp(q, "i") },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Order.find(cond).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Order.countDocuments(cond),
    ]);

    // Enrich with customer info
    const userIds = [...new Set(items.map((o) => o.user_id).filter(Boolean))];
    const users   = await User.find({ _id: { $in: userIds } })
      .select("_id name email avatar phone")
      .lean();
    const userMap = new Map(users.map((u) => [String(u._id), u]));

    const enriched = items.map((o) => ({
      ...o,
      customer: userMap.get(String(o.user_id)) || null,
    }));

    res.json({ success: true, data: { items: enriched, total, page: Number(page), limit: Number(limit) } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// getOrder  GET /api/shop/orders/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, shop_id: req.shop._id }).lean();
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    // Enrich customer
    const customer = await User.findById(order.user_id)
      .select("_id name email avatar phone")
      .lean();

    // Fetch GHN tracking if order has been pushed
    let ghnDetail = null;
    if (order.ghn_order_code) {
      try {
        ghnDetail = await ghn.getOrderDetail(order.ghn_order_code);
      } catch (e) {
        console.warn(`[OrderCtrl] GHN detail fetch failed: ${e.message}`);
      }
    }

    res.json({ success: true, data: { ...order, customer, ghn_detail: ghnDetail } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// confirmOrder  POST /api/shop/orders/:id/confirm
// ─────────────────────────────────────────────────────────────────────────────
exports.confirmOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, shop_id: req.shop._id });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    const CONFIRMABLE = new Set([
      "order_created", "payment_pending", "payment_confirmed",
      "pending", // legacy
    ]);
    if (!CONFIRMABLE.has(order.status)) {
      return res.status(400).json({ message: `Không thể xác nhận đơn ở trạng thái: ${order.status}` });
    }

    pushStatusHistory(order, "confirmed", "shop", "Shop xác nhận đơn hàng");
    order.status = "confirmed";
    await order.save();

    notif.orderConfirmed(order.user_id, order.order_code).catch(() => {});
    res.json({ success: true, data: { order_id: order._id, status: order.status } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// cancelOrder  POST /api/shop/orders/:id/cancel
// ─────────────────────────────────────────────────────────────────────────────
exports.cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Vui lòng cung cấp lý do hủy đơn" });
    }

    const order = await Order.findOne({ _id: req.params.id, shop_id: req.shop._id });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (SHIPPING_STATUSES.has(order.status)) {
      return res.status(400).json({ message: "Không thể hủy đơn đang trong quá trình vận chuyển" });
    }
    if (["delivered", "cancelled_by_customer", "cancelled_by_shop", "canceled_by_customer", "canceled_by_shop"].includes(order.status)) {
      return res.status(400).json({ message: "Đơn hàng không thể hủy ở trạng thái này" });
    }

    // Cancel GHN order if it was already pushed
    if (order.ghn_order_code) {
      try {
        await ghn.cancelShippingOrder(order.ghn_order_code);
        console.log(`[OrderCtrl] GHN cancelled: ${order.ghn_order_code}`);
      } catch (e) {
        console.warn(`[OrderCtrl] GHN cancel failed (continuing): ${e.message}`);
      }
    }

    pushStatusHistory(order, "cancelled_by_shop", "shop", reason.trim());
    order.status        = "cancelled_by_shop";
    order.cancel_reason = reason.trim();
    if (order.payment_status === "paid") order.payment_status = "refunded";
    await order.save();

    notif.orderCancelled(order.user_id, order.order_code).catch(() => {});
    res.json({ success: true, data: { order_id: order._id, status: order.status } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// pushToGhn  POST /api/shop/orders/:id/ghn
// Creates a GHN shipping order and transitions status to "picking"
// ─────────────────────────────────────────────────────────────────────────────
exports.pushToGhn = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, shop_id: req.shop._id });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (!["confirmed", "processing", "packed"].includes(order.status)) {
      return res.status(400).json({ message: "Chỉ có thể gửi GHN khi đơn ở trạng thái đã xác nhận, đang xử lý hoặc đã đóng gói" });
    }
    if (order.ghn_order_code) {
      return res.status(400).json({ message: "Đơn đã được gửi tới GHN trước đó", ghn_order_code: order.ghn_order_code });
    }

    let ghnData;
    const GHN_DEV_MODE = process.env.GHN_DEV_MODE === "true";

    if (GHN_DEV_MODE) {
      // Simulate GHN response for development/testing
      const fakeCode = `GHN-DEV-${Date.now()}`;
      ghnData = {
        order_code:            fakeCode,
        expected_delivery_time: Math.floor(Date.now() / 1000) + 3 * 24 * 3600,
      };
      console.log(`[GHN] DEV MODE — simulated order_code: ${fakeCode}`);
    } else {
      try {
        ghnData = await ghn.createShippingOrder(order);
      } catch (e) {
        return res.status(502).json({ message: `Không thể tạo đơn GHN: ${e.message}` });
      }
    }

    order.ghn_order_code  = ghnData.order_code;
    order.tracking_code   = ghnData.order_code;
    order.shipping_provider = "GHN";
    if (ghnData.expected_delivery_time) {
      order.expected_delivery = new Date(ghnData.expected_delivery_time * 1000);
    }
    pushStatusHistory(order, "picking", "shop", `GHN order: ${ghnData.order_code}`);
    order.status = "picking";
    await order.save();

    notif.orderShipped(order.user_id, order.order_code).catch(() => {});
    res.json({
      success: true,
      data: {
        order_id:        order._id,
        status:          order.status,
        ghn_order_code:  order.ghn_order_code,
        expected_delivery: order.expected_delivery,
      },
    });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// trackOrder  GET /api/shop/orders/:id/track
// Returns GHN tracking or internal status_history
// ─────────────────────────────────────────────────────────────────────────────
exports.trackOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, shop_id: req.shop._id }).lean();
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (order.ghn_order_code) {
      try {
        const ghnDetail = await ghn.getOrderDetail(order.ghn_order_code);
        return res.json({
          success: true,
          data: {
            source:        "ghn",
            ghn_order_code: order.ghn_order_code,
            ghn_status:    ghnDetail?.status,
            tracking_logs: ghnDetail?.log || [],
            expected_delivery: order.expected_delivery,
            status_history:    order.status_history || [],
          },
        });
      } catch (e) {
        console.warn(`[OrderCtrl] GHN track failed, falling back to history: ${e.message}`);
      }
    }

    res.json({
      success: true,
      data: {
        source:         "internal",
        status:         order.status,
        status_history: order.status_history || [],
      },
    });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// updateOrderStatus  PUT /api/shop/orders/:id/status
// Only allows manual transitions: processing ↔ packed
// ─────────────────────────────────────────────────────────────────────────────
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    const ALLOWED_MANUAL = ["processing", "packed"];
    if (!status || !ALLOWED_MANUAL.includes(status)) {
      return res.status(400).json({ message: `Chỉ cho phép chuyển sang: ${ALLOWED_MANUAL.join(", ")}` });
    }

    const order = await Order.findOne({ _id: req.params.id, shop_id: req.shop._id });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    // confirmed → processing → packed (and processing ↔ packed)
    const VALID_FROM = new Set(["confirmed", "processing", "packed"]);
    if (!VALID_FROM.has(order.status)) {
      return res.status(400).json({ message: `Không thể chuyển từ trạng thái: ${order.status}` });
    }

    const NOTE_MAP = { processing: "Bắt đầu xử lý đơn hàng", packed: "Đã đóng gói, sẵn sàng giao" };
    pushStatusHistory(order, status, "shop", NOTE_MAP[status] || `Cập nhật → ${status}`);
    order.status = status;
    await order.save();
    res.json({ success: true, data: { order_id: order._id, status: order.status } });
  } catch (e) { next(e); }
};

// ─────────────────────────────────────────────────────────────────────────────
// handleGhnWebhook  POST /api/webhooks/ghn  (no auth required)
// Receives status updates from GHN and syncs internal order status.
// ─────────────────────────────────────────────────────────────────────────────
exports.handleGhnWebhook = async (req, res) => {
  try {
    const { order_code, status } = req.body || {};

    if (!order_code || !status) {
      console.warn("[GHN Webhook] Missing order_code or status", req.body);
      return res.json({ success: true }); // ACK anyway so GHN doesn't retry
    }

    console.log(`[GHN Webhook] order_code: ${order_code} | status: ${status}`);

    const order = await Order.findOne({ ghn_order_code: order_code });
    if (!order) {
      console.warn(`[GHN Webhook] Order not found for ghn_code: ${order_code}`);
      return res.json({ success: true });
    }

    const internalStatus = ghn.mapGhnStatus(status);
    if (!internalStatus) {
      console.warn(`[GHN Webhook] Unknown GHN status: ${status} — ignoring`);
      return res.json({ success: true });
    }

    // Avoid re-processing same status
    if (order.status === internalStatus) {
      return res.json({ success: true });
    }

    pushStatusHistory(order, internalStatus, "ghn", `GHN status: ${status}`);
    order.status = internalStatus;
    await order.save();

    // Notify customer on key events
    if (internalStatus === "out_for_delivery") {
      notif.orderShipped(order.user_id, order.order_code).catch(() => {});
    } else if (internalStatus === "delivered") {
      notif.orderDelivered(order.user_id, order.order_code).catch(() => {});
    }

    res.json({ success: true });
  } catch (e) {
    console.error("[GHN Webhook] Error:", e.message);
    res.json({ success: true }); // Always ACK to prevent GHN retry storms
  }
};
