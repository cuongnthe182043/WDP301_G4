// config/vnpay.js
// VNPAY Sandbox configuration.
//
// Required .env variables:
//   VNPAY_TMN_CODE      — Terminal Code from VNPAY merchant portal
//   VNPAY_HASH_SECRET   — Secret key for SHA512 HMAC signing
//   VNPAY_URL           — VNPAY payment gateway URL
//   VNPAY_RETURN_URL    — Browser redirect URL after payment (backend, then redirects to FE)
//                         e.g.: http://localhost:5000/api/payment/vnpay/return
//   VNPAY_IPN_URL       — Server-to-server callback URL (VNPAY calls this directly)
//                         e.g.: http://localhost:5000/api/payment/vnpay/ipn
//                         ⚠ Must be a publicly accessible URL in production (use ngrok for local dev)
//   FE_ORIGIN           — Frontend base URL used for post-payment browser redirect
//                         e.g.: http://localhost:5173

module.exports = {
  tmnCode:     process.env.VNPAY_TMN_CODE    || "",
  hashSecret:  process.env.VNPAY_HASH_SECRET || "",
  url:         process.env.VNPAY_URL         || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  returnUrl:   process.env.VNPAY_RETURN_URL  || "http://localhost:5000/api/payment/vnpay/return",
  ipnUrl:      process.env.VNPAY_IPN_URL     || "http://localhost:5000/api/payment/vnpay/ipn",
  frontendUrl: process.env.FE_ORIGIN         || "http://localhost:5173",
};
