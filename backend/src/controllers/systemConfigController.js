const SystemConfig = require("../models/SystemConfig");
const nodemailer   = require("nodemailer");
const auditLog     = require("../services/auditLogService");

/* ---------- default config definitions ---------- */
const DEFAULT_CONFIGS = [
  // SMTP
  { category: "smtp", key: "smtp_host",     label: "SMTP Host",     input_type: "text",     is_secret: false, value: "" },
  { category: "smtp", key: "smtp_port",     label: "SMTP Port",     input_type: "number",   is_secret: false, value: "587" },
  { category: "smtp", key: "smtp_secure",   label: "Use TLS/SSL",   input_type: "boolean",  is_secret: false, value: "false" },
  { category: "smtp", key: "smtp_user",     label: "SMTP Username", input_type: "text",     is_secret: false, value: "" },
  { category: "smtp", key: "smtp_pass",     label: "SMTP Password", input_type: "password", is_secret: true,  value: "" },
  { category: "smtp", key: "smtp_from",     label: "From Address",  input_type: "text",     is_secret: false, value: "" },
  // SMS
  { category: "sms",  key: "sms_provider",  label: "SMS Provider",  input_type: "text",     is_secret: false, value: "" },
  { category: "sms",  key: "sms_api_key",   label: "API Key",       input_type: "password", is_secret: true,  value: "" },
  { category: "sms",  key: "sms_sender",    label: "Sender Name",   input_type: "text",     is_secret: false, value: "" },
  { category: "sms",  key: "sms_base_url",  label: "Base URL",      input_type: "text",     is_secret: false, value: "" },
  // CDN
  { category: "cdn",  key: "cdn_provider",  label: "CDN Provider",  input_type: "text",     is_secret: false, value: "" },
  { category: "cdn",  key: "cdn_base_url",  label: "CDN Base URL",  input_type: "text",     is_secret: false, value: "" },
  { category: "cdn",  key: "cdn_api_key",   label: "API Key",       input_type: "password", is_secret: true,  value: "" },
  // Storage
  { category: "storage", key: "storage_provider",   label: "Storage Provider",   input_type: "text",     is_secret: false, value: "" },
  { category: "storage", key: "storage_bucket",     label: "Bucket / Container", input_type: "text",     is_secret: false, value: "" },
  { category: "storage", key: "storage_region",     label: "Region",             input_type: "text",     is_secret: false, value: "" },
  { category: "storage", key: "storage_access_key", label: "Access Key",         input_type: "password", is_secret: true,  value: "" },
  { category: "storage", key: "storage_secret_key", label: "Secret Key",         input_type: "password", is_secret: true,  value: "" },
  // Policy
  { category: "policy", key: "return_days",          label: "Default Return Period (days)", input_type: "number", is_secret: false, value: "7" },
  { category: "policy", key: "return_policy_text",   label: "Return Policy Text",           input_type: "text",   is_secret: false, value: "" },
  { category: "policy", key: "shipping_policy_text", label: "Shipping Policy Text",         input_type: "text",   is_secret: false, value: "" },
  { category: "policy", key: "about_us_text",        label: "About Us",                     input_type: "text",   is_secret: false, value: "" },
];

/** Seed default configs if they don't exist */
async function seedDefaults() {
  for (const cfg of DEFAULT_CONFIGS) {
    await SystemConfig.updateOne(
      { category: cfg.category, key: cfg.key },
      { $setOnInsert: cfg },
      { upsert: true }
    );
  }
}

/** GET /api/admin/system-config */
async function listConfigs(req, res) {
  try {
    await seedDefaults();

    const { category } = req.query;
    const filter = category ? { category } : {};

    const configs = await SystemConfig.find(filter)
      .populate("updated_by", "full_name email")
      .sort({ category: 1, key: 1 })
      .lean();

    // Mask secret values
    const result = configs.map((c) => ({
      ...c,
      value: c.is_secret && c.value ? "••••••••" : c.value,
      _raw_set: c.is_secret && c.value ? true : false,
    }));

    return res.json({ data: result });
  } catch (err) {
    console.error("[SystemConfig] listConfigs error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** PATCH /api/admin/system-config — bulk update array of {category, key, value} */
async function updateConfigs(req, res) {
  try {
    const updates = req.body.updates; // [{ category, key, value }]
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "updates array required" });
    }

    for (const u of updates) {
      if (!u.category || !u.key) continue;
      // Don't overwrite secret value if placeholder sent
      if (u.value === "••••••••") continue;

      await SystemConfig.findOneAndUpdate(
        { category: u.category, key: u.key },
        { value: u.value, updated_by: req.user._id },
        { upsert: true, new: true }
      );
    }

    await auditLog.log({
      actorId:          req.user._id,
      action:           "system_config.update",
      targetCollection: "system_configs",
      ip:               auditLog.getIp(req),
      userAgent:        auditLog.getUA(req),
      metadata:         { keys: updates.map((u) => `${u.category}.${u.key}`) },
    });

    return res.json({ message: "Saved" });
  } catch (err) {
    console.error("[SystemConfig] updateConfigs error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** POST /api/admin/system-config/test-smtp */
async function testSmtp(req, res) {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: "to email required" });

    // Read current SMTP config from DB
    const configs = await SystemConfig.find({ category: "smtp" }).lean();
    const get = (key) => configs.find((c) => c.key === key)?.value || "";

    const host    = get("smtp_host");
    const port    = parseInt(get("smtp_port") || "587", 10);
    const secure  = get("smtp_secure") === "true";
    const user    = get("smtp_user");
    const pass    = get("smtp_pass");
    const from    = get("smtp_from") || user;

    if (!host || !user || !pass) {
      return res.status(400).json({ message: "SMTP config incomplete (host, user, password required)" });
    }

    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    await transporter.verify();
    await transporter.sendMail({
      from: `"DFS System" <${from}>`,
      to,
      subject: "✅ SMTP Test - DFS",
      text: "This is a test email from DFS system configuration.",
    });

    await auditLog.log({
      actorId:          req.user._id,
      action:           "system_config.test_smtp",
      targetCollection: "system_configs",
      ip:               auditLog.getIp(req),
      userAgent:        auditLog.getUA(req),
      metadata:         { to, host, port },
    });

    return res.json({ message: "Test email sent successfully" });
  } catch (err) {
    console.error("[SystemConfig] testSmtp error:", err);
    return res.status(500).json({ message: `SMTP test failed: ${err.message}` });
  }
}

module.exports = { listConfigs, updateConfigs, testSmtp };
