/**
 * dbNotificationService.js
 *
 * In-app notification CRUD + real-time emission via socketManager.
 * Keeps notifications in MongoDB.  Does NOT touch existing schemas.
 */

const Notification  = require("../models/Notification");
const socketManager = require("../config/socketManager");

const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 20;

// ─────────────────────────────────────────────────────────────────────────────
// create — persist + emit in real-time
// ─────────────────────────────────────────────────────────────────────────────
async function create(userId, { title, message, type = "system", subtype = null, link = null }) {
  const doc = await Notification.create({ userId, title, message, type, subtype, link });
  // Real-time push (non-fatal)
  socketManager.emitToUser(String(userId), "notification:new", {
    _id:       String(doc._id),
    title:     doc.title,
    message:   doc.message,
    type:      doc.type,
    subtype:   doc.subtype,
    link:      doc.link,
    isRead:    false,
    createdAt: doc.createdAt,
  });
  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// getUserNotifications — paginated list (newest first)
// ─────────────────────────────────────────────────────────────────────────────
async function getUserNotifications(userId, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) {
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Notification.countDocuments({ userId }),
  ]);
  return { items, total, page: Number(page), limit: Number(limit) };
}

// ─────────────────────────────────────────────────────────────────────────────
// getUnreadCount
// ─────────────────────────────────────────────────────────────────────────────
async function getUnreadCount(userId) {
  return Notification.countDocuments({ userId, isRead: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// markRead — mark a single notification as read (ownership check)
// ─────────────────────────────────────────────────────────────────────────────
async function markRead(notifId, userId) {
  const doc = await Notification.findOneAndUpdate(
    { _id: notifId, userId },
    { $set: { isRead: true } },
    { new: true }
  );
  if (!doc) throw Object.assign(new Error("Notification not found"), { status: 404 });
  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// markAllRead
// ─────────────────────────────────────────────────────────────────────────────
async function markAllRead(userId) {
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );
  return { modified: result.modifiedCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteNotification
// ─────────────────────────────────────────────────────────────────────────────
async function deleteNotification(notifId, userId) {
  const doc = await Notification.findOneAndDelete({ _id: notifId, userId });
  if (!doc) throw Object.assign(new Error("Notification not found"), { status: 404 });
  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience helpers — used by other services to fire typed notifications
// All wrapped in try/catch so they never crash the calling flow.
// ─────────────────────────────────────────────────────────────────────────────

const helpers = {
  orderPlaced: (userId, orderCode) =>
    create(userId, {
      title:   "Đặt hàng thành công",
      message: `Đơn hàng #${orderCode} đã được đặt thành công. Chúng tôi sẽ sớm xác nhận.`,
      type:    "order",
      subtype: "order.placed",
      link:    `/orders`,
    }),

  orderConfirmed: (userId, orderCode) =>
    create(userId, {
      title:   "Đơn hàng đã xác nhận",
      message: `Đơn hàng #${orderCode} đã được xác nhận và đang được chuẩn bị.`,
      type:    "order",
      subtype: "order.confirmed",
      link:    `/orders`,
    }),

  orderShipped: (userId, orderCode) =>
    create(userId, {
      title:   "Đơn hàng đang giao",
      message: `Đơn hàng #${orderCode} đang trên đường giao đến bạn.`,
      type:    "order",
      subtype: "order.shipped",
      link:    `/orders`,
    }),

  orderDelivered: (userId, orderCode) =>
    create(userId, {
      title:   "Giao hàng thành công",
      message: `Đơn hàng #${orderCode} đã được giao thành công. Cảm ơn bạn!`,
      type:    "order",
      subtype: "order.delivered",
      link:    `/orders`,
    }),

  orderCancelled: (userId, orderCode) =>
    create(userId, {
      title:   "Đơn hàng đã hủy",
      message: `Đơn hàng #${orderCode} đã được hủy theo yêu cầu của bạn.`,
      type:    "order",
      subtype: "order.cancelled",
      link:    `/orders`,
    }),

  paymentSuccess: (userId, orderCode, amount) =>
    create(userId, {
      title:   "Thanh toán thành công",
      message: `Thanh toán cho đơn hàng #${orderCode}${amount ? ` (${Number(amount).toLocaleString("vi-VN")} ₫)` : ""} đã thành công.`,
      type:    "payment",
      subtype: "payment.success",
      link:    `/orders`,
    }),

  paymentFailed: (userId, orderCode) =>
    create(userId, {
      title:   "Thanh toán thất bại",
      message: `Thanh toán cho đơn hàng #${orderCode} không thành công. Vui lòng thử lại.`,
      type:    "payment",
      subtype: "payment.failed",
      link:    `/orders`,
    }),

  passwordChanged: (userId) =>
    create(userId, {
      title:   "Mật khẩu đã thay đổi",
      message: "Mật khẩu tài khoản của bạn vừa được cập nhật thành công.",
      type:    "system",
      subtype: "system.password",
      link:    `/profile`,
    }),

  passwordReset: (userId) =>
    create(userId, {
      title:   "Đặt lại mật khẩu thành công",
      message: "Mật khẩu của bạn đã được đặt lại. Nếu không phải bạn, hãy liên hệ hỗ trợ ngay.",
      type:    "system",
      subtype: "system.security",
      link:    `/profile`,
    }),

  // ── Refund / Return / Exchange ───────────────────────────────────────────

  refundRequested: (shopOwnerId, orderCode) =>
    create(shopOwnerId, {
      title:   "Yêu cầu hoàn/đổi mới",
      message: `Đơn hàng #${orderCode} có yêu cầu hoàn/đổi từ khách hàng. Vui lòng xem xét.`,
      type:    "refund",
      subtype: "refund.requested",
      link:    `/shop/refunds`,
    }),

  refundApproved: (userId, orderCode) =>
    create(userId, {
      title:   "Yêu cầu hoàn/đổi được duyệt",
      message: `Yêu cầu hoàn/đổi cho đơn hàng #${orderCode} đã được shop chấp nhận.`,
      type:    "refund",
      subtype: "refund.approved",
      link:    `/orders`,
    }),

  refundRejected: (userId, orderCode, shopNote) =>
    create(userId, {
      title:   "Yêu cầu hoàn/đổi bị từ chối",
      message: `Yêu cầu hoàn/đổi cho đơn hàng #${orderCode} đã bị từ chối${shopNote ? `: ${shopNote}` : "."}`,
      type:    "refund",
      subtype: "refund.rejected",
      link:    `/orders`,
    }),

  refundCompleted: (userId, orderCode) =>
    create(userId, {
      title:   "Hoàn tiền/đổi hàng hoàn tất",
      message: `Yêu cầu hoàn/đổi cho đơn hàng #${orderCode} đã được xử lý hoàn tất.`,
      type:    "refund",
      subtype: "refund.completed",
      link:    `/orders`,
    }),

  // ── Review Moderation ────────────────────────────────────────────────────

  reviewFlagged: (userId) =>
    create(userId, {
      title:   "Đánh giá của bạn đang chờ kiểm duyệt",
      message: "Đánh giá của bạn chứa nội dung cần xem xét. Vui lòng chỉnh sửa hoặc chờ admin duyệt.",
      type:    "system",
      subtype: "review.flagged",
      link:    `/reviews`,
    }),

  reviewApproved: (userId) =>
    create(userId, {
      title:   "Đánh giá đã được duyệt",
      message: "Đánh giá của bạn đã được kiểm duyệt và hiển thị công khai.",
      type:    "system",
      subtype: "review.approved",
      link:    `/reviews`,
    }),

  userWarned: (userId, warningCount) =>
    create(userId, {
      title:   "Cảnh báo tài khoản",
      message: `Tài khoản của bạn đã nhận ${warningCount} cảnh báo do vi phạm nội dung. Tiếp tục vi phạm có thể dẫn đến khóa tài khoản.`,
      type:    "system",
      subtype: "account.warned",
      link:    `/profile`,
    }),

  userBanned: (userId, duration) =>
    create(userId, {
      title:   "Tài khoản bị khóa",
      message: `Tài khoản của bạn đã bị khóa ${duration} do vi phạm chính sách nội dung.`,
      type:    "system",
      subtype: "account.banned",
      link:    `/profile`,
    }),

  // ── Shop Marketing ────────────────────────────────────────────────────────

  voucherReceived: (userId, shopName, voucherCode, discountLabel) =>
    create(userId, {
      title:   `🎁 Bạn nhận được voucher từ ${shopName}`,
      message: `Shop ${shopName} gửi tặng bạn voucher "${voucherCode}" — Giảm ${discountLabel}. Áp dụng ngay khi đặt hàng!`,
      type:    "promotion",
      subtype: "voucher.received",
      link:    `/vouchers`,
    }),

  creditsReceived: (userId, shopName, amount, newBalance) =>
    create(userId, {
      title:   `💰 Bạn nhận được ${amount.toLocaleString("vi-VN")}₫ tín dụng từ ${shopName}`,
      message: `Shop ${shopName} đã tặng ${amount.toLocaleString("vi-VN")}₫ tín dụng cửa hàng cho bạn. Số dư hiện tại: ${newBalance.toLocaleString("vi-VN")}₫.`,
      type:    "promotion",
      subtype: "credits.received",
      link:    `/profile`,
    }),

  shopAnnouncement: (userId, shopName, title, message) =>
    create(userId, {
      title:   `📢 ${shopName}: ${title}`,
      message,
      type:    "promotion",
      subtype: "shop.announcement",
      link:    `/`,
    }),
};

// Safe wrappers (non-fatal)
const safe = {};
for (const [key, fn] of Object.entries(helpers)) {
  safe[key] = async (...args) => {
    try { return await fn(...args); }
    catch (err) { console.error(`[dbNotif] ${key} error:`, err.message); }
  };
}

module.exports = {
  create,
  getUserNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  ...safe,
};
