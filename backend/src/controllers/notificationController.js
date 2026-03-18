const svc = require("../services/dbNotificationService");

const ok  = (res, data)    => res.json({ status: "success", data });
const bad = (res, e, fb)   => res.status(e?.status || 400).json({ status: "fail", message: e?.message || fb });

// GET /api/notifications?page=1&limit=20
exports.list = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    const result = await svc.getUserNotifications(userId, page, limit);
    ok(res, result);
  } catch (e) { bad(res, e, "Failed to get notifications"); }
};

// GET /api/notifications/unread-count
exports.unreadCount = async (req, res) => {
  try {
    const count = await svc.getUnreadCount(req.userId);
    ok(res, { count });
  } catch (e) { bad(res, e, "Failed to get unread count"); }
};

// PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    const doc = await svc.markRead(req.params.id, req.userId);
    ok(res, doc);
  } catch (e) { bad(res, e, "Failed to mark read"); }
};

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    const result = await svc.markAllRead(req.userId);
    ok(res, result);
  } catch (e) { bad(res, e, "Failed to mark all read"); }
};

// DELETE /api/notifications/:id
exports.remove = async (req, res) => {
  try {
    await svc.deleteNotification(req.params.id, req.userId);
    ok(res, { deleted: true });
  } catch (e) { bad(res, e, "Failed to delete notification"); }
};
