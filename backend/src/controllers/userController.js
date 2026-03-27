const svc      = require("../services/userService");
const UserBodyProfile = require("../models/UserBodyProfile");
const auditLog = require("../services/auditLogService");
const ok = (res, data) => res.json({ status: "success", data });
const bad = (res, e, fb = "Bad request") => res.status(e?.status || 400).json({ status: "fail", message: e?.message || fb, errors: e?.errors });
const nf = (res, msg) => res.status(404).json({ status: "fail", message: msg });

exports.getProfile = async (req, res) => {
  try {
    const user = await svc.getById(req.user._id);
    if (!user) return nf(res, "User not found");
    ok(res, { user });
  } catch (e) { bad(res, e, "Cannot get profile"); }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await svc.updateById(req.user._id, req.body || {});
    if (!user) return nf(res, "User not found");
    auditLog.log({ actorId: req.user._id, action: "user.update_profile", targetCollection: "users", targetId: req.user._id, ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { fields: Object.keys(req.body || {}) } });
    ok(res, { user });
  } catch (e) {
    if (e?.code === 11000) return bad(res, { message: "Duplicate field", errors: e.keyValue });
    bad(res, e, "Cannot update profile");
  }
};

exports.changePassword = async (req, res) => {
  try {
    const done = await svc.changePassword(req.user._id, req.body?.current_password, req.body?.new_password);
    if (done === null) return nf(res, "User not found");
    ok(res, { message: "Password updated" });
  } catch (e) { bad(res, e, "Cannot change password"); }
};

exports.getRecentlyViewed = async (req, res) => {
  try {
    const items = await svc.getRecentlyViewed(req.user._id);
    ok(res, { recently_viewed: items });
  } catch (e) { bad(res, e, "Cannot get recently viewed"); }
};

exports.addRecentlyViewed = async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) return bad(res, { message: "product_id required" });
    await svc.addRecentlyViewed(req.user._id, product_id);
    ok(res, { message: "ok" });
  } catch (e) { bad(res, e, "Cannot track recently viewed"); }
};

exports.getWishlist = async (req, res) => {
  try {
    const items = await svc.getWishlist(req.user._id);
    if (items === null) return nf(res, "User not found");
    ok(res, { wishlist: items });
  } catch (e) { bad(res, e, "Cannot get wishlist"); }
};

exports.addToWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) return bad(res, { message: "product_id required" });
    const user = await svc.addToWishlist(req.user._id, product_id);
    if (!user) return nf(res, "User not found");
    ok(res, { message: "Added to wishlist" });
  } catch (e) { bad(res, e, "Cannot add to wishlist"); }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const { product_id } = req.params;
    const user = await svc.removeFromWishlist(req.user._id, product_id);
    if (!user) return nf(res, "User not found");
    ok(res, { message: "Removed from wishlist" });
  } catch (e) { bad(res, e, "Cannot remove from wishlist"); }
};

exports.getBodyProfile = async (req, res) => {
  try {
    const profile = await UserBodyProfile.findOne({ user_id: req.user._id }).lean();
    ok(res, { body_profile: profile || null });
  } catch (e) { bad(res, e, "Cannot get body profile"); }
};

exports.upsertBodyProfile = async (req, res) => {
  try {
    const ALLOWED = ["height", "weight", "chest", "waist", "hip", "shoulder", "leg_length", "body_length"];
    const update = {};
    for (const key of ALLOWED) {
      const v = req.body[key];
      if (v != null) {
        const n = Number(v);
        if (!isNaN(n) && n > 0) update[key] = n;
      }
    }
    const profile = await UserBodyProfile.findOneAndUpdate(
      { user_id: req.user._id },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    ok(res, { body_profile: profile });
  } catch (e) { bad(res, e, "Cannot save body profile"); }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) throw Object.assign(new Error("No file uploaded"), { status: 400 });
    const result = await svc.uploadAvatarFromBuffer(req.user._id, req.file.buffer);
    if (!result) return nf(res, "User not found");
    ok(res, result);
  } catch (e) { bad(res, e, "Cannot upload avatar"); }
};

exports.registerShop = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No user found in request",
      });
    }

    const newShop = await svc.registerShop(userId, req.body);
    auditLog.log({ actorId: userId, action: "shop.register", targetCollection: "shops", targetId: newShop._id, ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { shop_name: req.body?.shop_name } });

    return res.status(201).json({
      success: true,
      message: "Shop registration request submitted successfully",
      data: newShop,
    });

  } catch (error) {
    const statusCode = error.status || 500;
    const message = error.message || "Internal Server Error";

    console.error(`[ShopController][registerShop] Error: ${message}`, error);

    return res.status(statusCode).json({
      success: false,
      message: message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};