const AuditLog = require("../models/AuditLog");

const LIMIT = 50;

/** GET /api/admin/audit-logs */
async function listLogs(req, res) {
  try {
    const {
      actor,       // actor_id substring
      action,      // action substring
      collection,  // target_collection
      from,        // ISO date string
      to,          // ISO date string
      page = 1,
      limit = LIMIT,
    } = req.query;

    const filter = {};

    if (actor)      filter.actor_id         = { $regex: actor, $options: "i" };
    if (action)     filter.action           = { $regex: action, $options: "i" };
    if (collection) filter.target_collection = collection;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to + "T23:59:59Z");
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await AuditLog.countDocuments(filter);

    const logs = await AuditLog.find(filter)
      .populate("actor_id", "full_name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    return res.json({ data: logs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error("[AuditLog] listLogs error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** GET /api/admin/audit-logs/actions — distinct action values for filter dropdown */
async function listActions(req, res) {
  try {
    const actions = await AuditLog.distinct("action");
    return res.json({ data: actions.sort() });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** GET /api/admin/audit-logs/collections — distinct target_collection values */
async function listCollections(req, res) {
  try {
    const cols = await AuditLog.distinct("target_collection");
    return res.json({ data: cols.filter(Boolean).sort() });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = { listLogs, listActions, listCollections };
