// services/productAdminService.js
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Category = require("../models/Category");
const Attribute = require("../models/Attribute");
const Brand = require("../models/Brand");
const { uploadImages, uploadVideo } = require("./mediaService");
const { importProductsFromExcel } = require("./importService");
const { moderateProduct } = require("./productModerationService");
const notif = require("./dbNotificationService");

const slugify = (s) => String(s||"").toLowerCase().trim().replace(/[^\w\-]+/g,"-").replace(/\-+/g,"-");
exports.getProduct = async (id, shopId) => {
  const p = await Product.findOne({ _id: id, shop_id: shopId }).lean();
  if (!p) return null;
  const vars = await ProductVariant.find({ product_id: id, shop_id: shopId }).lean();
  return { ...p, variants: vars };
};

exports.listProducts = async ({ shopId, q, page=1, limit=20, category_id, status }) => {
  const filter = { shop_id: shopId };
  if (q) filter.name = { $regex: q, $options: "i" };
  if (category_id) filter.category_id = category_id;
  if (status) filter.status = status;

  const agg = [
    { $match: filter },
    { $sort: { createdAt: -1 } },
    { $skip: (page-1)*limit }, { $limit: Number(limit) },
    { $lookup: { from: "categories", localField: "category_id", foreignField: "_id", as: "cat" } },
    { $addFields: { category_name: { $ifNull: [ { $arrayElemAt: ["$cat.name", 0] }, null ] } } },
    { $project: { cat:0 } }
  ];
  const [items, total] = await Promise.all([
    Product.aggregate(agg),
    Product.countDocuments(filter),
  ]);
  return { items, total, page: Number(page), limit: Number(limit) };
};

exports.createProduct = async (payload, shopId) => {
  // Strip any status from payload — new products always start as pending
  const { status: _ignored, rejection_reason: _ign2, ...rest } = payload;
  const doc = { ...rest, shop_id: shopId, status: "pending", rejection_reason: "" };
  if (!doc.slug && doc.name) doc.slug = slugify(doc.name);
  // Ensure slug uniqueness by appending random suffix if needed
  const existing = await Product.findOne({ slug: doc.slug }).lean();
  if (existing) doc.slug = `${doc.slug}-${Date.now()}`;
  if (doc.category_id) {
    const cat = await Category.findById(doc.category_id).lean();
    doc.category_path = cat ? [ ...(cat.path||[]), cat.slug ] : [];
  }
  // ── Auto-moderation on creation ──
  const modResult = moderateProduct(doc);
  doc.auto_moderated   = true;
  doc.moderation_score = modResult.score;
  doc.moderation_flags = modResult.flags.map(({ type, severity, message, field }) => ({ type, severity, message, field }));

  if (modResult.decision === "approved") {
    // Clean product → auto-approve, no admin action needed
    doc.status           = "active";
    doc.rejection_reason = "";
  } else if (modResult.decision === "rejected") {
    // Severe violations → auto-reject
    doc.status           = "inactive";
    doc.rejection_reason = modResult.summary;
  } else {
    // "needs_review" → stay pending for admin manual review
    doc.status           = "pending";
    doc.rejection_reason = modResult.summary;
  }

  const product = await Product.create(doc);

  // Notify shop owner about the outcome
  const Shop = require("../models/Shop");
  const shop = await Shop.findById(shopId).select("owner_id").lean();
  if (shop?.owner_id) {
    if (modResult.decision === "approved") {
      notif.productApproved(shop.owner_id, product.name).catch(() => {});
    } else if (modResult.decision === "rejected") {
      notif.productRejected(shop.owner_id, product.name, modResult.summary).catch(() => {});
    } else {
      notif.productFlagged(shop.owner_id, product.name).catch(() => {});
    }
  }

  return product;
};

exports.deleteProduct = async (id, shopId) => {
  await ProductVariant.deleteMany({ product_id: id, shop_id: shopId });
  return Product.findOneAndDelete({ _id: id, shop_id: shopId });
};

exports.updateProduct = async (id, payload, shopId) => {
  // Strip virtual / non-schema fields and computed / admin-only fields
  const {
    variants, _id, createdAt, updatedAt, __v,
    status, rejection_reason,
    rating_avg, rating_count, sold_count,
    shop_id,
    ...rest
  } = payload;

  const patch = { ...rest };

  // Allow shop owner to toggle active ↔ inactive only (not pending / out_of_stock)
  if (status === "active" || status === "inactive") {
    patch.status = status;
  }

  if (!patch.slug && patch.name) {
    const newSlug = slugify(patch.name);
    const conflict = await Product.findOne({ slug: newSlug, _id: { $ne: id } }).lean();
    patch.slug = conflict ? `${newSlug}-${Date.now()}` : newSlug;
  }
  if (patch.category_id) {
    const cat = await Category.findById(patch.category_id).lean();
    patch.category_path = cat ? [ ...(cat.path||[]), cat.slug ] : [];
  }

  // ── Re-run moderation when key fields change ──
  const moderatableFields = ["name", "description", "tags", "images", "base_price"];
  const needsReModeration = moderatableFields.some((f) => f in patch);
  if (needsReModeration) {
    // Merge current product with patch to get full picture
    const current = await Product.findOne({ _id: id, shop_id: shopId }).lean();
    if (current) {
      const merged = { ...current, ...patch };
      const modResult = moderateProduct(merged);
      patch.auto_moderated   = true;
      patch.moderation_score = modResult.score;
      patch.moderation_flags = modResult.flags.map(({ type, severity, message, field }) => ({ type, severity, message, field }));

      if (modResult.decision === "approved") {
        // Clean product → auto-approve, clear flags
        patch.status           = "active";
        patch.rejection_reason = "";
        patch.moderation_flags = [];
      } else if (modResult.decision === "rejected") {
        // Severe violations → auto-reject
        patch.status           = "inactive";
        patch.rejection_reason = modResult.summary;

        const Shop = require("../models/Shop");
        const shop = await Shop.findById(shopId).select("owner_id").lean();
        if (shop?.owner_id) {
          notif.productRejected(shop.owner_id, merged.name, modResult.summary).catch(() => {});
        }
      } else {
        // "needs_review" → pending for admin manual review
        patch.status           = "pending";
        patch.rejection_reason = modResult.summary;

        const Shop = require("../models/Shop");
        const shop = await Shop.findById(shopId).select("owner_id").lean();
        if (shop?.owner_id) {
          notif.productFlagged(shop.owner_id, merged.name).catch(() => {});
        }
      }
    }
  }

  await Product.findOneAndUpdate({ _id: id, shop_id: shopId }, { $set: patch }, { new: true });

  // If the product already has variants, recompute stock_total from them
  // (ignore whatever stock_total the form sent — variants are the source of truth)
  const variantCount = await ProductVariant.countDocuments({ product_id: id, shop_id: shopId });
  if (variantCount > 0) {
    await exports.recomputeStockTotal(id, shopId);
  }

  return Product.findOne({ _id: id, shop_id: shopId }).lean();
};

/* ===== Variants single ===== */
exports.listVariants = (product_id, shopId) => ProductVariant.find({ product_id, shop_id: shopId }).lean();
exports.createVariant = async (product_id, body, shopId) => {
  const v = await ProductVariant.create({ product_id, shop_id: shopId, ...body });
  await exports.recomputeStockTotal(product_id, shopId);
  return v;
};
exports.updateVariant = async (variantId, body, shopId) => {
  const v = await ProductVariant.findOneAndUpdate({ _id: variantId, shop_id: shopId }, { $set: body }, { new: true });
  if (v) await exports.recomputeStockTotal(v.product_id, shopId);
  return v;
};
exports.deleteVariant = async (variantId, shopId) => {
  const v = await ProductVariant.findOneAndDelete({ _id: variantId, shop_id: shopId });
  if (v) await exports.recomputeStockTotal(v.product_id, shopId);
  return { ok: true };
};

/* ===== Variants bulk (ma trận) ===== */
exports.createVariantsBulk = async (product_id, rows = [], shopId) => {
  if (!Array.isArray(rows) || rows.length === 0) return { inserted: 0 };
  const docs = rows.map(r => ({
    product_id, shop_id: shopId,
    sku: r.sku,
    price: Number(r.price||0),
    stock: Number(r.stock||0),
    variant_attributes: r.variant_attributes || {}, // ví dụ: { color: "Đỏ", size: "M" }
    is_active: true,
  }));
  await ProductVariant.insertMany(docs, { ordered: false });
  await exports.recomputeStockTotal(product_id, shopId);
  return { inserted: docs.length };
};

exports.recomputeStockTotal = async (product_id, shopId) => {
  const agg = await ProductVariant.aggregate([
    { $match: { product_id, shop_id: shopId } },
    { $group: { _id: null, st: { $sum: "$stock" } } }
  ]);
  await Product.updateOne({ _id: product_id, shop_id: shopId }, { $set: { stock_total: agg?.[0]?.st || 0 } });
};

/* ===== Catalog basic ===== */
exports.listCategories = () => Category.find({ is_active: true }).sort({ level:1, name:1 }).lean();
exports.listAttributes = () => Attribute.find({ is_active: true }).lean();
exports.listBrands = () => Brand.find({ is_active: true }).lean();
exports.createCategory = (payload) => Category.create({ ...payload, slug: payload.slug || undefined, is_active: true });
exports.updateCategory = (id, payload) => Category.findByIdAndUpdate(id, { $set: payload }, { new: true });
exports.deleteCategory = (id) => Category.findByIdAndDelete(id);

exports.createAttribute = (payload) => Attribute.create({ ...payload, is_active: true });
exports.updateAttribute = (id, payload) => Attribute.findByIdAndUpdate(id, { $set: payload }, { new: true });
exports.deleteAttribute = (id) => Attribute.findByIdAndDelete(id);

exports.createBrand = (payload) => {
  const slug = payload.slug || String(payload.name || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now();
  return Brand.create({ ...payload, slug, is_active: true });
};
exports.updateBrand = (id, payload) => Brand.findByIdAndUpdate(id, { $set: payload }, { new: true });
exports.deleteBrand = (id) => Brand.findByIdAndDelete(id);

/* ===== Media & Import giữ nguyên ===== */
exports.uploadImages = (files, shopId) => uploadImages(files, shopId);
exports.uploadVideo  = (file, shopId)  => uploadVideo(file, shopId);
exports.importExcel = (fileBuffer, shopId) => importProductsFromExcel(fileBuffer, shopId);

/* ===== Low stock giữ nguyên ===== */
exports.lowStock = async (shopId, threshold=5) => {
  const rows = await ProductVariant.find({ is_active: true, shop_id: shopId, stock: { $lte: Number(threshold) } }, { product_id:1, stock:1, variant_attributes:1, sku:1 }).limit(200).lean();
  return rows;
};
