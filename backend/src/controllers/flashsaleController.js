const FlashSale = require("../models/FlashSale");
const Product   = require("../models/Product");
const { v4: uuidv4 } = require("uuid");
const auditLog  = require("../services/auditLogService");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Sync statuses for a shop's flash sales based on current time. Fire-and-forget. */
async function autoSyncStatuses(shopId) {
  const now = new Date();
  await FlashSale.updateMany(
    { shop_id: shopId, status: "scheduled", start_time: { $lte: now } },
    { $set: { status: "active" } }
  );
  await FlashSale.updateMany(
    { shop_id: shopId, status: "active", end_time: { $lte: now } },
    { $set: { status: "ended" } }
  );
}

function calcFlashPrice(originalPrice, discountType, discountValue) {
  if (discountType === "percentage") return Math.max(0, Math.round(originalPrice * (1 - discountValue / 100)));
  if (discountType === "fixed")      return Math.max(0, Math.round(originalPrice - discountValue));
  return originalPrice;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHOP-OWNER ENDPOINTS  (use req.shop from shopMiddleware)
// ─────────────────────────────────────────────────────────────────────────────

exports.shopList = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    await autoSyncStatuses(shopId);

    let { page = 1, limit = 10, status, title } = req.query;
    page = parseInt(page); limit = parseInt(limit);

    const filter = { shop_id: shopId };
    if (status) filter.status = status;
    if (title)  filter.title  = { $regex: title, $options: "i" };

    const [total, items] = await Promise.all([
      FlashSale.countDocuments(filter),
      FlashSale.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    res.json({ data: items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

exports.shopGet = async (req, res, next) => {
  try {
    const fs = await FlashSale.findOne({ _id: req.params.id, shop_id: req.shop._id }).lean();
    if (!fs) return res.status(404).json({ message: "Không tìm thấy Flash Sale" });
    res.json({ data: fs });
  } catch (err) { next(err); }
};

exports.shopCreate = async (req, res, next) => {
  try {
    const shopId = req.shop._id;
    const {
      title, description, start_time, end_time,
      discount_type, discount_value,
      max_per_user = 1, total_limit = 0,
      products = [], banner_image = "",
    } = req.body;

    if (!title?.trim())       return res.status(400).json({ message: "Tiêu đề không được để trống" });
    if (!start_time || !end_time) return res.status(400).json({ message: "Thiếu thời gian bắt đầu / kết thúc" });
    if (!discount_type || !["percentage", "fixed"].includes(discount_type))
      return res.status(400).json({ message: "Loại giảm giá không hợp lệ" });
    if (discount_value == null || Number(discount_value) <= 0)
      return res.status(400).json({ message: "Giá trị giảm phải lớn hơn 0" });
    if (discount_type === "percentage" && Number(discount_value) > 100)
      return res.status(400).json({ message: "Phần trăm giảm không được vượt quá 100" });

    const start = new Date(start_time);
    const end   = new Date(end_time);
    if (isNaN(start) || isNaN(end)) return res.status(400).json({ message: "Thời gian không hợp lệ" });
    if (end <= start) return res.status(400).json({ message: "Thời gian kết thúc phải sau thời gian bắt đầu" });

    if (!Array.isArray(products) || products.length === 0)
      return res.status(400).json({ message: "Phải chọn ít nhất một sản phẩm / biến thể" });

    // Validate products belong to this shop & flash_price < original_price
    for (const p of products) {
      if (!p.product_id || !p.variant_id)
        return res.status(400).json({ message: "Dữ liệu sản phẩm không hợp lệ" });
      if (Number(p.flash_price) <= 0)
        return res.status(400).json({ message: `Giá flash sale phải lớn hơn 0` });
      if (Number(p.flash_price) >= Number(p.original_price))
        return res.status(400).json({ message: `Giá flash sale phải nhỏ hơn giá gốc` });
      if (Number(p.quantity_total) < 1)
        return res.status(400).json({ message: "Số lượng tham gia flash sale phải ít nhất là 1" });
    }

    const now    = new Date();
    const status = start <= now && end > now ? "active" : start > now ? "scheduled" : "ended";

    const fs = await FlashSale.create({
      _id: `fs-${uuidv4()}`,
      shop_id: shopId,
      created_by: req.user._id,
      title: title.trim(),
      description: description || "",
      start_time: start,
      end_time:   end,
      status,
      discount_type,
      discount_value: Number(discount_value),
      max_per_user:  Math.max(1, Number(max_per_user) || 1),
      total_limit:   Math.max(0, Number(total_limit)  || 0),
      products: products.map((p) => ({
        product_id:     p.product_id,
        variant_id:     p.variant_id,
        name:           p.name          || "",
        variant_name:   p.variant_name  || "",
        flash_price:    Math.round(Number(p.flash_price)),
        original_price: Math.round(Number(p.original_price)),
        quantity_total: Math.round(Number(p.quantity_total)),
        quantity_sold:  0,
      })),
      banner_image,
    });

    res.status(201).json({ message: "Tạo Flash Sale thành công", data: fs });
  } catch (err) { next(err); }
};

exports.shopUpdate = async (req, res, next) => {
  try {
    const fs = await FlashSale.findOne({ _id: req.params.id, shop_id: req.shop._id });
    if (!fs) return res.status(404).json({ message: "Không tìm thấy Flash Sale" });
    if (fs.status === "ended" || fs.status === "cancelled")
      return res.status(400).json({ message: "Không thể chỉnh sửa Flash Sale đã kết thúc hoặc huỷ" });

    const {
      title, description, start_time, end_time,
      discount_type, discount_value,
      max_per_user, total_limit, products, banner_image,
    } = req.body;

    if (title !== undefined)       fs.title       = String(title).trim() || fs.title;
    if (description !== undefined) fs.description = description;
    if (banner_image !== undefined) fs.banner_image = banner_image;
    if (max_per_user !== undefined) fs.max_per_user = Math.max(1, Number(max_per_user) || 1);
    if (total_limit  !== undefined) fs.total_limit  = Math.max(0, Number(total_limit)  || 0);

    if (discount_type !== undefined)  fs.discount_type  = discount_type;
    if (discount_value !== undefined) fs.discount_value = Number(discount_value);

    if (start_time || end_time) {
      const start = new Date(start_time || fs.start_time);
      const end   = new Date(end_time   || fs.end_time);
      if (end <= start) return res.status(400).json({ message: "Thời gian kết thúc phải sau thời gian bắt đầu" });
      if (fs.status === "active" && start > new Date())
        return res.status(400).json({ message: "Không thể dời thời gian bắt đầu sang tương lai khi đang active" });
      fs.start_time = start;
      fs.end_time   = end;
    }

    if (Array.isArray(products)) {
      for (const p of products) {
        if (Number(p.flash_price) >= Number(p.original_price))
          return res.status(400).json({ message: "Giá flash sale phải nhỏ hơn giá gốc" });
        if (Number(p.quantity_total) < 1)
          return res.status(400).json({ message: "Số lượng ít nhất là 1" });
      }
      fs.products = products.map((p) => ({
        product_id:     p.product_id,
        variant_id:     p.variant_id,
        name:           p.name         || "",
        variant_name:   p.variant_name || "",
        flash_price:    Math.round(Number(p.flash_price)),
        original_price: Math.round(Number(p.original_price)),
        quantity_total: Math.round(Number(p.quantity_total)),
        quantity_sold:  Number(p.quantity_sold) || 0,
      }));
    }

    // Re-derive status from times
    const now = new Date();
    if (fs.status !== "cancelled") {
      if      (fs.end_time <= now)   fs.status = "ended";
      else if (fs.start_time <= now) fs.status = "active";
      else                           fs.status = "scheduled";
    }

    await fs.save();
    res.json({ message: "Cập nhật thành công", data: fs });
  } catch (err) { next(err); }
};

exports.shopUpdateStatus = async (req, res, next) => {
  try {
    const fs = await FlashSale.findOne({ _id: req.params.id, shop_id: req.shop._id });
    if (!fs) return res.status(404).json({ message: "Không tìm thấy Flash Sale" });

    const { status } = req.body;
    const ALLOWED = ["cancelled"];  // shop owner can only cancel
    if (!ALLOWED.includes(status))
      return res.status(400).json({ message: "Chỉ có thể huỷ Flash Sale" });
    if (fs.status === "ended")
      return res.status(400).json({ message: "Không thể huỷ Flash Sale đã kết thúc" });

    fs.status = status;
    await fs.save();
    res.json({ message: "Đã huỷ Flash Sale", data: fs });
  } catch (err) { next(err); }
};

exports.shopDelete = async (req, res, next) => {
  try {
    const fs = await FlashSale.findOne({ _id: req.params.id, shop_id: req.shop._id });
    if (!fs) return res.status(404).json({ message: "Không tìm thấy Flash Sale" });
    if (fs.status === "active")
      return res.status(400).json({ message: "Không thể xoá Flash Sale đang diễn ra. Hãy huỷ trước." });

    await fs.deleteOne();
    res.json({ message: "Xoá Flash Sale thành công" });
  } catch (err) { next(err); }
};

// [GET] /api/flashsales?page=1&limit=10
exports.getAllFlashSales = async (req, res, next) => {
  try {
    let { page = 1, limit = 10, status, title } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const filter = { created_by: req.user._id };
    if (status) filter.status = status;
    if (title) filter.title = { $regex: title, $options: "i" };
    const total = await FlashSale.countDocuments(filter);
    const flashSales = await FlashSale.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      data: flashSales,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// 🟢 [GET] /api/flashsales/:id
exports.getFlashSaleById = async (req, res, next) => {
  try {
    const flashSale = await FlashSale.findById(req.params.id);
    if (!flashSale)
      return res.status(404).json({ message: "Không tìm thấy Flash Sale" });

    if (flashSale.created_by !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xem Flash Sale này" });
    }

    res.json(flashSale);
  } catch (err) {
    next(err);
  }
};

// [POST] /api/flashsales
exports.createFlashSale = async (req, res, next) => {
  try {
    const {
      title,
      description,
      start_time,
      end_time,
      discount_type,
      discount_value,
      max_per_user,
      total_limit,
      products,
      banner_image,
      status,
    } = req.body;

    // Validate cơ bản
    if (!title || !start_time || !end_time || !discount_type || !discount_value)
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (isNaN(start) || isNaN(end))
      return res.status(400).json({ message: "Thời gian không hợp lệ" });
    if (end <= start)
      return res
        .status(400)
        .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });

    if (
      discount_type === "percentage" &&
      (discount_value <= 0 || discount_value > 100)
    )
      return res
        .status(400)
        .json({ message: "Giá trị giảm theo phần trăm không hợp lệ" });

    if (discount_type === "fixed" && discount_value <= 0)
      return res
        .status(400)
        .json({ message: "Giá trị giảm cố định phải lớn hơn 0" });

    const newFlashSale = new FlashSale({
      _id: `fs-${uuidv4()}`,
      shop_id: req.user._id,
      title: title.trim(),
      description: description || "",
      start_time: start,
      end_time: end,
      status: status || "active",
      discount_type,
      discount_value,
      max_per_user: max_per_user || 1,
      total_limit: total_limit || 100,
      products: Array.isArray(products) ? products : [],
      banner_image: banner_image || "",
      created_by: req.user._id,
      approved_by: null,
    });

    await newFlashSale.save();
    auditLog.log({ actorId: req.user._id, action: "flashsale.create", targetCollection: "flashsales", targetId: newFlashSale._id, ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { title: title.trim(), discount_type, discount_value } });
    res.status(201).json({
      message: "Tạo Flash Sale thành công",
      data: newFlashSale,
    });
  } catch (err) {
    next(err);
  }
};

// [PUT] /api/flashsales/:id
exports.updateFlashSale = async (req, res, next) => {
  try {
    const flashSale = await FlashSale.findById(req.params.id);
    if (!flashSale)
      return res.status(404).json({ message: "Không tìm thấy Flash Sale" });

    if (flashSale.created_by !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền cập nhật Flash Sale này" });
    }

    const {
      title,
      description,
      start_time,
      end_time,
      discount_type,
      discount_value,
      max_per_user,
      total_limit,
      products,
      banner_image,
      status,
    } = req.body;

    if (start_time && end_time) {
      const start = new Date(start_time);
      const end = new Date(end_time);
      if (end <= start)
        return res
          .status(400)
          .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });
      flashSale.start_time = start;
      flashSale.end_time = end;
    }

    Object.assign(flashSale, {
      title: title ?? flashSale.title,
      description: description ?? flashSale.description,
      discount_type: discount_type ?? flashSale.discount_type,
      discount_value: discount_value ?? flashSale.discount_value,
      max_per_user: max_per_user ?? flashSale.max_per_user,
      total_limit: total_limit ?? flashSale.total_limit,
      banner_image: banner_image ?? flashSale.banner_image,
      status: status ?? flashSale.status,
    });

    if (Array.isArray(products)) {
      flashSale.products = products;
    }

    flashSale.updatedAt = new Date();
    await flashSale.save();
    auditLog.log({ actorId: req.user._id, action: "flashsale.update", targetCollection: "flashsales", targetId: flashSale._id, ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { title: flashSale.title } });

    res.json({ message: "Cập nhật Flash Sale thành công", data: flashSale });
  } catch (err) {
    next(err);
  }
};

//[DELETE] /api/flashsales/:id
exports.deleteFlashSale = async (req, res, next) => {
  try {
    const flashSale = await FlashSale.findById(req.params.id);
    if (!flashSale)
      return res.status(404).json({ message: "Không tìm thấy Flash Sale" });

    if (flashSale.created_by !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền xóa Flash Sale này" });
    }

    const fsId = flashSale._id;
    const fsTitle = flashSale.title;
    await flashSale.deleteOne();
    auditLog.log({ actorId: req.user._id, action: "flashsale.delete", targetCollection: "flashsales", targetId: fsId, ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { title: fsTitle } });
    res.json({ message: "Xóa Flash Sale thành công" });
  } catch (err) {
    next(err);
  }
};
