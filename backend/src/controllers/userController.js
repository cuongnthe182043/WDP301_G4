const svc = require("../services/userService");
const ok  = (res, data) => res.json({ status: "success", data });
const bad = (res, e, fb="Bad request") => res.status(e?.status||400).json({ status:"fail", message:e?.message||fb, errors:e?.errors });
const nf  = (res, msg) => res.status(404).json({ status:"fail", message: msg });

exports.getProfile = async (req, res) => {
  try {
    const user = await svc.getById(req.user._id);
    if (!user) return nf(res, "User not found");
    ok(res, { user });
  } catch (e) { bad(res, e, "Cannot get profile"); }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await svc.updateById(req.user._id, req.body||{});
    if (!user) return nf(res, "User not found");
    ok(res, { user });
  } catch (e) {
    if (e?.code === 11000) return bad(res, { message:"Duplicate field", errors:e.keyValue });
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

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) throw Object.assign(new Error("No file uploaded"), { status: 400 });
    const result = await svc.uploadAvatarFromBuffer(req.user._id, req.file.buffer);
    if (!result) return nf(res, "User not found");
    ok(res, result);
  } catch (e) { bad(res, e, "Cannot upload avatar"); }
};
