const Product  = require("../models/Product");
const Shop     = require("../models/Shop");
const auditLog = require("../services/auditLogService");
const notif    = require("../services/dbNotificationService");
const { moderateProduct, moderateBatch } = require("../services/productModerationService");

// ─── helpers ────────────────────────────────────────────────────────────────
const _audit = (req, action, product, meta = {}) =>
  auditLog.log({
    actorId: req.user._id,
    action,
    targetCollection: "products",
    targetId: String(product._id),
    ip: auditLog.getIp(req),
    userAgent: auditLog.getUA(req),
    metadata: { name: product.name, ...meta },
  });

/** Resolve shop owner userId from a product's shop_id */
async function _shopOwner(shopId) {
  if (!shopId) return null;
  const shop = await Shop.findById(shopId).select("owner_id").lean();
  return shop?.owner_id || null;
}

// ─── GET /api/admin/products?status=pending&q=...&page=1&limit=20 ───────────
exports.listProducts = async (req, res, next) => {
  try {
    const { status = "pending", q, page = 1, limit = 20, flagged } = req.query;
    const filter = {};
    if (status !== "all") filter.status = status;
    if (q) filter.name = { $regex: q, $options: "i" };
    // Filter only products that have moderation flags
    if (flagged === "true") filter["moderation_flags.0"] = { $exists: true };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Product.aggregate([
        { $match: filter },
        { $sort: { moderation_score: -1, createdAt: -1 } },
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

// ─── GET /api/admin/products/stats ──────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const [statusCounts, flaggedCount, recentRejected] = await Promise.all([
      Product.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Product.countDocuments({ "moderation_flags.0": { $exists: true }, status: "pending" }),
      Product.countDocuments({
        status: "inactive",
        auto_moderated: true,
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const counts = { pending: 0, active: 0, inactive: 0, out_of_stock: 0 };
    for (const s of statusCounts) counts[s._id] = s.count;

    res.json({
      success: true,
      data: {
        ...counts,
        total: Object.values(counts).reduce((a, b) => a + b, 0),
        flagged: flaggedCount,
        recentAutoRejected: recentRejected,
      },
    });
  } catch (e) { next(e); }
};

// ─── GET /api/admin/products/:id ────────────────────────────────────────────
exports.getProduct = async (req, res, next) => {
  try {
    const [p] = await Product.aggregate([
      { $match: { _id: req.params.id } },
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
    ]);
    if (!p) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    res.json({ success: true, data: p });
  } catch (e) { next(e); }
};

// ─── PATCH /api/admin/products/:id/approve ──────────────────────────────────
exports.approveProduct = async (req, res, next) => {
  try {
    const p = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "active", rejection_reason: "", moderation_flags: [], moderation_score: 0 } },
      { new: true }
    );
    if (!p) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    _audit(req, "product.approve", p);

    // Notify shop owner
    const ownerId = await _shopOwner(p.shop_id);
    if (ownerId) {
      notif.productApproved(ownerId, p.name).catch(() => {});
    }

    res.json({ success: true, data: p });
  } catch (e) { next(e); }
};

// ─── PATCH /api/admin/products/:id/reject ───────────────────────────────────
exports.rejectProduct = async (req, res, next) => {
  try {
    const { reason = "" } = req.body || {};
    if (!reason.trim()) {
      return res.status(400).json({ message: "Vui lòng nhập lý do từ chối" });
    }
    const p = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "inactive", rejection_reason: reason } },
      { new: true }
    );
    if (!p) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    _audit(req, "product.reject", p, { reason });

    // Notify shop owner
    const ownerId = await _shopOwner(p.shop_id);
    if (ownerId) {
      notif.productRejected(ownerId, p.name, reason).catch(() => {});
    }

    res.json({ success: true, data: p });
  } catch (e) { next(e); }
};

// ─── POST /api/admin/products/:id/moderate ──────────────────────────────────
// Run auto-moderation on a single product and apply result
exports.moderateProduct = async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const result = moderateProduct(p.toObject());

    // Update product with moderation results
    p.auto_moderated   = true;
    p.moderation_score = result.score;
    p.moderation_flags = result.flags.map(({ type, severity, message, field }) => ({ type, severity, message, field }));

    if (result.decision === "approved") {
      p.status           = "active";
      p.rejection_reason = "";
    } else if (result.decision === "rejected") {
      p.status           = "inactive";
      p.rejection_reason = result.summary;
    } else {
      // "needs_review" → stay pending for admin manual review
      p.status           = "pending";
      p.rejection_reason = result.summary;
    }

    await p.save();

    const auditAction = { approved: "product.auto_approve", rejected: "product.auto_reject", needs_review: "product.auto_flag" }[result.decision];
    _audit(req, auditAction, p, {
      decision: result.decision,
      score: result.score,
      flagCount: result.flags.length,
      reason: result.summary || "Auto-approved",
    });

    // Notify shop owner about the outcome
    const ownerId = await _shopOwner(p.shop_id);
    if (ownerId) {
      if (result.decision === "approved") {
        notif.productApproved(ownerId, p.name).catch(() => {});
      } else if (result.decision === "rejected") {
        notif.productRejected(ownerId, p.name, result.summary).catch(() => {});
      } else {
        notif.productFlagged(ownerId, p.name).catch(() => {});
      }
    }

    res.json({ success: true, data: { product: p, moderation: result } });
  } catch (e) { next(e); }
};

// ─── POST /api/admin/products/moderate-pending ──────────────────────────────
// Batch auto-moderate all pending products
exports.moderatePending = async (req, res, next) => {
  try {
    const pending = await Product.find({ status: "pending" }).lean();
    if (pending.length === 0) {
      return res.json({ success: true, data: { processed: 0, approved: 0, rejected: 0, needsReview: 0, results: [] } });
    }

    const { results, stats } = moderateBatch(pending);

    // Apply results in bulk using three-way decision
    const bulkOps = results.map((r) => {
      const update = {
        auto_moderated: true,
        moderation_score: r.score,
        moderation_flags: r.flags.map(({ type, severity, message, field }) => ({ type, severity, message, field })),
      };

      if (r.decision === "approved") {
        update.status = "active";
        update.rejection_reason = "";
      } else if (r.decision === "rejected") {
        update.status = "inactive";
        update.rejection_reason = r.summary;
      } else {
        // "needs_review" → stays pending
        update.status = "pending";
        update.rejection_reason = r.summary;
      }

      return {
        updateOne: {
          filter: { _id: r.productId },
          update: { $set: update },
        },
      };
    });

    await Product.bulkWrite(bulkOps);

    // Audit log for batch operation
    auditLog.log({
      actorId: req.user._id,
      action: "product.batch_moderate",
      targetCollection: "products",
      targetId: "batch",
      ip: auditLog.getIp(req),
      userAgent: auditLog.getUA(req),
      metadata: { ...stats },
    });

    // Notify shop owners
    for (const r of results) {
      const prod = pending.find((p) => p._id === r.productId);
      if (!prod?.shop_id) continue;
      const ownerId = await _shopOwner(prod.shop_id);
      if (!ownerId) continue;

      if (r.decision === "approved") {
        notif.productApproved(ownerId, r.productName).catch(() => {});
      } else if (r.decision === "rejected") {
        notif.productRejected(ownerId, r.productName, r.summary).catch(() => {});
      } else {
        notif.productFlagged(ownerId, r.productName).catch(() => {});
      }
    }

    res.json({
      success: true,
      data: {
        processed: stats.total,
        approved: stats.approved,
        rejected: stats.rejected,
        needsReview: stats.needsReview,
        results: results.map((r) => ({
          productId: r.productId,
          productName: r.productName,
          decision: r.decision,
          approved: r.approved,
          score: r.score,
          flagCount: r.flags.length,
          summary: r.summary,
        })),
      },
    });
  } catch (e) { next(e); }
};

// ─── POST /api/admin/products/bulk-approve ──────────────────────────────────
exports.bulkApprove = async (req, res, next) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Vui lòng chọn sản phẩm" });
    }

    const result = await Product.updateMany(
      { _id: { $in: ids }, status: { $in: ["pending", "inactive"] } },
      { $set: { status: "active", rejection_reason: "", moderation_flags: [], moderation_score: 0 } }
    );

    _audit(req, "product.bulk_approve", { _id: "batch", name: `${ids.length} products` }, { ids, modified: result.modifiedCount });

    // Notify owners
    const products = await Product.find({ _id: { $in: ids } }).select("name shop_id").lean();
    for (const p of products) {
      const ownerId = await _shopOwner(p.shop_id);
      if (ownerId) notif.productApproved(ownerId, p.name).catch(() => {});
    }

    res.json({ success: true, data: { modified: result.modifiedCount } });
  } catch (e) { next(e); }
};

// ─── POST /api/admin/products/bulk-reject ───────────────────────────────────
exports.bulkReject = async (req, res, next) => {
  try {
    const { ids, reason = "" } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Vui lòng chọn sản phẩm" });
    }
    if (!reason.trim()) {
      return res.status(400).json({ message: "Vui lòng nhập lý do từ chối" });
    }

    const result = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: { status: "inactive", rejection_reason: reason } }
    );

    _audit(req, "product.bulk_reject", { _id: "batch", name: `${ids.length} products` }, { ids, reason, modified: result.modifiedCount });

    // Notify owners
    const products = await Product.find({ _id: { $in: ids } }).select("name shop_id").lean();
    for (const p of products) {
      const ownerId = await _shopOwner(p.shop_id);
      if (ownerId) notif.productRejected(ownerId, p.name, reason).catch(() => {});
    }

    res.json({ success: true, data: { modified: result.modifiedCount } });
  } catch (e) { next(e); }
};
