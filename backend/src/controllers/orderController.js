const { getRevenueByCategory } = require("../services/orderService");

const Order = require("../models/Order");
const Role = require("../models/Role");
const Cart = require("../models/Cart");
const Refund = require("../models/Refund");
const Ticket = require("../models/Ticket");
const shippingSvc = require("../services/shippingService");
const invoiceSvc = require("../services/invoiceService");
const { v4: uuidv4 } = require("uuid");
const notification = require("../services/notificationService");
const notif        = require("../services/dbNotificationService");
const User = require("../models/User");
const Shop = require("../models/Shop");

const SAFE_FIELDS =
  "_id order_code items address_id voucher_id payment_method payment_status shipping_provider shipping_fee total_price note status inventory_adjusted createdAt updatedAt";

const STATUS_MAP = {
  pending: "Chờ xác nhận",
  confirmed: "Đang xử lý",
  processing: "Đang xử lý",
  shipping: "Đang giao",
  delivered: "Hoàn thành",
  canceled: "Đã hủy",
  refund_pending: "Chờ hoàn tiền/đổi trả",
  refund_completed: "Hoàn tiền/Đổi trả xong",
  review: "Cần kiểm tra",
};

// ================== LIST ==================
exports.list = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    const { status, page = 1, limit = 10, q } = req.query;

    const cond = { user_id: userId };
    if (status) cond.status = status;
    if (q) cond.order_code = new RegExp(q, "i");

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Order.find(cond)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select(SAFE_FIELDS)
        .lean(),
      Order.countDocuments(cond),
    ]);

    res.json({
      status: "success",
      data: { items, total, page: Number(page), limit: Number(limit) },
    });
  } catch (e) {
    next(e);
  }
};

// ================== DETAIL ==================
exports.detail = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    const id = req.params.id;

    const ord = await Order.findOne({
      user_id: userId,
      $or: [{ _id: id }, { order_code: id }],
    }).lean();

    if (!ord)
      return res
        .status(404)
        .json({ status: "fail", message: "Không tìm thấy đơn" });

    ord.status_text = STATUS_MAP[ord.status] || ord.status;

    res.json({ status: "success", data: ord });
  } catch (e) {
    next(e);
  }
};

// ================== CANCEL ==================
exports.cancel = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    const id = req.params.id;

    const ord = await Order.findOne({
      user_id: userId,
      $or: [{ _id: id }, { order_code: id }],
    });

    if (!ord)
      return res
        .status(404)
        .json({ status: "fail", message: "Không tìm thấy đơn" });

    if (["shipping", "delivered"].includes(ord.status)) {
      return res.status(400).json({
        status: "fail",
        message: "Đơn đang giao/đã giao, không thể hủy.",
      });
    }

    const user = await User.findById(userId).populate('role_id').lean();

    if (!user) {
      return res.status(404).json({ status: "fail", message: "Không tìm thấy người dùng" });
    } else {
      const role_id = user.role_id;
      const role = await Role.findById(role_id).lean();
      if (role.name === "shop_owner") {
        ord.status = "canceled_by_shop";
        if (ord.payment_status === "paid") {
          ord.payment_status = "refund_pending";
        }
        await ord.save();
      } else if (role.name === "customer") {
        ord.status = "canceled_by_customer";
        if (ord.payment_status === "paid") {
          ord.payment_status = "refund_pending";
        }
        await ord.save();
      }
    }

    notif.orderCancelled(userId, ord.order_code).catch(() => {});

    res.json({
      status: "success",
      data: { order_id: ord._id, status: ord.status },
    });
  } catch (e) {
    next(e);
  }
};

// ================== REORDER ==================
exports.reorder = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    const id = req.params.id;

    const ord = await Order.findOne({
      user_id: userId,
      $or: [{ _id: id }, { order_code: id }],
    }).lean();

    if (!ord)
      return res
        .status(404)
        .json({ status: "fail", message: "Không tìm thấy đơn" });

    let cart = await Cart.findOne({ user_id: userId });
    if (!cart)
      cart = await Cart.create({
        _id: `cart-${uuidv4()}`,
        user_id: userId,
        items: [],
      });

    const mapKey = (it) => `${it.product_id}-${it.variant_id || ""}`;
    const ex = new Map((cart.items || []).map((i) => [mapKey(i), i]));

    for (const it of ord.items || []) {
      const key = mapKey(it);
      const exist = ex.get(key);
      if (exist) {
        exist.qty = (exist.qty || 0) + (it.qty || 1);
      } else {
        cart.items.push({
          _id: `ci-${uuidv4()}`,
          product_id: it.product_id,
          variant_id: it.variant_id,
          name: it.name,
          image: it.image_url,
          qty: it.qty || 1,
          price: it.price,
        });
      }
    }

    await cart.save();

    res.json({
      status: "success",
      data: { cart_id: cart._id, count: cart.items.length },
    });
  } catch (e) {
    next(e);
  }
};

// ================== REQUEST REFUND / RETURN / EXCHANGE ==================
exports.requestRefund = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    const id     = req.params.id;
    const { reason, type = "refund", images = [] } = req.body || {};

    if (!reason || !reason.trim()) {
      return res.status(400).json({ status: "fail", message: "Vui lòng nêu rõ lý do." });
    }

    const VALID_TYPES = ["refund", "return", "exchange"];
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ status: "fail", message: "Loại yêu cầu không hợp lệ." });
    }

    const ord = await Order.findOne({
      user_id: userId,
      $or: [{ _id: id }, { order_code: id }],
    });

    if (!ord)
      return res.status(404).json({ status: "fail", message: "Không tìm thấy đơn" });

    if (ord.status !== "delivered") {
      return res.status(400).json({
        status: "fail",
        message: "Chỉ yêu cầu hoàn/đổi sau khi đơn đã giao thành công.",
      });
    }

    // Check 3-day window
    const diffDays = (Date.now() - new Date(ord.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 3) {
      return res.status(400).json({
        status: "fail",
        message: "Đã quá hạn 3 ngày để yêu cầu hoàn/đổi.",
      });
    }

    // Prevent duplicate active request
    const existing = await Refund.findOne({
      order_id: ord._id,
      status: { $in: ["pending", "approved"] },
    }).lean();
    if (existing) {
      return res.status(400).json({
        status: "fail",
        message: "Đơn hàng này đã có yêu cầu hoàn/đổi đang xử lý.",
      });
    }

    const refund = await Refund.create({
      order_id: ord._id,
      user_id:  userId,
      type,
      reason:   reason.trim(),
      images,
      amount:   ord.total_price,
      status:   "pending",
    });

    ord.status = "return_requested";
    if (!ord.status_history) ord.status_history = [];
    ord.status_history.push({ status: "return_requested", at: new Date(), by: "customer", note: `${type}: ${reason.trim()}` });
    await ord.save();

    // Notify shop owner
    if (ord.shop_id) {
      const shop = await Shop.findById(ord.shop_id).lean();
      if (shop?.owner_id) {
        notif.refundRequested(shop.owner_id, ord.order_code).catch(() => {});
      }
    }

    res.json({
      status: "success",
      data: { refund_id: refund._id, order_status: ord.status },
    });
  } catch (e) {
    next(e);
  }
};

// ================== TRACKING ==================
const TRACKING_LABELS = {
  order_created:         "Đặt hàng thành công",
  pending:               "Đặt hàng thành công",
  payment_pending:       "Chờ thanh toán",
  payment_confirmed:     "Thanh toán thành công",
  payment_failed:        "Thanh toán thất bại",
  confirmed:             "Shop đã xác nhận đơn hàng",
  processing:            "Shop đang chuẩn bị hàng",
  packed:                "Đã đóng gói, sẵn sàng giao",
  picking:               "Shipper đang lấy hàng",
  in_transit:            "Đang vận chuyển",
  out_for_delivery:      "Đang giao đến bạn",
  delivered:             "Giao hàng thành công",
  delivery_failed:       "Giao hàng thất bại",
  cancelled_by_customer: "Khách hàng đã hủy đơn",
  cancelled_by_shop:     "Shop đã hủy đơn",
  canceled_by_customer:  "Khách hàng đã hủy đơn",
  canceled_by_shop:      "Shop đã hủy đơn",
  return_requested:      "Yêu cầu hoàn/đổi hàng",
  return_approved:       "Đã duyệt hoàn/đổi hàng",
  return_rejected:       "Từ chối hoàn/đổi hàng",
  refund_pending:        "Đang xử lý hoàn tiền",
  refund_completed:      "Đã hoàn tiền thành công",
};

exports.tracking = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    const id = req.params.id;

    const ord = await Order.findOne({
      user_id: userId,
      $or: [{ _id: id }, { order_code: id }],
    }).lean();

    if (!ord)
      return res.status(404).json({ status: "fail", message: "Không tìm thấy đơn" });

    // Build steps from status_history (real audit trail)
    let steps = [];
    if (ord.status_history && ord.status_history.length > 0) {
      steps = ord.status_history.map((h) => ({
        code: h.status,
        text: TRACKING_LABELS[h.status] || h.status,
        at:   h.at,
        note: h.note || "",
      }));
    } else {
      // Fallback: single step from current status
      steps = [{
        code: ord.status,
        text: TRACKING_LABELS[ord.status] || ord.status,
        at:   ord.updatedAt || ord.createdAt,
      }];
    }

    // Try to fetch real GHN tracking logs
    let ghn_logs  = [];
    let ghn_status = null;
    if (ord.ghn_order_code) {
      try {
        const ghnSvc = require("../services/ghnService");
        const ghnDetail = await ghnSvc.getOrderDetail(ord.ghn_order_code);
        ghn_logs  = ghnDetail?.log || [];
        ghn_status = ghnDetail?.status || null;
        // Merge GHN logs as additional steps if they exist
        if (ghn_logs.length) {
          const ghnSteps = ghn_logs.map((l) => ({
            code: (l.status || "").toLowerCase(),
            text: l.status || "GHN update",
            at:   l.updated_date ? new Date(l.updated_date) : new Date(),
            note: l.location || "",
            source: "ghn",
          }));
          // Append and sort all steps chronologically
          steps = [...steps, ...ghnSteps].sort((a, b) => new Date(a.at) - new Date(b.at));
        }
      } catch (e) {
        console.warn("[Tracking] GHN fetch failed:", e.message);
      }
    }

    res.json({
      status: "success",
      data: {
        provider:          ord.shipping_provider || "NONE",
        order_code:        ord.order_code,
        ghn_order_code:    ord.ghn_order_code || null,
        ghn_status,
        steps,
        current:           ord.status,
        expected_delivery: ord.expected_delivery || null,
      },
    });
  } catch (e) {
    next(e);
  }
};

// ================== INVOICE PDF ==================
exports.invoicePdf = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    const id = req.params.id;

    const ord = await Order.findOne({
      user_id: userId,
      $or: [{ _id: id }, { order_code: id }],
    });

    if (!ord)
      return res
        .status(404)
        .json({ status: "fail", message: "Không tìm thấy đơn" });

    const url = await invoiceSvc.generateInvoice(ord.toObject());

    res.json({ status: "success", data: { url } });
  } catch (e) {
    next(e);
  }
};

// ================== SEND REVIEW REMINDER ==================
exports.sendReviewReminder = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    const id = req.params.id;

    const ord = await Order.findOne({
      user_id: userId,
      $or: [{ _id: id }, { order_code: id }],
    }).lean();

    if (!ord)
      return res
        .status(404)
        .json({ status: "fail", message: "Không tìm thấy đơn" });

    if (ord.status !== "delivered") {
      return res.status(400).json({
        status: "fail",
        message: "Chỉ nhắc đánh giá khi đơn đã hoàn thành.",
      });
    }

    const user = await User.findById(userId).lean();
    const email = user?.email;
    const pushToken = user?.push_token;

    if (email) {
      await notification.sendEmail(
        email,
        `Đánh giá đơn hàng ${ord.order_code}`,
        `Đơn ${ord.order_code} đã hoàn thành. Mời bạn để lại đánh giá: ${process.env.FRONTEND_URL}/orders/${ord._id}`
      );
    }

    if (pushToken) {
      await notification.sendPush({
        token: pushToken,
        title: "Đánh giá đơn hàng",
        body: `Đơn ${ord.order_code} đã hoàn thành – mời bạn đánh giá!`,
        data: { order_id: ord._id },
      });
    }

    res.json({
      status: "success",
      data: { mailed: !!email, pushed: !!pushToken },
    });
  } catch (e) {
    next(e);
  }
};

exports.getRevenueByCategoryController = async (req, res) => {
  try {
    const data = await getRevenueByCategory();
    res.status(200).json({
      success: true,
      message: "Lấy doanh thu theo danh mục thành công",
      data,
    });
  } catch (error) {
    console.error("Error in getRevenueByCategoryController:", error);
    res.status(500).json({
      success: false,
      message: "Không thể lấy doanh thu theo danh mục",
    });
  }
};
