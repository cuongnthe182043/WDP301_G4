const Order          = require("../models/Order");
const PaymentWebhook = require("../models/PaymentWebhook");
const { mapGhnStatus } = require("../services/ghnService");

// ─────────────────────────────────────────────────────────────────────────────
// applyGhnStatus
// Core logic shared by real webhook + dev simulation.
// Finds the order by ghn_order_code, maps GHN status → internal status,
// updates the order (and marks COD paid on delivery).
// ─────────────────────────────────────────────────────────────────────────────
async function applyGhnStatus(ghnCode, ghnStatus, rawBody = {}) {
  const order = await Order.findOne({ ghn_order_code: ghnCode });
  if (!order) return { ok: false, reason: "not_found" };

  // Log the raw webhook for auditing
  try {
    await PaymentWebhook.create({
      payment_id:       ghnCode,
      provider:         "ghn",
      raw_body:         rawBody,
      signature_valid:  true,
    });
  } catch {}

  const internalStatus = mapGhnStatus(ghnStatus);
  console.log(`[GHN Webhook] ghn_code=${ghnCode} ghn_status=${ghnStatus} → internal=${internalStatus}`);

  if (!internalStatus) return { ok: true, noChange: true, reason: "unmapped_status" };

  const finalStates = ["delivered", "cancelled_by_shop", "cancelled_by_buyer", "refund_completed"];
  if (finalStates.includes(order.status)) {
    return { ok: true, alreadyFinal: true };
  }

  order.status = internalStatus;

  // Mark COD orders as paid when delivered
  if (
    internalStatus === "delivered" &&
    order.payment_method === "COD" &&
    order.payment_status !== "paid"
  ) {
    order.payment_status = "paid";
    console.log(`[GHN Webhook] COD order ${order.order_code} marked as paid on delivery`);
  }

  if (!order.status_history) order.status_history = [];
  order.status_history.push({ status: internalStatus, at: new Date(), by: "ghn", note: ghnStatus });

  await order.save();
  return { ok: true, status: internalStatus };
}

// ─────────────────────────────────────────────────────────────────────────────
// GHN real webhook  POST /api/shipping/ghn
// ─────────────────────────────────────────────────────────────────────────────
exports.ghn = async (req, res) => {
  try {
    const token = req.headers["token"] || req.headers["x-webhook-token"] || req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
    if (process.env.GHN_WEBHOOK_TOKEN && token !== process.env.GHN_WEBHOOK_TOKEN) {
      return res.status(401).json({ message: "unauthorized" });
    }

    const { OrderCode, CurrentStatus } = req.body || {};
    if (!OrderCode) return res.status(400).json({ message: "bad_request" });

    const r = await applyGhnStatus(OrderCode, String(CurrentStatus || "").toLowerCase(), req.body);
    return res.json({ ok: true, result: r });
  } catch (e) {
    console.error("[GHN Webhook] Error:", e.message);
    return res.status(500).json({ ok: false, message: e.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Dev simulation  POST /api/shipping/ghn/simulate
// Body: { ghn_order_code, ghn_status }
// Only works when NODE_ENV !== "production"
// ─────────────────────────────────────────────────────────────────────────────
exports.simulateGhn = async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ message: "Not available in production" });
  }
  try {
    const { ghn_order_code, ghn_status } = req.body || {};
    if (!ghn_order_code || !ghn_status) {
      return res.status(400).json({ message: "ghn_order_code and ghn_status are required" });
    }

    const r = await applyGhnStatus(ghn_order_code, String(ghn_status).toLowerCase(), {
      OrderCode:     ghn_order_code,
      CurrentStatus: ghn_status,
      _simulated:    true,
    });
    return res.json({ ok: true, result: r });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
};

exports.ghtk = async (req, res) => {
  try {
    const token = req.headers["x-webhook-token"] || req.headers["x-ghtk-token"];
    if (process.env.GHTK_WEBHOOK_TOKEN && token !== process.env.GHTK_WEBHOOK_TOKEN) {
      return res.status(401).json({ message: "unauthorized" });
    }

    const { label_id, status } = req.body || {};
    if (!label_id) return res.status(400).json({ message: "bad_request" });

    // GHTK uses its own status names — basic mapping
    const GHTK_MAP = {
      picking: "picking", delivering: "out_for_delivery",
      delivered: "delivered", returned: "delivery_failed", cancel: "cancelled_by_shop",
    };
    const internalStatus = GHTK_MAP[String(status || "").toLowerCase()] || null;

    const order = await Order.findOne({ tracking_code: label_id });
    if (!order) return res.json({ ok: true, reason: "not_found" });

    if (internalStatus && !["delivered", "cancelled_by_shop", "cancelled_by_buyer"].includes(order.status)) {
      order.status = internalStatus;
      await order.save();
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
};
