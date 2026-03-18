const Shop = require("../models/Shop");
const User = require("../models/User");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Order = require("../models/Order");
const Role = require("../models/Role");

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\-]+/g, "-")
    .replace(/\-+/g, "-")
    .slice(0, 80);

// ─── Public ───────────────────────────────────────────────────────────────────

exports.getShopBySlug = async (slug) => {
  const shop = await Shop.findOne({ shop_slug: slug, status: "approved" }).lean();
  if (!shop) return null;
  const owner = await User.findById(shop.owner_id).select("name avatar_url").lean();
  return { ...shop, owner };
};

exports.getShopProducts = async (shopId, { q, page = 1, limit = 24, category_id, sort = "newest" } = {}) => {
  const filter = { shop_id: shopId, status: "active" };
  if (q) filter.name = { $regex: q, $options: "i" };
  if (category_id) filter.category_id = category_id;

  const sortMap = {
    newest: { createdAt: -1 },
    popular: { sold_count: -1 },
    price_asc: { base_price: 1 },
    price_desc: { base_price: -1 },
    rating: { rating_avg: -1 },
  };
  const sortObj = sortMap[sort] || sortMap.newest;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select("_id name slug images base_price currency rating_avg rating_count sold_count stock_total status")
      .lean(),
    Product.countDocuments(filter),
  ]);

  return { items, total, page: Number(page), limit: Number(limit) };
};

// ─── Shop Owner ───────────────────────────────────────────────────────────────

exports.registerShop = async (ownerId, payload) => {
  const existing = await Shop.findOne({ owner_id: ownerId });
  if (existing) {
    throw Object.assign(new Error("Bạn đã đăng ký shop rồi"), { status: 400 });
  }

  const { shop_name, description, address, phone, email } = payload;
  if (!shop_name) throw Object.assign(new Error("Thiếu tên shop"), { status: 400 });

  let baseSlug = slugify(shop_name);
  let shop_slug = baseSlug;
  let i = 1;
  while (await Shop.findOne({ shop_slug })) {
    shop_slug = `${baseSlug}-${i++}`;
  }

  const shop = await Shop.create({
    owner_id: ownerId,
    shop_name,
    shop_slug,
    description: description || "",
    address: address || "",
    phone: phone || "",
    email: email || "",
    status: "pending",
  });

  return shop;
};

exports.getMyShop = async (ownerId) => {
  return Shop.findOne({ owner_id: ownerId }).lean();
};

exports.updateMyShop = async (ownerId, payload) => {
  const allowed = ["shop_name", "description", "address", "phone", "email", "shop_logo", "banner_url"];
  const patch = {};
  for (const k of allowed) {
    if (payload[k] !== undefined) patch[k] = payload[k];
  }
  return Shop.findOneAndUpdate({ owner_id: ownerId, status: "approved" }, { $set: patch }, { new: true });
};

// ─── Admin ────────────────────────────────────────────────────────────────────

exports.adminListShops = async ({ page = 1, limit = 20, status, q } = {}) => {
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.shop_name = { $regex: q, $options: "i" };

  const [items, total] = await Promise.all([
    Shop.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    Shop.countDocuments(filter),
  ]);

  // attach owner info
  const ownerIds = items.map((s) => s.owner_id);
  const owners = await User.find({ _id: { $in: ownerIds } }).select("name email avatar_url").lean();
  const ownerMap = new Map(owners.map((u) => [u._id, u]));

  return {
    items: items.map((s) => ({ ...s, owner: ownerMap.get(s.owner_id) || null })),
    total,
    page: Number(page),
    limit: Number(limit),
  };
};

exports.adminApproveShop = async (shopId) => {
  const shop = await Shop.findById(shopId);
  if (!shop) throw Object.assign(new Error("Shop không tồn tại"), { status: 404 });
  if (shop.status === "approved") throw Object.assign(new Error("Shop đã được duyệt"), { status: 400 });

  shop.status = "approved";
  shop.rejection_reason = "";
  await shop.save();

  // Upgrade user role to shop_owner
  const role = await Role.findOne({ name: "shop_owner" });
  if (role) {
    await User.findByIdAndUpdate(shop.owner_id, { role_id: role._id });
  }

  // Migrate existing products that used owner_id as shop_id
  await Product.updateMany({ shop_id: shop.owner_id }, { $set: { shop_id: shop._id } });
  await ProductVariant.updateMany({ shop_id: shop.owner_id }, { $set: { shop_id: shop._id } });

  return shop;
};

exports.adminSuspendShop = async (shopId, reason = "") => {
  const shop = await Shop.findByIdAndUpdate(
    shopId,
    { $set: { status: "suspended", rejection_reason: reason } },
    { new: true }
  );
  if (!shop) throw Object.assign(new Error("Shop không tồn tại"), { status: 404 });
  return shop;
};

exports.adminRejectShop = async (shopId, reason = "") => {
  const shop = await Shop.findByIdAndUpdate(
    shopId,
    { $set: { status: "pending", rejection_reason: reason } },
    { new: true }
  );
  if (!shop) throw Object.assign(new Error("Shop không tồn tại"), { status: 404 });
  return shop;
};

exports.adminGetShopStats = async (shopId) => {
  const shop = await Shop.findById(shopId).lean();
  if (!shop) throw Object.assign(new Error("Shop không tồn tại"), { status: 404 });

  const [productCount, orderCount] = await Promise.all([
    Product.countDocuments({ shop_id: shopId }),
    Order.countDocuments({ shop_id: shopId }),
  ]);

  const revenueAgg = await Order.aggregate([
    { $match: { shop_id: shopId, payment_status: "paid" } },
    { $group: { _id: null, total: { $sum: "$total_price" } } },
  ]);

  return {
    ...shop,
    total_products: productCount,
    total_orders: orderCount,
    total_revenue: revenueAgg[0]?.total || 0,
  };
};
