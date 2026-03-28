/**
 * envController.js
 * Admin-only endpoint to view and update backend environment variables.
 *
 * Security:
 *  - All secret values are MASKED in the list response.
 *  - Reveal requires a separate authenticated request + audit log.
 *  - Values are also applied to process.env immediately (no restart needed for most),
 *    but a server restart is recommended for connection-string changes.
 */

const fs       = require("fs");
const path     = require("path");
const auditLog = require("../services/auditLogService");

const ENV_PATH = path.resolve(process.cwd(), ".env");

// ─── Schema ──────────────────────────────────────────────────────────────────

const ENV_SCHEMA = [
  // App
  { group: "app",        key: "PORT",                   label: "Cổng server",           secret: false, description: "Cổng HTTP của backend (mặc định 5000)" },
  { group: "app",        key: "NODE_ENV",                label: "Môi trường",            secret: false, description: "development | production" },
  { group: "app",        key: "API_URL",                 label: "URL API (self)",         secret: false, description: "URL backend (dùng nội bộ)" },
  { group: "app",        key: "FRONTEND_URL",            label: "URL Frontend",           secret: false },
  { group: "app",        key: "FE_ORIGIN",               label: "FE Origin (CORS)",       secret: false, description: "URL frontend chính xác để CORS cho phép" },
  { group: "app",        key: "ML_SERVICE_URL",          label: "URL ML Service",         secret: false, description: "URL của AI/ML microservice" },
  // Database
  { group: "database",   key: "MONGO_URI",               label: "MongoDB URI",            secret: true,  description: "Connection string MongoDB Atlas hoặc local" },
  { group: "database",   key: "MONGO_DB_NAME",           label: "Tên Database",           secret: false },
  { group: "database",   key: "REDIS_URL",               label: "Redis URL",              secret: true,  description: "URL kết nối Redis (cache, session)" },
  // Auth
  { group: "auth",       key: "JWT_SECRET",              label: "JWT Secret",             secret: true,  description: "Khóa ký JWT access token" },
  { group: "auth",       key: "JWT_EXPIRES_IN",          label: "JWT Thời hạn",           secret: false, description: "VD: 1h, 15m, 7d" },
  { group: "auth",       key: "JWT_REFRESH_SECRET",      label: "JWT Refresh Secret",     secret: true,  description: "Khóa ký JWT refresh token" },
  { group: "auth",       key: "JWT_REFRESH_EXPIRES_IN",  label: "Refresh Thời hạn",       secret: false, description: "VD: 7d, 30d" },
  // Google
  { group: "google",     key: "GOOGLE_CLIENT_ID",        label: "Client ID",              secret: false },
  { group: "google",     key: "GOOGLE_CLIENT_SECRET",    label: "Client Secret",          secret: true },
  { group: "google",     key: "GOOGLE_REDIRECT_URI",     label: "Redirect URI",           secret: false },
  // SMTP
  { group: "smtp",       key: "SMTP_HOST",               label: "SMTP Host",              secret: false, description: "VD: smtp.gmail.com" },
  { group: "smtp",       key: "SMTP_PORT",               label: "SMTP Port",              secret: false, description: "587 (TLS) hoặc 465 (SSL)" },
  { group: "smtp",       key: "SMTP_USER",               label: "Tài khoản email",        secret: false },
  { group: "smtp",       key: "SMTP_PASS",               label: "Mật khẩu / App Password",secret: true },
  // PayPal
  { group: "paypal",     key: "PAYPAL_CLIENT_ID",        label: "Client ID",              secret: false },
  { group: "paypal",     key: "PAYPAL_SECRET",           label: "Secret Key",             secret: true },
  { group: "paypal",     key: "VND_TO_USD_RATE",         label: "Tỷ giá VND → USD",       secret: false, description: "VD: 25000 (1 USD = 25.000 VND)" },
  // VNPay
  { group: "vnpay",      key: "VNPAY_TMN_CODE",          label: "TMN Code",               secret: false },
  { group: "vnpay",      key: "VNPAY_HASH_SECRET",       label: "Hash Secret",            secret: true },
  { group: "vnpay",      key: "VNPAY_URL",               label: "Payment Gateway URL",    secret: false },
  { group: "vnpay",      key: "VNPAY_RETURN_URL",        label: "Return URL",             secret: false, description: "URL backend nhận redirect sau thanh toán" },
  { group: "vnpay",      key: "VNPAY_IPN_URL",           label: "IPN URL",                secret: false, description: "URL backend nhận IPN server-to-server" },
  // GHN
  { group: "ghn",        key: "GHN_API_URL",             label: "API URL",                secret: false },
  { group: "ghn",        key: "GHN_TOKEN",               label: "API Token",              secret: true },
  { group: "ghn",        key: "GHN_SHOP_ID",             label: "Shop ID",                secret: false },
  { group: "ghn",        key: "GHN_DEV_MODE",            label: "Dev Mode (sandbox)",     secret: false, description: "true = sandbox, false = production" },
  // Cloudinary
  { group: "cloudinary", key: "CLOUDINARY_CLOUD_NAME",   label: "Cloud Name",             secret: false },
  { group: "cloudinary", key: "CLOUDINARY_API_KEY",      label: "API Key",                secret: false },
  { group: "cloudinary", key: "CLOUDINARY_API_SECRET",   label: "API Secret",             secret: true },
  { group: "cloudinary", key: "CLOUDINARY_FOLDER_ROOT",  label: "Root Folder",            secret: false },
];

const GROUP_META = {
  app:        { label: "Ứng dụng",          color: "#6366f1" },
  database:   { label: "Database",           color: "#0ea5e9" },
  auth:       { label: "Xác thực (JWT)",     color: "#10b981" },
  google:     { label: "Google OAuth",       color: "#ef4444" },
  smtp:       { label: "Email (SMTP)",        color: "#f97316" },
  paypal:     { label: "PayPal",             color: "#003087" },
  vnpay:      { label: "VNPay",              color: "#1d4ed8" },
  ghn:        { label: "GHN (Vận chuyển)",   color: "#059669" },
  cloudinary: { label: "Cloudinary (Ảnh)",   color: "#8b5cf6" },
};

function maskValue(val = "") {
  if (!val) return "";
  if (val.length <= 6) return "•".repeat(val.length);
  return val.slice(0, 3) + "•".repeat(Math.min(val.length - 6, 16)) + val.slice(-3);
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/** GET /api/admin/env-config — list all known env vars (secrets masked) */
exports.listEnvConfig = async (req, res) => {
  try {
    const groups = Object.entries(GROUP_META).map(([groupKey, meta]) => {
      const vars = ENV_SCHEMA
        .filter((s) => s.group === groupKey)
        .map((schema) => {
          const rawValue = process.env[schema.key] || "";
          return {
            key:         schema.key,
            label:       schema.label,
            description: schema.description || "",
            secret:      schema.secret,
            value:       schema.secret ? (rawValue ? maskValue(rawValue) : "") : rawValue,
            is_set:      !!rawValue,
          };
        });

      return { key: groupKey, ...meta, vars };
    });

    res.json({ data: { groups } });
  } catch (err) {
    console.error("[EnvConfig] listEnvConfig:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/** GET /api/admin/env-config/reveal/:key — return plain text value of a secret */
exports.revealEnvVar = async (req, res) => {
  try {
    const { key } = req.params;
    const schema = ENV_SCHEMA.find((s) => s.key === key);

    if (!schema)          return res.status(404).json({ message: "Unknown env key" });
    if (!schema.secret)   return res.status(400).json({ message: "This variable is not a secret — no reveal needed" });

    const value = process.env[key] || "";

    await auditLog.log({
      actorId:          req.user._id,
      action:           "env_config.reveal",
      targetCollection: "system",
      targetId:         key,
      ip:               auditLog.getIp(req),
      userAgent:        auditLog.getUA(req),
      metadata:         { key, group: schema.group },
    });

    res.json({ data: { key, value } });
  } catch (err) {
    console.error("[EnvConfig] revealEnvVar:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/** PATCH /api/admin/env-config — update one or more env vars in the .env file */
exports.updateEnvConfig = async (req, res) => {
  try {
    const updates = req.body.updates; // [{ key, value }]
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "updates array required" });
    }

    // Validate all keys are known
    const invalid = updates.filter((u) => !ENV_SCHEMA.find((s) => s.key === u.key));
    if (invalid.length) {
      return res.status(400).json({ message: `Unknown keys: ${invalid.map((u) => u.key).join(", ")}` });
    }

    // Read .env file
    let content = "";
    try {
      content = fs.readFileSync(ENV_PATH, "utf8");
    } catch {
      return res.status(500).json({ message: "Cannot read .env file" });
    }

    const changedKeys = [];
    let updatedContent = content;

    for (const { key, value } of updates) {
      if (value === undefined || value === null) continue;
      // Skip if the client sent back a masked placeholder
      if (typeof value === "string" && value.includes("•")) continue;

      const regex  = new RegExp(`^${key}=.*`, "m");
      const newLine = `${key}=${value}`;

      if (regex.test(updatedContent)) {
        updatedContent = updatedContent.replace(regex, newLine);
      } else {
        updatedContent += `\n${newLine}`;
      }

      // Apply immediately (useful for non-connection settings)
      process.env[key] = value;
      changedKeys.push(key);
    }

    if (changedKeys.length === 0) {
      return res.json({ message: "No changes to save." });
    }

    // Write back
    try {
      fs.writeFileSync(ENV_PATH, updatedContent, "utf8");
    } catch {
      return res.status(500).json({ message: "Cannot write .env file — check file permissions" });
    }

    await auditLog.log({
      actorId:          req.user._id,
      action:           "env_config.update",
      targetCollection: "system",
      ip:               auditLog.getIp(req),
      userAgent:        auditLog.getUA(req),
      metadata:         { keys: changedKeys },
    });

    res.json({ message: "Đã lưu. Một số thay đổi (database, redis, jwt) cần khởi động lại server để có hiệu lực.", changedKeys });
  } catch (err) {
    console.error("[EnvConfig] updateEnvConfig:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
