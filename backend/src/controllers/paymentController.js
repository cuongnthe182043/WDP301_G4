const paypalSvc = require("../services/paypalService");
const vnpaySvc  = require("../services/vnpayService");

const ok  = (res, data) => res.json({ status: "success", data });
const bad = (res, e, fb = "Bad request") =>
  res.status(e?.status || 400).json({ status: "fail", message: e?.message || fb });

// ─── PayPal ──────────────────────────────────────────────────────────────────

// POST /api/payment/create-order  — Body: { orderId }
exports.createOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ status: "fail", message: "orderId is required" });
    const paypalOrderId = await paypalSvc.createPayPalOrder(orderId);
    ok(res, { paypalOrderId });
  } catch (e) {
    bad(res, e, "Failed to create PayPal order");
  }
};

// POST /api/payment/capture-order  — Body: { paypalOrderId, orderId }
exports.captureOrder = async (req, res) => {
  try {
    const { paypalOrderId, orderId } = req.body;
    if (!paypalOrderId || !orderId) {
      return res.status(400).json({ status: "fail", message: "paypalOrderId and orderId are required" });
    }
    const result = await paypalSvc.capturePayPalOrder(paypalOrderId, orderId);
    ok(res, { order: result.order, captureId: result.captureId });
  } catch (e) {
    bad(res, e, "Failed to capture PayPal payment");
  }
};

// POST /api/payment/refund  — Body: { orderId }
exports.refund = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ status: "fail", message: "orderId is required" });
    const result = await paypalSvc.refundPayPal(orderId);
    ok(res, { refund: result.refund, refundId: result.refundId });
  } catch (e) {
    bad(res, e, "Failed to process PayPal refund");
  }
};

// ─── VNPAY ───────────────────────────────────────────────────────────────────

// POST /api/payment/vnpay/create  — Body: { orderId }
// Authenticated. Creates a VNPAY payment URL for a pending order.
// Returns: { payUrl }
exports.vnpayCreate = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ status: "fail", message: "orderId is required" });
    }
    const ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.ip ||
      "127.0.0.1";
    const { payUrl } = await vnpaySvc.createVNPayUrl(orderId, ip);
    ok(res, { payUrl });
  } catch (e) {
    bad(res, e, "Failed to create VNPAY payment URL");
  }
};

// GET /api/payment/vnpay/ipn
// ─────────────────────────────────────────────────────────────────────────────
// IPN (Instant Payment Notification) — VNPAY server calls this directly.
// No auth middleware — this is server-to-server, not a browser request.
//
// This is the PRIMARY source of truth for order settlement.
// VNPAY retries this endpoint until it receives RspCode "00" or "02".
//
// Response MUST be JSON { RspCode, Message } — not a redirect.
//
// ⚠ VNPAY_IPN_URL must be publicly accessible.
//   For local dev use ngrok: ngrok http 5000
//   Then set VNPAY_IPN_URL=https://<ngrok-id>.ngrok.io/api/payment/vnpay/ipn
// ─────────────────────────────────────────────────────────────────────────────
exports.vnpayIpn = async (req, res) => {
  try {
    const result = await vnpaySvc.verifyIpn(req.query);

    // Respond to VNPAY first so it stops retrying, then do async work below
    res.json({ RspCode: result.rspCode, Message: result.message });

    // Only proceed with settlement if verified + success + not already handled
    if (result.rspCode === "00" && result.isSuccess) {
      await vnpaySvc.settleVNPayOrder(result.orderCode, result.transactionNo, result.bankCode);
    } else if (result.rspCode === "00" && !result.isSuccess) {
      // Signature valid, payment failed (user cancelled, etc.)
      await vnpaySvc.failVNPayOrder(result.orderCode, "ipn-fail");
    }
    // rspCode "02" = already confirmed — no-op (settleVNPayOrder idempotency handles it)
  } catch (e) {
    console.error("[VNPAY IPN] Unhandled error:", e.message, e.stack);
    // Must still respond so VNPAY stops retrying on a server error
    if (!res.headersSent) {
      res.json({ RspCode: "99", Message: "Unknown error" });
    }
  }
};

// GET /api/payment/vnpay/return
// ─────────────────────────────────────────────────────────────────────────────
// Browser redirect from VNPAY after user completes (or cancels) payment.
// No auth middleware — this is a browser redirect, no token available.
//
// Role: DISPLAY ONLY + IPN FALLBACK.
//   - Verifies secure hash (security gate).
//   - Calls settleVNPayOrder / failVNPayOrder as a fallback safety net
//     (in case IPN hasn't arrived yet — both are idempotent).
//   - Redirects user's browser to the frontend result page.
// ─────────────────────────────────────────────────────────────────────────────
exports.vnpayReturn = async (req, res) => {
  const frontendUrl = process.env.FE_ORIGIN || "http://localhost:5173";

  try {
    const result = vnpaySvc.verifyReturnUrl(req.query);

    // Extra display params from VNPAY (hash-verified, safe to surface)
    const rawAmount  = Number(req.query.vnp_Amount  || 0);
    const amount     = rawAmount ? rawAmount / 100 : 0;  // VNPAY sends VND × 100
    const payDate    = req.query.vnp_PayDate   || "";    // YYYYMMDDHHmmss
    const txnNo      = req.query.vnp_TransactionNo || "";
    const bank       = req.query.vnp_BankCode  || "";

    const extraParams =
      (amount  ? `&amount=${amount}`                      : "") +
      (txnNo   ? `&txn_no=${encodeURIComponent(txnNo)}`   : "") +
      (bank    ? `&bank=${encodeURIComponent(bank)}`       : "") +
      (payDate ? `&pay_date=${encodeURIComponent(payDate)}` : "");

    if (!result.isValid) {
      console.warn("[VNPAY Return] Rejected: invalid secure hash");
      return res.redirect(`${frontendUrl}/payment/return?status=fail&reason=invalid_signature`);
    }

    if (result.isSuccess) {
      // Settle as fallback — no-op if IPN already settled it
      await vnpaySvc.settleVNPayOrder(result.orderCode, result.transactionNo, result.bankCode);
      return res.redirect(
        `${frontendUrl}/payment/return?status=success` +
        `&order_code=${encodeURIComponent(result.orderCode)}` +
        extraParams
      );
    }

    // Payment failed or cancelled
    await vnpaySvc.failVNPayOrder(result.orderCode, result.responseCode);
    return res.redirect(
      `${frontendUrl}/payment/return?status=fail` +
      `&order_code=${encodeURIComponent(result.orderCode)}` +
      `&code=${result.responseCode}` +
      extraParams
    );
  } catch (e) {
    console.error("[VNPAY Return] Error:", e.message, e.stack);
    return res.redirect(`${frontendUrl}/payment/return?status=fail&reason=server_error`);
  }
};
