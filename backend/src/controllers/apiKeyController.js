const ApiKey   = require("../models/ApiKey");
const auditLog = require("../services/auditLogService");

/** GET /api/admin/api-keys */
async function listKeys(req, res) {
  try {
    const { service, environment } = req.query;
    const filter = {};
    if (service)     filter.service     = service;
    if (environment) filter.environment = environment;

    const keys = await ApiKey.find(filter)
      .populate("created_by", "full_name email")
      .populate("updated_by", "full_name email")
      .sort({ service: 1, key_name: 1 })
      .lean();

    // Mask the key: show first 4 + *** + last 4
    const masked = keys.map((k) => ({
      ...k,
      api_key_masked: maskKey(k.api_key),
    }));

    return res.json({ data: masked });
  } catch (err) {
    console.error("[ApiKey] listKeys error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** GET /api/admin/api-keys/:id/reveal — full key (sensitive) */
async function revealKey(req, res) {
  try {
    const key = await ApiKey.findById(req.params.id).lean();
    if (!key) return res.status(404).json({ message: "Not found" });

    await auditLog.log({
      actorId:          req.user._id,
      action:           "api_key.reveal",
      targetCollection: "api_keys",
      targetId:         String(key._id),
      ip:               auditLog.getIp(req),
      userAgent:        auditLog.getUA(req),
      metadata:         { service: key.service, key_name: key.key_name },
    });

    return res.json({ data: { api_key: key.api_key } });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** POST /api/admin/api-keys */
async function createKey(req, res) {
  try {
    const { service, key_name, api_key, environment, expires_at, note } = req.body;
    if (!service || !key_name || !api_key) {
      return res.status(400).json({ message: "service, key_name, api_key are required" });
    }

    const key = await ApiKey.create({
      service,
      key_name,
      api_key,
      environment: environment || "sandbox",
      expires_at: expires_at || null,
      note: note || "",
      created_by: req.user._id,
      updated_by: req.user._id,
    });

    await auditLog.log({
      actorId:          req.user._id,
      action:           "api_key.create",
      targetCollection: "api_keys",
      targetId:         String(key._id),
      ip:               auditLog.getIp(req),
      userAgent:        auditLog.getUA(req),
      metadata:         { service, key_name, environment },
    });

    return res.status(201).json({ data: { ...key.toObject(), api_key_masked: maskKey(key.api_key) } });
  } catch (err) {
    console.error("[ApiKey] createKey error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** PATCH /api/admin/api-keys/:id */
async function updateKey(req, res) {
  try {
    const { service, key_name, api_key, environment, expires_at, note, is_active } = req.body;
    const update = { updated_by: req.user._id };

    if (service     !== undefined) update.service     = service;
    if (key_name    !== undefined) update.key_name    = key_name;
    if (api_key     !== undefined) update.api_key     = api_key;
    if (environment !== undefined) update.environment = environment;
    if (expires_at  !== undefined) update.expires_at  = expires_at;
    if (note        !== undefined) update.note        = note;
    if (is_active   !== undefined) update.is_active   = is_active;

    const key = await ApiKey.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!key) return res.status(404).json({ message: "Not found" });

    await auditLog.log({
      actorId:          req.user._id,
      action:           "api_key.update",
      targetCollection: "api_keys",
      targetId:         String(key._id),
      ip:               auditLog.getIp(req),
      userAgent:        auditLog.getUA(req),
      metadata:         { service: key.service, key_name: key.key_name, changes: Object.keys(update) },
    });

    return res.json({ data: { ...key, api_key_masked: maskKey(key.api_key) } });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** DELETE /api/admin/api-keys/:id */
async function deleteKey(req, res) {
  try {
    const key = await ApiKey.findByIdAndDelete(req.params.id).lean();
    if (!key) return res.status(404).json({ message: "Not found" });

    await auditLog.log({
      actorId:          req.user._id,
      action:           "api_key.delete",
      targetCollection: "api_keys",
      targetId:         String(key._id),
      ip:               auditLog.getIp(req),
      userAgent:        auditLog.getUA(req),
      metadata:         { service: key.service, key_name: key.key_name },
    });

    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

function maskKey(key = "") {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

module.exports = { listKeys, revealKey, createKey, updateKey, deleteKey };
