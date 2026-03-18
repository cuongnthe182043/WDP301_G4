// controllers/voucherController.js
const Voucher = require("../models/Voucher");
const Order   = require("../models/Order");
const { v4: uuidv4 } = require("uuid");

// ─── Helpers ─────────────────────────────────────────────────────────────────
function validateDiscount(type, value) {
  if (!["percent", "fixed"].includes(type)) return "Loại giảm giá không hợp lệ (percent | fixed)";
  const val = Number(value);
  if (!isFinite(val) || val <= 0) return "Giá trị giảm phải là số dương";
  if (type === "percent" && val > 100) return "Phần trăm giảm giá phải trong khoảng 1–100";
  return null;
}

function validateDateRange(valid_from, valid_to, allowPastFrom = false) {
  const now  = new Date();
  const from = new Date(valid_from);
  const to   = new Date(valid_to);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return "Ngày không hợp lệ";
  // Compare date strings (YYYY-MM-DD) only — avoids timezone issue where
  // new Date("2026-03-15") is midnight UTC and appears "past" for UTC+7 users
  if (!allowPastFrom) {
    const todayStr = now.toISOString().slice(0, 10);
    const fromStr  = from.toISOString().slice(0, 10);
    if (fromStr < todayStr) return "Ngày bắt đầu phải là hôm nay hoặc tương lai";
  }
  if (to <= from) return "Ngày kết thúc phải sau ngày bắt đầu";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vouchers  — Shop owner: list own vouchers (scoped to req.shop)
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllVouchers = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, code, status } = req.query;
    page  = Math.max(1, parseInt(page));
    limit = Math.min(100, Math.max(1, parseInt(limit)));

    // Scope to this shop — catch both new records (shop_id) and legacy (created_by)
    const shopId = String(req.shop._id);
    const filter = {
      $or: [
        { shop_id:    shopId },
        { created_by: String(req.userId) },
      ],
    };
    if (code) filter.code = { $regex: code.trim(), $options: "i" };

    const now = new Date();
    if (status === "active")   { filter.is_active = true; filter.valid_from = { $lte: now }; filter.valid_to = { $gt: now }; }
    if (status === "inactive") { filter.is_active = false; }
    if (status === "expired")  { filter.valid_to = { $lte: now }; }
    if (status === "upcoming") { filter.is_active = true; filter.valid_from = { $gt: now }; }

    const [items, total] = await Promise.all([
      Voucher.find(filter).sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Voucher.countDocuments(filter),
    ]);

    res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vouchers/public  — Customer: list active, non-expired vouchers
// ─────────────────────────────────────────────────────────────────────────────
exports.listPublicVouchers = async (req, res, next) => {
  try {
    const { shop_id, page = 1, limit = 20 } = req.query;
    const now = new Date();
    const cond = {
      is_active: true,
      valid_from: { $lte: now },
      valid_to:   { $gt: now },
      $expr: { $lt: ["$used_count", "$max_uses"] },
    };
    if (shop_id) cond.shop_id = shop_id;

    const pg  = Math.max(1, parseInt(page));
    const lim = Math.min(50, Math.max(1, parseInt(limit)));
    const [items, total] = await Promise.all([
      Voucher.find(cond)
        .sort({ valid_to: 1 })
        .skip((pg - 1) * lim)
        .limit(lim)
        .select("code discount_type discount_value min_order_value max_uses used_count valid_from valid_to shop_id")
        .lean(),
      Voucher.countDocuments(cond),
    ]);

    res.json({ success: true, data: { items, total, page: pg, limit: lim } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vouchers/validate  — Customer: validate a code before checkout
// ─────────────────────────────────────────────────────────────────────────────
exports.validateVoucherCode = async (req, res, next) => {
  try {
    const { code, subtotal = 0 } = req.body;
    if (!code) return res.status(400).json({ success: false, message: "Thiếu mã voucher" });

    const userId = req.user?._id;
    const normalizedCode = code.toString().trim().toUpperCase();
    const v = await Voucher.findOne({ code: normalizedCode, is_active: true }).lean();

    if (!v) return res.json({ success: false, message: "Mã voucher không tồn tại hoặc đã bị vô hiệu hóa" });

    const now = new Date();
    if (now < new Date(v.valid_from))
      return res.json({ success: false, message: "Voucher chưa có hiệu lực" });
    if (now > new Date(v.valid_to))
      return res.json({ success: false, message: "Voucher đã hết hạn" });
    if (v.used_count >= v.max_uses)
      return res.json({ success: false, message: "Voucher đã hết lượt sử dụng" });
    if (Number(subtotal) > 0 && Number(subtotal) < (v.min_order_value || 0))
      return res.json({
        success: false,
        message: `Đơn hàng tối thiểu ${(v.min_order_value || 0).toLocaleString("vi-VN")}₫ để dùng voucher này`,
      });

    if (userId && v.applicable_users?.length > 0) {
      if (!v.applicable_users.map(String).includes(String(userId)))
        return res.json({ success: false, message: "Voucher này không áp dụng cho tài khoản của bạn" });
    }

    if (userId && v.usage_limit_per_user > 0) {
      const used = await Order.countDocuments({ user_id: String(userId), voucher_id: v._id });
      if (used >= v.usage_limit_per_user)
        return res.json({ success: false, message: "Bạn đã sử dụng hết lượt cho voucher này" });
    }

    const sub = Number(subtotal) || 0;
    const rawDiscount = v.discount_type === "percent"
      ? Math.round((sub * v.discount_value) / 100)
      : v.discount_value;
    const discount = Math.min(rawDiscount, sub || rawDiscount);

    res.json({
      success: true,
      message: "Voucher hợp lệ",
      data: {
        code: v.code,
        discount_type:   v.discount_type,
        discount_value:  v.discount_value,
        min_order_value: v.min_order_value,
        valid_to:        v.valid_to,
        discount,
        remaining_uses:  v.max_uses - v.used_count,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vouchers/:id  — Get single voucher (owner only)
// ─────────────────────────────────────────────────────────────────────────────
exports.getVoucherById = async (req, res, next) => {
  try {
    const shopId = String(req.shop._id);
    const voucher = await Voucher.findOne({
      _id: req.params.id,
      $or: [{ shop_id: shopId }, { created_by: req.userId }],
    }).lean();
    if (!voucher) return res.status(404).json({ message: "Không tìm thấy voucher hoặc bạn không có quyền truy cập" });
    res.json({ success: true, data: voucher });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vouchers  — Create voucher
// ─────────────────────────────────────────────────────────────────────────────
exports.createVoucher = async (req, res, next) => {
  try {
    const {
      code, discount_type, discount_value, max_uses,
      usage_limit_per_user, min_order_value,
      applicable_products, applicable_users,
      valid_from, valid_to, is_active,
    } = req.body;

    if (!code || !discount_type || discount_value == null || !max_uses || !valid_from || !valid_to)
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });

    const discountErr = validateDiscount(discount_type, discount_value);
    if (discountErr) return res.status(400).json({ message: discountErr });

    const dateErr = validateDateRange(valid_from, valid_to, false);
    if (dateErr) return res.status(400).json({ message: dateErr });

    const normalizedCode = code.trim().toUpperCase();
    if (await Voucher.findOne({ code: normalizedCode }))
      return res.status(400).json({ message: "Mã voucher đã tồn tại" });

    const voucher = await Voucher.create({
      _id:                  `vou-${uuidv4()}`,
      code:                 normalizedCode,
      discount_type,
      discount_value:       Number(discount_value),
      max_uses:             Math.max(1, Number(max_uses)),
      usage_limit_per_user: Number(usage_limit_per_user) || 1,
      min_order_value:      Number(min_order_value) || 0,
      applicable_products:  Array.isArray(applicable_products) ? applicable_products : [],
      applicable_users:     Array.isArray(applicable_users)     ? applicable_users    : [],
      scope:    "shop",
      shop_id:  String(req.shop._id),   // ← always use the real shop ID
      valid_from: new Date(valid_from),
      valid_to:   new Date(valid_to),
      is_active:  is_active !== undefined ? Boolean(is_active) : true,
      created_by: req.userId,
    });

    res.status(201).json({ success: true, message: "Tạo voucher thành công", data: voucher });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/vouchers/:id  — Update voucher (owner only)
// ─────────────────────────────────────────────────────────────────────────────
exports.updateVoucher = async (req, res, next) => {
  try {
    const shopId = String(req.shop._id);
    const voucher = await Voucher.findOne({
      _id: req.params.id,
      $or: [{ shop_id: shopId }, { created_by: req.userId }],
    });
    if (!voucher) return res.status(404).json({ message: "Không tìm thấy voucher hoặc bạn không có quyền sửa" });

    const {
      code, discount_type, discount_value, max_uses,
      usage_limit_per_user, min_order_value,
      valid_from, valid_to, is_active,
    } = req.body;

    // Validate discount fields if provided
    if (discount_type !== undefined || discount_value !== undefined) {
      const type = discount_type ?? voucher.discount_type;
      const val  = discount_value !== undefined ? Number(discount_value) : voucher.discount_value;
      const err  = validateDiscount(type, val);
      if (err) return res.status(400).json({ message: err });
    }

    // Validate dates if provided
    const newFrom = valid_from ? new Date(valid_from) : null;
    const newTo   = valid_to   ? new Date(valid_to)   : null;
    if (newFrom && isNaN(newFrom.getTime())) return res.status(400).json({ message: "Ngày bắt đầu không hợp lệ" });
    if (newTo   && isNaN(newTo.getTime()))   return res.status(400).json({ message: "Ngày kết thúc không hợp lệ" });

    // Only reject past valid_from if it's actually being changed to a different date
    const now = new Date();
    const todayStr      = now.toISOString().slice(0, 10);
    const storedFromStr = new Date(voucher.valid_from).toISOString().slice(0, 10);
    const newFromStr    = newFrom ? newFrom.toISOString().slice(0, 10) : null;
    if (newFromStr && newFromStr < todayStr && newFromStr !== storedFromStr)
      return res.status(400).json({ message: "Ngày bắt đầu mới phải là hôm nay hoặc tương lai" });

    const effectiveFrom = newFrom || voucher.valid_from;
    const effectiveTo   = newTo   || voucher.valid_to;
    if (effectiveTo <= effectiveFrom)
      return res.status(400).json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });

    // Check code uniqueness if changing
    if (code) {
      const normalized = code.trim().toUpperCase();
      if (normalized !== voucher.code) {
        if (await Voucher.findOne({ code: normalized }))
          return res.status(400).json({ message: "Mã voucher đã tồn tại" });
        voucher.code = normalized;
      }
    }

    if (discount_type  !== undefined) voucher.discount_type       = discount_type;
    if (discount_value !== undefined) voucher.discount_value      = Number(discount_value);
    if (max_uses       !== undefined) voucher.max_uses            = Math.max(Number(max_uses), voucher.used_count);
    if (usage_limit_per_user !== undefined) voucher.usage_limit_per_user = Number(usage_limit_per_user);
    if (min_order_value !== undefined)      voucher.min_order_value      = Number(min_order_value);
    if (newFrom) voucher.valid_from = newFrom;
    if (newTo)   voucher.valid_to   = newTo;
    if (is_active !== undefined) voucher.is_active = Boolean(is_active);

    // Ensure shop_id is set to the real shop (backfill legacy records)
    if (!voucher.shop_id || voucher.shop_id === req.userId) {
      voucher.shop_id = shopId;
    }

    await voucher.save();
    res.json({ success: true, message: "Cập nhật voucher thành công", data: voucher });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/vouchers/:id/toggle  — Toggle is_active (owner only)
// ─────────────────────────────────────────────────────────────────────────────
exports.toggleVoucher = async (req, res, next) => {
  try {
    const shopId = String(req.shop._id);
    const voucher = await Voucher.findOne({
      _id: req.params.id,
      $or: [{ shop_id: shopId }, { created_by: req.userId }],
    });
    if (!voucher) return res.status(404).json({ message: "Không tìm thấy voucher hoặc bạn không có quyền thay đổi" });

    voucher.is_active = !voucher.is_active;
    await voucher.save();
    res.json({ success: true, data: { is_active: voucher.is_active } });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/vouchers/:id  — Delete voucher (owner only)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteVoucher = async (req, res, next) => {
  try {
    const shopId = String(req.shop._id);
    const voucher = await Voucher.findOne({
      _id: req.params.id,
      $or: [{ shop_id: shopId }, { created_by: req.userId }],
    });
    if (!voucher) return res.status(404).json({ message: "Không tìm thấy voucher hoặc bạn không có quyền xóa" });
    if (voucher.used_count > 0)
      return res.status(400).json({ message: "Không thể xóa voucher đã được sử dụng. Hãy vô hiệu hóa thay thế." });

    await voucher.deleteOne();
    res.json({ success: true, message: "Xóa voucher thành công" });
  } catch (err) { next(err); }
};
