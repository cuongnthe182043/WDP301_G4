const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ProductVariant = require("../models/ProductVariant");
const cloudinary = require("../config/cloudinary");

exports.getById = async (id) => {
  const u = await User.findById(id).lean();
  if (!u) return null;
  delete u.password_hash; delete u.refresh_token;
  return u;
};

exports.updateById = async (id, payload) => {
  if (payload.username !== undefined) {
    const e = new Error("username is immutable"); e.status = 400; throw e;
  }
  const allow = [
    "name","email","phone","gender","dob","avatar_url",
    "preferences.height","preferences.weight","preferences.size_top","preferences.size_bottom",
  ];
  const $set = {};
  for (const k of allow) {
    const p = k.split(".");
    if (p.length === 1 && payload[k] !== undefined) $set[k] = payload[k];
    if (p.length === 2 && payload[p[0]]?.[p[1]] !== undefined) $set[k] = payload[p[0]][p[1]];
  }
  const u = await User.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true }).lean();
  if (!u) return null;
  delete u.password_hash; delete u.refresh_token;
  return u;
};

exports.changePassword = async (id, current_password, new_password) => {
  if (!current_password || !new_password || new_password.length < 8) {
    const e = new Error("Invalid password payload"); e.status = 400; throw e;
  }
  const u = await User.findById(id);
  if (!u) return null;
  const ok = u.password_hash ? await bcrypt.compare(current_password, u.password_hash) : false;
  if (!ok) { const e = new Error("Current password is incorrect"); e.status = 400; throw e; }
  const salt = await bcrypt.genSalt(10);
  u.password_hash  = await bcrypt.hash(new_password, salt);
  u.refresh_token  = undefined;  // invalidate existing session
  await u.save();
  return true;
};

/* ── Recently Viewed ── */
exports.addRecentlyViewed = async (userId, productId) => {
  const MAX = 20;
  // Pull existing entry first (so it moves to front), then push to front, trim to MAX
  await User.findByIdAndUpdate(userId, { $pull: { recently_viewed: productId } });
  await User.findByIdAndUpdate(userId, {
    $push: { recently_viewed: { $each: [productId], $position: 0, $slice: MAX } },
  });
};

exports.getRecentlyViewed = async (userId) => {
  const u = await User.findById(userId)
    .populate("recently_viewed", "_id name slug images base_price rating_avg sold_count status")
    .lean();
  if (!u) return [];
  return (u.recently_viewed || []).filter((p) => p && p.status === "active");
};

/* ── Wishlist ── */
exports.getWishlist = async (id) => {
  const u = await User.findById(id)
    .populate("wishlist", "_id name slug images base_price rating_avg rating_count sold_count status is_featured")
    .lean();
  if (!u) return null;
  const products = (u.wishlist || []).filter(p => p && p.status === "active");
  if (products.length === 0) return products;

  // Fetch lowest-price variant per product (for compare_at_price / discount)
  const productIds = products.map(p => p._id);
  const variants = await ProductVariant.aggregate([
    { $match: { product_id: { $in: productIds }, is_active: true } },
    { $sort: { price: 1 } },
    {
      $group: {
        _id: "$product_id",
        min_price: { $first: "$price" },
        compare_at_price: { $first: "$compare_at_price" },
        variant_id: { $first: "$_id" },
      },
    },
  ]);
  const variantMap = {};
  for (const v of variants) variantMap[v._id] = v;

  return products.map(p => {
    const v = variantMap[p._id];
    const price = v?.min_price ?? p.base_price;
    const oldPrice = v?.compare_at_price || null;
    const discount = oldPrice && oldPrice > price
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : 0;
    return {
      ...p,
      price,
      compare_at_price: oldPrice,
      discount_percent: discount,
      default_variant_id: v?.variant_id || null,
    };
  });
};

exports.addToWishlist = async (userId, productId) => {
  const u = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { wishlist: productId } },
    { new: true }
  ).lean();
  if (!u) return null;
  delete u.password_hash; delete u.refresh_token;
  return u;
};

exports.removeFromWishlist = async (userId, productId) => {
  const u = await User.findByIdAndUpdate(
    userId,
    { $pull: { wishlist: productId } },
    { new: true }
  ).lean();
  if (!u) return null;
  delete u.password_hash; delete u.refresh_token;
  return u;
};

exports.uploadAvatarFromBuffer = (id, buf) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder: "dfs/users", resource_type: "image", overwrite: true },
    async (err, result) => {
      if (err) return reject(err);
      const u = await User.findByIdAndUpdate(id, { $set: { avatar_url: result.secure_url } }, { new: true }).lean();
      if (!u) return resolve(null);
      delete u.password_hash; delete u.refresh_token;
      resolve({ user: u, upload: { url: result.secure_url, public_id: result.public_id } });
    }
  );
  stream.end(buf);
});
