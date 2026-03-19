const svc      = require("../services/multivendorShopService");
const auditLog = require("../services/auditLogService");

// ─── Public ───────────────────────────────────────────────────────────────────

exports.getShopBySlug = async (req, res, next) => {
  try {
    const shop = await svc.getShopBySlug(req.params.slug);
    if (!shop) return res.status(404).json({ message: "Shop không tồn tại hoặc chưa được duyệt" });
    res.json({ success: true, data: shop });
  } catch (e) { next(e); }
};

exports.getShopProducts = async (req, res, next) => {
  try {
    const shop = await svc.getShopBySlug(req.params.slug);
    if (!shop) return res.status(404).json({ message: "Shop không tồn tại" });
    const data = await svc.getShopProducts(shop._id, req.query);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

// ─── Shop Owner ───────────────────────────────────────────────────────────────

exports.registerShop = async (req, res, next) => {
  try {
    const shop = await svc.registerShop(req.userId, req.body);
    res.status(201).json({ success: true, data: shop, message: "Đăng ký shop thành công. Vui lòng chờ admin duyệt." });
  } catch (e) { next(e); }
};

exports.getMyShop = async (req, res, next) => {
  try {
    const shop = await svc.getMyShop(req.userId);
    res.json({ success: true, data: shop });
  } catch (e) { next(e); }
};

exports.updateMyShop = async (req, res, next) => {
  try {
    const shop = await svc.updateMyShop(req.userId, req.body);
    if (!shop) return res.status(404).json({ message: "Shop không tồn tại hoặc chưa được duyệt" });
    res.json({ success: true, data: shop });
  } catch (e) { next(e); }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

exports.adminListShops = async (req, res, next) => {
  try {
    const data = await svc.adminListShops(req.query);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

exports.adminApproveShop = async (req, res, next) => {
  try {
    const shop = await svc.adminApproveShop(req.params.id);
    auditLog.log({ actorId: req.user._id, action: "shop.approve", targetCollection: "shops", targetId: String(shop._id), ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { shop_name: shop.shop_name } });
    res.json({ success: true, data: shop, message: "Đã duyệt shop" });
  } catch (e) { next(e); }
};

exports.adminSuspendShop = async (req, res, next) => {
  try {
    const shop = await svc.adminSuspendShop(req.params.id, req.body.reason);
    auditLog.log({ actorId: req.user._id, action: "shop.suspend", targetCollection: "shops", targetId: String(shop._id), ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { shop_name: shop.shop_name, reason: req.body.reason } });
    res.json({ success: true, data: shop, message: "Đã tạm khóa shop" });
  } catch (e) { next(e); }
};

exports.adminRejectShop = async (req, res, next) => {
  try {
    const shop = await svc.adminRejectShop(req.params.id, req.body.reason);
    auditLog.log({ actorId: req.user._id, action: "shop.reject", targetCollection: "shops", targetId: String(shop._id), ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { shop_name: shop.shop_name, reason: req.body.reason } });
    res.json({ success: true, data: shop, message: "Đã từ chối shop" });
  } catch (e) { next(e); }
};

exports.adminGetShopStats = async (req, res, next) => {
  try {
    const data = await svc.adminGetShopStats(req.params.id);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};
