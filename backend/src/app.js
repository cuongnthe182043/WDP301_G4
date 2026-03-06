require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const path = require("path");

/* ==== Route imports ==== */
const homeRoutes = require("./routes/homeRoutes");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const productVariantRoutes = require("./routes/productVariantRoutes");
const productAdminRoutes = require("./routes/productAdminRoutes");
const userRoutes = require("./routes/userRoutes");
const addressRoutes = require("./routes/addressRoutes");
const bankRoutes = require("./routes/bankRoutes");
const voucherRoutes = require("./routes/voucherRoutes");
const bannerRoutes = require("./routes/bannerRoutes");
const cartRoutes = require("./routes/cartRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const orderRoutes = require("./routes/orderRoutes");
const shippingRoutes = require("./routes/shippingRoutes");
const flashSaleRoutes = require("./routes/flashsaleRoutes");
const walletRoutes = require("./routes/walletRoutes");
const refundRoutes = require("./routes/refundRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const shopRoutes = require("./routes/shopRoutes");
const vendorShopRoutes = require("./routes/vendorShopRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
// const adminRoutes = require("./routes/adminRoutes");

const errorMiddleware = require("./middlewares/errorMiddleware");

const FE_ORIGIN = process.env.FE_ORIGIN || "http://localhost:5173";

const app = express();

/* ==== Security & CORS ==== */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(
  cors({
    origin: [FE_ORIGIN],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ==== Disable 304 caching for API ==== */
app.set("etag", false);
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

/* ==== Parsers & Performance ==== */
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: "Too many requests, please try again later.",
  })
);

/* ==== Routes ==== */
app.use("/api", homeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/product-variant", productVariantRoutes);
app.use("/api/users", userRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/banks", bankRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/shipping/webhooks", shippingRoutes);
app.use("/api/flashsales", flashSaleRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/shop/admin", productAdminRoutes);
app.use("/api/vendor/shops", vendorShopRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/tickets", ticketRoutes);
// app.use("/api/admin", adminRoutes);

app.use("/static/invoices", express.static(path.join(__dirname, "../public/invoices")));

/* ==== Health ==== */
app.get("/", (req, res) => {
  res.status(200).json({
    message: "✅ DFS Backend API is running...",
    version: "1.0.0",
    time: new Date().toISOString(),
  });
});

/* ==== Error ==== */
app.use(errorMiddleware);

module.exports = app;
