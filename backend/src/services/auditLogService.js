const AuditLog = require("../models/AuditLog");

/**
 * Create an audit log entry.
 * Safe: never throws — call from controllers without try/catch.
 */
async function log({ actorId, action, targetCollection, targetId, ip, userAgent, metadata } = {}) {
  try {
    await AuditLog.create({
      actor_id: actorId,
      action,
      target_collection: targetCollection,
      target_id: targetId,
      ip_address: ip,
      user_agent: userAgent,
      metadata,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write audit log:", err.message);
  }
}

/** Helper: extract IP from request */
function getIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/** Helper: extract user agent from request */
function getUA(req) {
  return req.headers["user-agent"] || "unknown";
}

module.exports = { log, getIp, getUA };
