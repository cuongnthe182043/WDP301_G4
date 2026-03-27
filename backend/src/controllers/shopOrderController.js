// controllers/shopOrderController.js
//
// Shop order management with GHN shipping integration.

const Order      = require("../models/Order");
const Shop       = require("../models/Shop");
const User       = require("../models/User");
const notif      = require("../services/dbNotificationService");
const ghn        = require("../services/ghnService");
const refundSvc  = require("../services/refundService");

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

// ─────────────────────────────────────────────────────────────────────────────
// resolveGhnCodes
// Given a shipping_address with only text fields (city/district/ward),
// tries to resolve GHN-compatible district_id and ward_code by fuzzy-matching
// against the GHN location API. Returns { districtId, wardCode } or null.
// ─────────────────────────────────────────────────────────────────────────────
const strip    = (s = "") => String(s).normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\./g, "").trim().toLowerCase();
const rmPrefix = (s = "") => s.replace(/^(tinh|thanh pho|tp|quan|huyen|thi xa|xa|phuong)\s+/i, "").trim();
const normAddr = (s = "") => rmPrefix(strip(s));

function fuzzyFindAddr(segment, list, getName) {
  const n = normAddr(segment);
  if (!n) return null;
  let found = list.find(i => normAddr(getName(i)) === n);
  if (found) return found;
  if (n.length >= 2) found = list.find(i => { const m = normAddr(getName(i)); return m.endsWith(n) || m.endsWith(" " + n); });
  if (found) return found;
  if (n.length >= 3) found = list.find(i => { const m = normAddr(getName(i)); return m.includes(n) || n.includes(m); });
  return found || null;
}

async function resolveGhnCodes(addr) {
  const cityText     = addr.city     || addr.province || "";
  const districtText = addr.district || "";
  const wardText     = addr.ward     || "";
  if (!cityText || !districtText || !wardText) return null;

  try {
    const provinces = await ghn.getProvinces();
    const province  = fuzzyFindAddr(cityText, provinces, p => p.ProvinceName);
    if (!province) return null;

    const districts = await ghn.getDistricts(province.ProvinceID);
    const district  = fuzzyFindAddr(districtText, districts, d => d.DistrictName);
    if (!district) return null;

    const wards = await ghn.getWards(district.DistrictID);
    const ward  = fuzzyFindAddr(wardText, wards, w => w.WardName);
    if (!ward) return null;

    return { districtId: district.DistrictID, wardCode: ward.WardCode };
  } catch {
    return null;
  }
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

    pushStatusHistory(order, "processing", "shop", "Shop xác nhận đơn hàng");
    order.status = "processing";
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

    const wasRefundable = refundSvc.isRefundable(order);

    pushStatusHistory(order, "cancelled_by_shop", "shop", reason.trim());
    order.status        = "cancelled_by_shop";
    order.cancel_reason = reason.trim();
    await order.save();

    // Auto-refund to customer wallet for prepaid orders
    let walletCredited = 0;
    if (wasRefundable) {
      try {
        // req.userId is the shop owner — used to deduct shop wallet
        const result = await refundSvc.processAutoRefund(order, req.userId);
        if (result) {
          walletCredited = order.total_price;
          order.payment_status = "refunded";
          await order.save();
          notif.walletRefunded(order.user_id, order.order_code, walletCredited).catch(() => {});
        }
      } catch (refundErr) {
        console.error("[cancelOrder] Auto-refund failed:", refundErr.message);
      }
    }

    notif.orderCancelled(order.user_id, order.order_code).catch(() => {});
    res.json({ success: true, data: { order_id: order._id, status: order.status, wallet_credited: walletCredited } });
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

    // Load shop pickup address
    const shop = await Shop.findById(order.shop_id).lean();
    const pickup = shop?.pickup_address;
    if (!pickup?.district_id || !pickup?.ward_code) {
      return res.status(400).json({
        message: "Shop chưa thiết lập địa chỉ lấy hàng GHN. Vào Cài đặt → Địa chỉ lấy hàng để cấu hình.",
      });
    }

    // Ensure delivery address has GHN district_code / ward_code.
    // For legacy orders without these codes, attempt to resolve from text fields.
    const addr = order.shipping_address || {};
    if (!Number(addr.district_code || 0) || !String(addr.ward_code || "").trim()) {
      console.log(`[pushToGhn] Address missing GHN codes — attempting auto-resolve for order ${order.order_code}`);
      const resolved = await resolveGhnCodes(addr);
      if (!resolved) {
        return res.status(400).json({
          message: "Địa chỉ giao hàng của khách chưa có mã GHN (quận/huyện, phường/xã) và không thể tự động nhận diện. " +
                   "Khách hàng cần cập nhật lại địa chỉ.",
        });
      }
      // Patch shipping_address in-memory so ghnService can use the resolved codes
      addr.district_code = String(resolved.districtId);
      addr.ward_code     = resolved.wardCode;
      order.shipping_address = { ...addr };
      console.log(`[pushToGhn] Auto-resolved: district_id=${resolved.districtId} ward_code=${resolved.wardCode}`);
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
        ghnData = await ghn.createShippingOrder(order, pickup);
      } catch (e) {
        return res.status(502).json({ message: `Không thể tạo đơn GHN: ${e.message}` });
      }
    }

    order.ghn_order_code  = ghnData.order_code;
    order.tracking_code   = ghnData.order_code;
    order.shipping_provider = "GHN";
    if (ghnData.expected_delivery_time) {
      const raw = ghnData.expected_delivery_time;
      const ts  = Number(raw);
      // GHN may return a Unix timestamp (seconds) or an ISO-8601 string
      const d = Number.isFinite(ts) && ts > 1e9 ? new Date(ts * 1000) : new Date(raw);
      if (!isNaN(d)) order.expected_delivery = d;
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
// syncFromGhn  POST /api/shop/orders/:id/sync-ghn
// Fetches the live GHN status and reconciles the local order status.
// Fixes conflicts where GHN has progressed (e.g. "picking") but the local
// status is stale because the webhook was missed.
// ─────────────────────────────────────────────────────────────────────────────
exports.syncFromGhn = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, shop_id: req.shop._id });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    if (!order.ghn_order_code) {
      return res.status(400).json({ message: "Đơn chưa được gửi tới GHN" });
    }

    let ghnDetail;
    try {
      ghnDetail = await ghn.getOrderDetail(order.ghn_order_code);
    } catch (e) {
      return res.status(502).json({ message: `Không thể lấy trạng thái GHN: ${e.message}` });
    }

    const ghnStatus      = String(ghnDetail?.status || "").toLowerCase();
    const internalStatus = ghn.mapGhnStatus(ghnStatus);

    const finalStates = ["delivered", "cancelled_by_shop", "cancelled_by_buyer", "refund_completed"];
    let updated = false;

    if (internalStatus && order.status !== internalStatus && !finalStates.includes(order.status)) {
      const prev = order.status;
      order.status = internalStatus;

      if (internalStatus === "delivered" && order.payment_method === "COD" && order.payment_status !== "paid") {
        order.payment_status = "paid";
      }

      pushStatusHistory(order, internalStatus, "sync", `synced from GHN: ${ghnStatus} (was: ${prev})`);
      await order.save();
      updated = true;
      console.log(`[syncFromGhn] order ${order.order_code}: ${prev} → ${internalStatus} (GHN: ${ghnStatus})`);
    }

    res.json({
      success: true,
      data: {
        ghn_status:      ghnDetail?.status,
        internal_status: order.status,
        updated,
        tracking_logs:   ghnDetail?.log || [],
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

    // COD: cash is collected on delivery — mark payment as received
    if (internalStatus === "delivered" && order.payment_method === "COD" && order.payment_status === "pending") {
      order.payment_status = "paid";
    }

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

// ─────────────────────────────────────────────────────────────────────────────
// devResetForGhn  POST /api/shop/orders/:id/dev-reset-ghn
// DEV ONLY — resets an order to "processing" and clears ghn_order_code so it
// can be pushed to GHN again for testing.
// ─────────────────────────────────────────────────────────────────────────────
exports.devResetForGhn = async (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Not available in production" });
  }
  try {
    const order = await Order.findOne({ _id: req.params.id, shop_id: req.shop._id });
    if (!order) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    order.status         = "processing";
    order.ghn_order_code = null;
    order.tracking_code  = null;
    order.payment_status = order.payment_method === "COD" ? "pending" : order.payment_status;
    if (!order.status_history) order.status_history = [];
    order.status_history.push({ status: "processing", at: new Date(), by: "dev", note: "dev-reset for GHN test" });
    await order.save();

    res.json({ success: true, data: { status: order.status } });
  } catch (e) { next(e); }
};
