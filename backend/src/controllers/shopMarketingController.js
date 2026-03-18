// controllers/shopMarketingController.js
// Shop-owner marketing tools: campaigns, voucher distribution, shop credits

const Voucher      = require("../models/Voucher");
const ShopCredit   = require("../models/ShopCredit");
const ShopCampaign = require("../models/ShopCampaign");
const Order        = require("../models/Order");
const User         = require("../models/User");
const Shop         = require("../models/Shop");
const notif        = require("../services/dbNotificationService");
const emailSvc     = require("../services/notificationService");

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Resolve recipient User records based on recipient_type
async function resolveRecipients(shopId, recipientType, customUserIds = []) {
  if (recipientType === "custom") {
    const ids = customUserIds.filter(Boolean);
    if (!ids.length) return [];
    return User.find({ _id: { $in: ids }, status: "active" })
      .select("_id email username name").lean();
  }

  const matchQuery = { shop_id: shopId };
  if (recipientType === "recent_30d") {
    matchQuery.createdAt = { $gte: new Date(Date.now() - 30 * 86400_000) };
  }
  const userIds = await Order.distinct("user_id", matchQuery);
  return User.find({ _id: { $in: userIds }, status: "active" })
    .select("_id email username name").lean();
}

// Dispatch in-app + email to an array of User objects
async function dispatch(recipients, channels, inAppFn, emailSubject, emailBodyFn) {
  let sent = 0, failed = 0;
  for (const user of recipients) {
    try {
      if (channels.includes("in_app")) {
        await inAppFn(user._id);
      }
      if (channels.includes("email") && user.email) {
        await emailSvc.sendEmail(user.email, emailSubject, emailBodyFn(user));
      }
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shop/marketing/campaigns  — General announcement broadcast
// ─────────────────────────────────────────────────────────────────────────────
exports.createCampaign = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const shop   = req.shop;
    const { title, message, recipient_type = "all_buyers", custom_user_ids = [], channels = ["in_app"] } = req.body;

    if (!title?.trim() || !message?.trim())
      return res.status(400).json({ message: "Tiêu đề và nội dung không được để trống" });

    const recipients = await resolveRecipients(shopId, recipient_type, custom_user_ids);
    if (!recipients.length)
      return res.status(400).json({ message: "Không có khách hàng phù hợp để gửi thông báo" });

    // Create campaign record
    const campaign = await ShopCampaign.create({
      shop_id:         shopId,
      created_by:      req.user._id,
      title,
      message,
      campaign_type:   "announcement",
      channels,
      recipient_type,
      custom_user_ids: recipient_type === "custom" ? custom_user_ids : [],
      recipient_count: recipients.length,
      status:          "sending",
    });

    // Dispatch
    const shopName = shop.shop_name;
    const { sent, failed } = await dispatch(
      recipients,
      channels,
      (userId) => notif.shopAnnouncement(userId, shopName, title, message),
      `[${shopName}] ${title}`,
      (user) => `Xin chào ${user.name || user.username},\n\n${message}\n\n— ${shopName}`
    );

    campaign.status      = "sent";
    campaign.sent_count  = sent;
    campaign.failed_count = failed;
    campaign.sent_at     = new Date();
    await campaign.save();

    res.json({ success: true, message: `Đã gửi đến ${sent} khách hàng`, data: campaign });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shop/marketing/vouchers/:voucherId/distribute
// Send a voucher to selected customers (adds to applicable_users + notifies)
// ─────────────────────────────────────────────────────────────────────────────
exports.distributeVoucher = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const shop   = req.shop;
    const { voucherId } = req.params;
    const { recipient_type = "custom", custom_user_ids = [], channels = ["in_app"], message } = req.body;

    // Validate voucher belongs to this shop
    const voucher = await Voucher.findOne({
      _id: voucherId,
      $or: [{ shop_id: String(shopId) }, { created_by: req.userId }],
    });
    if (!voucher) return res.status(404).json({ message: "Không tìm thấy voucher" });
    if (!voucher.is_active) return res.status(400).json({ message: "Voucher đã bị tắt" });
    if (new Date() > new Date(voucher.valid_to)) return res.status(400).json({ message: "Voucher đã hết hạn" });

    const recipients = await resolveRecipients(shopId, recipient_type, custom_user_ids);
    if (!recipients.length)
      return res.status(400).json({ message: "Không có khách hàng phù hợp" });

    // Add users to applicable_users (avoid duplicates)
    const existingSet = new Set((voucher.applicable_users || []).map(String));
    const newUserIds  = recipients.map((u) => String(u._id)).filter((id) => !existingSet.has(id));
    if (newUserIds.length > 0) {
      voucher.applicable_users = [...(voucher.applicable_users || []), ...newUserIds];
      await voucher.save();
    }

    // Discount label for notification
    const discountLabel = voucher.discount_type === "percent"
      ? `${voucher.discount_value}%`
      : `${voucher.discount_value.toLocaleString("vi-VN")}₫`;

    const shopName = shop.shop_name;
    const notifMsg = message?.trim() || `Shop ${shopName} gửi tặng bạn mã giảm giá đặc biệt!`;

    // Create campaign record
    const campaign = await ShopCampaign.create({
      shop_id:         shopId,
      created_by:      req.user._id,
      title:           `Voucher ${voucher.code} từ ${shopName}`,
      message:         notifMsg,
      campaign_type:   "voucher_send",
      channels,
      recipient_type,
      custom_user_ids: recipient_type === "custom" ? custom_user_ids : [],
      voucher_id:      voucher._id,
      recipient_count: recipients.length,
      status:          "sending",
    });

    const { sent, failed } = await dispatch(
      recipients,
      channels,
      (userId) => notif.voucherReceived(userId, shopName, voucher.code, discountLabel),
      `🎁 Voucher ${voucher.code} từ ${shopName}`,
      (user) =>
        `Xin chào ${user.name || user.username},\n\nBạn vừa nhận được mã voucher "${voucher.code}" giảm ${discountLabel} từ shop ${shopName}.\n\n${notifMsg}\n\nÁp dụng ngay tại: ${process.env.FRONTEND_URL || ""}/checkout\n\n— ${shopName}`
    );

    campaign.status       = "sent";
    campaign.sent_count   = sent;
    campaign.failed_count = failed;
    campaign.sent_at      = new Date();
    await campaign.save();

    res.json({ success: true, message: `Đã gửi voucher đến ${sent} khách hàng`, data: campaign });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shop/marketing/credits/give  — Give shop credits to customers
// ─────────────────────────────────────────────────────────────────────────────
exports.giveCredits = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const shop   = req.shop;
    const {
      recipient_type = "custom",
      custom_user_ids = [],
      amount,
      reason = "Quà tặng từ shop",
      channels = ["in_app"],
      expires_at,
    } = req.body;

    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ message: "Số tín dụng phải lớn hơn 0" });
    const creditAmount = Number(amount);

    const recipients = await resolveRecipients(shopId, recipient_type, custom_user_ids);
    if (!recipients.length)
      return res.status(400).json({ message: "Không có khách hàng phù hợp" });

    const campaign = await ShopCampaign.create({
      shop_id:         shopId,
      created_by:      req.user._id,
      title:           `Tặng ${creditAmount.toLocaleString("vi-VN")}₫ tín dụng`,
      message:         reason,
      campaign_type:   "credits_gift",
      channels,
      recipient_type,
      custom_user_ids: recipient_type === "custom" ? custom_user_ids : [],
      credits_amount:  creditAmount,
      recipient_count: recipients.length,
      status:          "sending",
    });

    const shopName = shop.shop_name;
    let sent = 0, failed = 0;

    for (const user of recipients) {
      try {
        // Upsert ShopCredit record
        const credit = await ShopCredit.findOneAndUpdate(
          { user_id: String(user._id), shop_id: String(shopId) },
          {
            $inc: { balance: creditAmount, total_earned: creditAmount },
            $set: { expires_at: expires_at ? new Date(expires_at) : null },
            $push: {
              history: {
                type:          "gift",
                amount:        creditAmount,
                balance_after: 0, // will be wrong, we'll fix below
                reason,
              },
            },
            $setOnInsert: { user_id: String(user._id), shop_id: String(shopId) },
          },
          { upsert: true, new: true }
        );

        // Fix balance_after in the last history entry
        const lastIdx = credit.history.length - 1;
        credit.history[lastIdx].balance_after = credit.balance;
        await credit.save();

        // Notify
        if (channels.includes("in_app")) {
          await notif.creditsReceived(user._id, shopName, creditAmount, credit.balance);
        }
        if (channels.includes("email") && user.email) {
          await emailSvc.sendEmail(
            user.email,
            `💰 Bạn nhận được ${creditAmount.toLocaleString("vi-VN")}₫ tín dụng từ ${shopName}`,
            `Xin chào ${user.name || user.username},\n\nShop ${shopName} đã tặng bạn ${creditAmount.toLocaleString("vi-VN")}₫ tín dụng cửa hàng.\n\nLý do: ${reason}\n\nSố dư hiện tại: ${credit.balance.toLocaleString("vi-VN")}₫\n\nSử dụng khi đặt hàng tại shop của chúng tôi!\n\n— ${shopName}`
          );
        }
        sent++;
      } catch { failed++; }
    }

    campaign.status       = "sent";
    campaign.sent_count   = sent;
    campaign.failed_count = failed;
    campaign.sent_at      = new Date();
    await campaign.save();

    res.json({ success: true, message: `Đã tặng tín dụng cho ${sent} khách hàng`, data: campaign });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shop/marketing/campaigns  — List past campaigns
// ─────────────────────────────────────────────────────────────────────────────
exports.listCampaigns = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const cond = { shop_id: req.shop._id };
    if (type) cond.campaign_type = type;

    const pg  = Math.max(1, parseInt(page));
    const lim = Math.min(50, parseInt(limit));
    const [items, total] = await Promise.all([
      ShopCampaign.find(cond).sort({ createdAt: -1 }).skip((pg - 1) * lim).limit(lim).lean(),
      ShopCampaign.countDocuments(cond),
    ]);

    res.json({ success: true, data: { items, total, page: pg, limit: lim } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shop/marketing/credits  — List customers + their credits at this shop
// ─────────────────────────────────────────────────────────────────────────────
exports.listShopCredits = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pg  = Math.max(1, parseInt(page));
    const lim = Math.min(50, parseInt(limit));

    const [items, total] = await Promise.all([
      ShopCredit.find({ shop_id: req.shop._id, balance: { $gt: 0 } })
        .sort({ balance: -1 })
        .skip((pg - 1) * lim)
        .limit(lim)
        .populate("user_id", "username name email avatar_url")
        .lean(),
      ShopCredit.countDocuments({ shop_id: req.shop._id, balance: { $gt: 0 } }),
    ]);

    res.json({ success: true, data: { items, total, page: pg, limit: lim } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shop/marketing/credits/customer/:userId  — Credit detail for one customer
// ─────────────────────────────────────────────────────────────────────────────
exports.getCustomerCredit = async (req, res, next) => {
  try {
    const credit = await ShopCredit.findOne({
      user_id: req.params.userId,
      shop_id: req.shop._id,
    }).populate("user_id", "username name email avatar_url").lean();

    if (!credit) return res.json({ success: true, data: { balance: 0, history: [] } });
    res.json({ success: true, data: credit });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/shop-credits  — Customer: view own credits at all shops
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyCredits = async (req, res, next) => {
  try {
    const credits = await ShopCredit.find({ user_id: String(req.user._id), balance: { $gt: 0 } })
      .populate("shop_id", "shop_name shop_slug shop_logo")
      .lean();

    res.json({ success: true, data: credits });
  } catch (err) { next(err); }
};
