const Product = require("../models/Product");

// GET /api/admin/products?status=pending&q=...&page=1&limit=20
exports.listProducts = async (req, res, next) => {
  try {
    const { status = "pending", q, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status !== "all") filter.status = status;
    if (q) filter.name = { $regex: q, $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Product.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: Number(limit) },
        { $lookup: { from: "shops",      localField: "shop_id",     foreignField: "_id", as: "shop"     } },
        { $lookup: { from: "categories", localField: "category_id", foreignField: "_id", as: "category" } },
        { $lookup: { from: "brands",     localField: "brand_id",    foreignField: "_id", as: "brand"    } },
        {
          $addFields: {
            shop:     { $arrayElemAt: ["$shop",     0] },
            category: { $arrayElemAt: ["$category", 0] },
            brand:    { $arrayElemAt: ["$brand",    0] },
          },
        },
        { $project: { "shop.owner_id": 0 } },
      ]),
      Product.countDocuments(filter),
    ]);

    res.json({ success: true, data: { items, total, page: Number(page), limit: Number(limit) } });
  } catch (e) { next(e); }
};

// GET /api/admin/products/:id
exports.getProduct = async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    res.json({ success: true, data: p });
  } catch (e) { next(e); }
};

// PATCH /api/admin/products/:id/approve
exports.approveProduct = async (req, res, next) => {
  try {
    const p = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "active", rejection_reason: "" } },
      { new: true }
    );
    if (!p) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    res.json({ success: true, data: p });
  } catch (e) { next(e); }
};

// PATCH /api/admin/products/:id/reject
exports.rejectProduct = async (req, res, next) => {
  try {
    const { reason = "" } = req.body || {};
    const p = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "inactive", rejection_reason: reason } },
      { new: true }
    );
    if (!p) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    res.json({ success: true, data: p });
  } catch (e) { next(e); }
};
