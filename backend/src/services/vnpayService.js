// services/vnpayService.js
//
// VNPAY Sandbox payment integration (API v2.1.0).
//
// Two-callback architecture:
//
//   IPN  (vnp_IpnUrl)    — VNPAY server → our server, server-to-server.
//                           PRIMARY source of truth for order settlement.
//                           Must respond with JSON { RspCode, Message }.
//                           VNPAY retries until it receives RspCode "00" or "02".
//
//   Return URL           — VNPAY redirects user's browser → our server → FE.
//                           SECONDARY / fallback: also settles if IPN hasn't arrived yet.
//                           settleVNPayOrder() is idempotent — safe to call from both.
//
// Security:
//   - All params sorted alphabetically before HMAC-SHA512 hashing.
//   - Hash secret stored only in backend env — never sent to client.
//   - Both IPN and Return URL re-verify the secure hash before any DB write.
//   - Double-settlement guard: settleVNPayOrder() is a no-op if already paid.

const crypto   = require("crypto");
const { v4: uuidv4 } = require("uuid");
const vnpayCfg    = require("../config/vnpay");
const Order       = require("../models/Order");
const Payment     = require("../models/Payment");
const Wallet      = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const AuditLog    = require("../models/AuditLog");

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a JS Date to VNPAY's required YYYYMMDDHHmmss in UTC+7 (Vietnam).
 */
function formatVNDate(date = new Date()) {
  const offsetMs = 7 * 60 * 60 * 1000;
  const vnDate   = new Date(date.getTime() + date.getTimezoneOffset() * 60000 + offsetMs);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    vnDate.getFullYear() +
    pad(vnDate.getMonth() + 1) +
    pad(vnDate.getDate()) +
    pad(vnDate.getHours()) +
    pad(vnDate.getMinutes()) +
    pad(vnDate.getSeconds())
  );
}

/**
 * Sort object keys alphabetically.
 */
function sortObject(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach((k) => { sorted[k] = obj[k]; });
  return sorted;
}

/**
 * Compute HMAC-SHA512 from sorted params.
 *
 * ⚠  Input to HMAC is the RAW (non-URL-encoded) query string.
 *    e.g. "vnp_Amount=100000&vnp_Command=pay&..."
 *    This matches how VNPAY's server computes the hash on their side.
 */
function createSecureHash(params, secret) {
  const signData = Object.keys(sortObject(params))
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto
    .createHmac("sha512", secret)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");
}

/**
 * Extract and verify vnp_SecureHash from a query-param object.
 * Shared by IPN and Return URL handlers.
 *
 * Returns { isValid, params (hash fields stripped), receivedHash }
 */
function extractAndVerifyHash(rawQuery) {
  const params       = { ...rawQuery };
  const receivedHash = params["vnp_SecureHash"] || "";
  delete params["vnp_SecureHash"];
  delete params["vnp_SecureHashType"];

  if (!receivedHash) {
    return { isValid: false, params, receivedHash: "" };
  }

  const computedHash = createSecureHash(params, vnpayCfg.hashSecret);
  const isValid      = computedHash === receivedHash;

  if (!isValid) {
    console.warn(
      `[VNPAY] Hash mismatch | expected: ${computedHash} | received: ${receivedHash}`
    );
  }
  return { isValid, params, receivedHash };
}

// ─────────────────────────────────────────────────────────────────────────────
// createVNPayUrl
// Builds a VNPAY payment URL for a pending order.
// Registers both vnp_IpnUrl and vnp_ReturnUrl.
// Returns: { payUrl, txnRef }
// ─────────────────────────────────────────────────────────────────────────────
async function createVNPayUrl(orderId, ipAddr) {
  const order = await Order.findById(orderId).lean();
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
  if (order.payment_method !== "VNPAY") {
    throw Object.assign(new Error("Order payment method is not VNPAY"), { status: 400 });
  }
  if (order.payment_status === "paid") {
    throw Object.assign(new Error("Order already paid"), { status: 400 });
  }

  const txnRef     = order.order_code;
  const createDate = formatVNDate();
  const expireDate = formatVNDate(new Date(Date.now() + 15 * 60 * 1000)); // +15 min

  const params = {
    vnp_Version:    "2.1.0",
    vnp_Command:    "pay",
    vnp_TmnCode:    vnpayCfg.tmnCode,
    vnp_Amount:     String(Math.round(order.total_price) * 100),
    vnp_CurrCode:   "VND",
    vnp_TxnRef:     txnRef,
    vnp_OrderInfo:  `Thanh toan don hang ${order.order_code}`,
    vnp_OrderType:  "other",
    vnp_Locale:     "vn",
    vnp_ReturnUrl:  vnpayCfg.returnUrl,  // browser redirect (display only)
    vnp_IpnUrl:     vnpayCfg.ipnUrl,     // server-to-server (source of truth)
    vnp_IpAddr:     ipAddr || "127.0.0.1",
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  // Hash computed on raw sorted string (before URL-encoding)
  const secureHash   = createSecureHash(params, vnpayCfg.hashSecret);
  const sortedParams = sortObject(params);

  // Final URL — values URL-encoded individually, hash appended last (not encoded)
  const queryStr = Object.keys(sortedParams)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(sortedParams[k])}`)
    .join("&");
  const payUrl = `${vnpayCfg.url}?${queryStr}&vnp_SecureHash=${secureHash}`;

  // Upsert a pending Payment record for this attempt
  await Payment.findOneAndUpdate(
    { order_id: order._id, gateway: "VNPAY" },
    {
      order_id:        order._id,
      user_id:         order.user_id,
      shop_id:         order.shop_id,
      gateway:         "VNPAY",
      method:          "vnpay",
      amount:          order.total_price,
      currency:        "VND",
      status:          "pending",
      vnpay_txn_ref:   txnRef,
      idempotency_key: uuidv4(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[VNPAY] URL created | order: ${order.order_code} | txnRef: ${txnRef}`);
  return { payUrl, txnRef };
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyIpn
// Called by the IPN handler (server-to-server from VNPAY).
// Verifies hash, checks order amount, returns VNPAY ACK codes.
//
// VNPAY ACK codes:
//   "00" — confirmed (stop retrying)
//   "02" — order already confirmed (idempotent — stop retrying)
//   "04" — invalid amount
//   "97" — invalid signature
//   "99" — unknown / internal error
//
// Returns: { rspCode, message, orderCode, transactionNo, bankCode, isSuccess }
// ─────────────────────────────────────────────────────────────────────────────
async function verifyIpn(query) {
  const { isValid, params } = extractAndVerifyHash(query);

  if (!isValid) {
    return { rspCode: "97", message: "Invalid signature" };
  }

  const responseCode  = params["vnp_ResponseCode"] || "";
  const orderCode     = params["vnp_TxnRef"]        || "";
  const transactionNo = params["vnp_TransactionNo"]  || "";
  const bankCode      = params["vnp_BankCode"]       || "";
  const vnpAmount     = Number(params["vnp_Amount"])  || 0;
  const isSuccess     = responseCode === "00";

  // Look up order by order_code (txnRef = order_code)
  const order = await Order.findOne({ order_code: orderCode }).lean();
  if (!order) {
    console.warn(`[VNPAY IPN] Order not found: ${orderCode}`);
    return { rspCode: "01", message: "Order not found" };
  }

  // Idempotency guard — already processed
  if (order.payment_status === "paid") {
    console.log(`[VNPAY IPN] Order already confirmed: ${orderCode}`);
    return { rspCode: "02", message: "Order already confirmed", orderCode, transactionNo, bankCode, isSuccess: true };
  }

  // Amount integrity check — prevent partial-payment attacks
  const expectedVnpAmount = Math.round(order.total_price) * 100;
  if (vnpAmount !== expectedVnpAmount) {
    console.error(
      `[VNPAY IPN] Amount mismatch | expected: ${expectedVnpAmount} | received: ${vnpAmount} | order: ${orderCode}`
    );
    return { rspCode: "04", message: "Invalid amount" };
  }

  console.log(
    `[VNPAY IPN] Verified | order: ${orderCode} | success: ${isSuccess} | ` +
    `responseCode: ${responseCode} | bank: ${bankCode}`
  );
  return { rspCode: "00", message: "Confirm Success", orderCode, transactionNo, bankCode, isSuccess };
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyReturnUrl
// Called by the Return URL handler (browser redirect from VNPAY).
// Verifies hash only — does NOT check amounts (browser params are user-visible).
// Settlement via Return URL is a fallback; IPN is the primary source.
//
// Returns: { isValid, isSuccess, orderCode, transactionNo, bankCode, responseCode }
// ─────────────────────────────────────────────────────────────────────────────
function verifyReturnUrl(query) {
  const { isValid, params } = extractAndVerifyHash(query);

  const responseCode  = params["vnp_ResponseCode"] || "";
  const isSuccess     = responseCode === "00";
  const orderCode     = params["vnp_TxnRef"]        || "";
  const transactionNo = params["vnp_TransactionNo"]  || "";
  const bankCode      = params["vnp_BankCode"]       || "";

  console.log(
    `[VNPAY Return] hash: ${isValid} | success: ${isSuccess} | ` +
    `orderCode: ${orderCode} | responseCode: ${responseCode}`
  );
  return { isValid, isSuccess, orderCode, transactionNo, bankCode, responseCode };
}

// ─────────────────────────────────────────────────────────────────────────────
// settleVNPayOrder
// Marks a verified successful payment as paid and credits the shop wallet.
// IDEMPOTENT — safe to call from both IPN and Return URL handlers.
// ─────────────────────────────────────────────────────────────────────────────
async function settleVNPayOrder(orderCode, transactionNo, bankCode) {
  const order = await Order.findOne({ order_code: orderCode });
  if (!order) throw Object.assign(new Error(`Order not found: ${orderCode}`), { status: 404 });

  // Double-settlement guard
  if (order.payment_status === "paid") {
    console.log(`[VNPAY] Already settled: ${orderCode} — skipping`);
    return order;
  }

  order.payment_status = "paid";
  order.status         = "confirmed";
  await order.save();

  await Payment.findOneAndUpdate(
    { order_id: order._id, gateway: "VNPAY" },
    {
      $set: {
        status:               "success",
        vnpay_transaction_no: transactionNo,
        vnpay_bank_code:      bankCode,
        provider_txn_id:      transactionNo,
        paid_at:              new Date(),
        webhook_verified:     true,
      },
    }
  );

  // Credit shop wallet — non-fatal
  try {
    const shopWallet = await Wallet.findOne({ user_id: order.shop_id, type: "shop" });
    if (shopWallet) {
      shopWallet.balance_available += order.total_price;
      await shopWallet.save();
      await Transaction.create({
        wallet_id:  shopWallet._id,
        order_id:   order._id,
        type:       "payment",
        direction:  "in",
        amount:     order.total_price,
        currency:   "VND",
        status:     "success",
        note:       `VNPAY — order ${order.order_code}`,
        meta:       { transactionNo, bankCode },
      });
    }
  } catch (walletErr) {
    console.error("[VNPAY] WALLET_CREDIT_ERROR:", walletErr.message);
  }

  await AuditLog.create({
    action:            "VNPAY_PAYMENT_SUCCESS",
    target_collection: "orders",
    target_id:         order._id,
    metadata:          { orderCode, transactionNo, bankCode, amount: order.total_price },
  });

  console.log(`[VNPAY] Settled: ${orderCode} | txn: ${transactionNo} | bank: ${bankCode}`);
  return order;
}

// ─────────────────────────────────────────────────────────────────────────────
// failVNPayOrder
// Marks a failed or cancelled payment.
// IDEMPOTENT — no-op if already in a terminal state.
// ─────────────────────────────────────────────────────────────────────────────
async function failVNPayOrder(orderCode, responseCode) {
  const order = await Order.findOne({ order_code: orderCode });
  if (!order) {
    console.warn(`[VNPAY] failVNPayOrder: not found ${orderCode}`);
    return;
  }
  if (order.payment_status !== "pending") return;

  order.payment_status = "failed";
  await order.save();

  await Payment.findOneAndUpdate(
    { order_id: order._id, gateway: "VNPAY" },
    { $set: { status: "failed" } }
  );

  await AuditLog.create({
    action:            "VNPAY_PAYMENT_FAILED",
    target_collection: "orders",
    target_id:         order._id,
    metadata:          { orderCode, responseCode },
  });

  console.log(`[VNPAY] Failed: ${orderCode} | responseCode: ${responseCode}`);
}

module.exports = {
  createVNPayUrl,
  verifyIpn,
  verifyReturnUrl,
  settleVNPayOrder,
  failVNPayOrder,
};
