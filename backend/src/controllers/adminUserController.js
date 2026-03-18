const User     = require("../models/User");
const Role     = require("../models/Role");
const Shop     = require("../models/Shop");
const Order    = require("../models/Order");
const auditLog = require("../services/auditLogService");
const notif    = require("../services/dbNotificationService");

const LIMIT = 20;

/* ─── List all users ─────────────────────────────────────────── */
exports.listUsers = async (req, res, next) => {
  try {
    const { q, role, status, page = 1, limit = LIMIT } = req.query;

    const filter = {};
    if (q) {
      filter.$or = [
        { name:     { $regex: q, $options: "i" } },
        { email:    { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
        { phone:    { $regex: q, $options: "i" } },
      ];
    }
    if (status) filter.status = status;

    // role filter: lookup role by name then match role_id
    let roleIds = null;
    if (role) {
      const roleDoc = await Role.findOne({ name: role }).lean();
      if (roleDoc) {
        filter.role_id = roleDoc._id;
      } else {
        return res.json({ data: { items: [], total: 0, page: 1, limit: Number(limit) } });
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("role_id", "name")
        .select("-password_hash -refresh_token -wishlist -recently_viewed -preferences")
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.json({ data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (e) { next(e); }
};

/* ─── Get single user detail ─────────────────────────────────── */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("role_id", "name permissions")
      .select("-password_hash -refresh_token")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    // Also fetch their shop if any
    const shop = await Shop.findOne({ owner_id: req.params.id }).lean();

    // Stats
    const orderCount = await Order.countDocuments({ user_id: req.params.id });

    return res.json({ data: { ...user, shop, order_count: orderCount } });
  } catch (e) { next(e); }
};

/* ─── Update role ────────────────────────────────────────────── */
exports.updateRole = async (req, res, next) => {
  try {
    const { role_name } = req.body;
    if (!role_name) return res.status(400).json({ message: "role_name required" });

    const role = await Role.findOne({ name: role_name }).lean();
    if (!role) return res.status(404).json({ message: `Role '${role_name}' not found` });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role_id: role._id },
      { new: true }
    ).populate("role_id", "name").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    await auditLog.log({
      actorId: req.user._id, action: "user.update_role",
      targetCollection: "users", targetId: String(user._id),
      ip: auditLog.getIp(req), userAgent: auditLog.getUA(req),
      metadata: { name: user.name, new_role: role_name },
    });

    return res.json({ data: user });
  } catch (e) { next(e); }
};

/* ─── Ban user ───────────────────────────────────────────────── */
exports.banUser = async (req, res, next) => {
  try {
    const { days, reason = "Violation of platform policy" } = req.body || {};
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.status    = "banned";
    user.ban_until = days ? new Date(Date.now() + Number(days) * 86400000) : null;
    user.violation_history = user.violation_history || [];
    user.violation_history.push({ reason: `Admin ban: ${reason}`, at: new Date() });
    await user.save();

    const duration = days ? `${days} days` : "permanent";
    notif.userBanned && notif.userBanned(user._id, duration).catch(() => {});

    await auditLog.log({
      actorId: req.user._id, action: "user.ban",
      targetCollection: "users", targetId: String(user._id),
      ip: auditLog.getIp(req), userAgent: auditLog.getUA(req),
      metadata: { name: user.name, reason, duration },
    });

    return res.json({ data: { status: user.status, ban_until: user.ban_until } });
  } catch (e) { next(e); }
};

/* ─── Unban user ─────────────────────────────────────────────── */
exports.unbanUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "active", ban_until: null },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    await auditLog.log({
      actorId: req.user._id, action: "user.unban",
      targetCollection: "users", targetId: String(user._id),
      ip: auditLog.getIp(req), userAgent: auditLog.getUA(req),
      metadata: { name: user.name },
    });

    return res.json({ data: { status: user.status } });
  } catch (e) { next(e); }
};

/* ─── Warn user ──────────────────────────────────────────────── */
exports.warnUser = async (req, res, next) => {
  try {
    const { reason = "Content violation" } = req.body || {};
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.warning_count = (user.warning_count || 0) + 1;
    user.violation_history = user.violation_history || [];
    user.violation_history.push({ reason: `Admin warn: ${reason}`, at: new Date() });
    await user.save();

    notif.userWarned && notif.userWarned(user._id, user.warning_count).catch(() => {});

    await auditLog.log({
      actorId: req.user._id, action: "user.warn",
      targetCollection: "users", targetId: String(user._id),
      ip: auditLog.getIp(req), userAgent: auditLog.getUA(req),
      metadata: { name: user.name, reason, warning_count: user.warning_count },
    });

    return res.json({ data: { warning_count: user.warning_count } });
  } catch (e) { next(e); }
};

/* ─── List all roles ─────────────────────────────────────────── */
exports.listRoles = async (req, res, next) => {
  try {
    const roles = await Role.find().lean();
    return res.json({ data: roles });
  } catch (e) { next(e); }
};
