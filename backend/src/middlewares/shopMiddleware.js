const Shop = require("../models/Shop");

/**
 * requireShopOwner
 * Resolves req.shop for the authenticated user.
 * - Finds an approved Shop where owner_id === req.userId
 * - Sets req.shop on success; 403 otherwise
 *
 * Must be used AFTER verifyToken.
 */
exports.requireShopOwner = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ owner_id: req.userId, status: "approved" }).lean();
    if (!shop) {
      return res.status(403).json({
        message: "Bạn chưa có shop hoặc shop chưa được duyệt. Vui lòng đăng ký và chờ duyệt.",
      });
    }
    req.shop = shop;
    next();
  } catch (err) {
    next(err);
  }
};
