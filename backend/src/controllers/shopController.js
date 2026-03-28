const { getAnalyticsData } = require('../services/shopService');
const ProductVariant = require("../models/ProductVariant");
const Product = require("../models/Product");
const Shop    = require("../models/Shop");
const ghn     = require("../services/ghnService");

const getAnalytics = async (req, res) => {
  try {
    const stats = await getAnalyticsData();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ message: "Lỗi server khi lấy dữ liệu thống kê" });
  }
};

// GET /api/shop/inventory/low-stock?threshold=5&page=1&limit=20
const getLowStock = async (req, res) => {
  try {
    const shopId    = String(req.shop._id);
    const threshold = Math.max(0, parseInt(req.query.threshold) || 5);
    const page      = Math.max(1, parseInt(req.query.page)      || 1);
    const limit     = Math.min(100, parseInt(req.query.limit)   || 20);

    const [variants, total] = await Promise.all([
      ProductVariant.find({
        shop_id:    shopId,
        is_active:  true,
        $expr: { $lte: ["$stock", threshold] },
      })
        .sort({ stock: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProductVariant.countDocuments({
        shop_id:   shopId,
        is_active: true,
        $expr: { $lte: ["$stock", threshold] },
      }),
    ]);

    // Enrich with product info
    const productIds = [...new Set(variants.map((v) => v.product_id))];
    const products   = await Product.find({ _id: { $in: productIds } })
      .select("_id name images slug")
      .lean();
    const prodMap = new Map(products.map((p) => [String(p._id), p]));

    const items = variants.map((v) => ({
      ...v,
      product: prodMap.get(String(v.product_id)) || null,
    }));

    res.json({ success: true, data: { items, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("[getLowStock]", err.message);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// GET /api/shop/pickup-address
const getPickupAddress = async (req, res) => {
  try {
    res.json({ success: true, data: req.shop.pickup_address || {} });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// PUT /api/shop/pickup-address
const updatePickupAddress = async (req, res) => {
  try {
    const { name, phone, address, province_id, province_name, district_id, district_name, ward_code, ward_name } = req.body;
    if (!district_id || !ward_code) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn đầy đủ quận/huyện và phường/xã" });
    }
    const updated = await Shop.findByIdAndUpdate(
      req.shop._id,
      { pickup_address: { name, phone, address, province_id, province_name, district_id, district_name, ward_code, ward_name } },
      { new: true }
    ).lean();
    res.json({ success: true, data: updated.pickup_address });
  } catch (err) {
    console.error("[updatePickupAddress]", err.message);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// GET /api/shop/ghn/provinces
const ghnProvinces = async (req, res) => {
  try {
    const data = await ghn.getProvinces();
    res.json({ success: true, data });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
};

// GET /api/shop/ghn/districts?province_id=X
const ghnDistricts = async (req, res) => {
  try {
    const data = await ghn.getDistricts(req.query.province_id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
};

// GET /api/shop/ghn/wards?district_id=X
const ghnWards = async (req, res) => {
  try {
    const data = await ghn.getWards(req.query.district_id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(502).json({ success: false, message: err.message });
  }
};

// GET /api/shop/products?q=...&page=1&limit=20
const getShopProducts = async (req, res) => {
  try {
    const shopId = String(req.shop._id);
    const q = req.query.q?.trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);

    const filter = { shop_id: shopId };
    if (q) filter.name = { $regex: q, $options: "i" };

    const [products, total] = await Promise.all([
      Product.find(filter).select("_id name images slug status").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    const productIds = products.map((p) => p._id);
    const variants = await ProductVariant.find({ product_id: { $in: productIds }, is_active: true })
      .select("_id product_id name price stock images sku")
      .lean();

    const variantsByProduct = new Map();
    for (const v of variants) {
      const pid = String(v.product_id);
      if (!variantsByProduct.has(pid)) variantsByProduct.set(pid, []);
      variantsByProduct.get(pid).push(v);
    }

    const items = products.map((p) => ({
      ...p,
      variants: variantsByProduct.get(String(p._id)) || [],
    }));

    res.json({ success: true, data: items, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[getShopProducts]", err.message);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { getAnalytics, getLowStock, getPickupAddress, updatePickupAddress, ghnProvinces, ghnDistricts, ghnWards, getShopProducts };