const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware"); // giữ nguyên auth của anh (named export)
const { uploadAvatar } = require("../middlewares/uploadMiddleware");
const ctrl = require("../controllers/userController");

// /api/users
router.get("/", verifyToken, ctrl.getProfile);
router.put("/", verifyToken, ctrl.updateProfile);
router.patch("/change-password", verifyToken, ctrl.changePassword);
router.post("/avatar", verifyToken, uploadAvatar, ctrl.uploadAvatar);

// Recently viewed
router.get("/recently-viewed", verifyToken, ctrl.getRecentlyViewed);
router.post("/recently-viewed", verifyToken, ctrl.addRecentlyViewed);

// Wishlist
router.get("/wishlist", verifyToken, ctrl.getWishlist);
router.post("/wishlist", verifyToken, ctrl.addToWishlist);
router.delete("/wishlist/:product_id", verifyToken, ctrl.removeFromWishlist);

// Body profile (AI size recommendation)
router.get("/body-profile", verifyToken, ctrl.getBodyProfile);
router.put("/body-profile", verifyToken, ctrl.upsertBodyProfile);

module.exports = router;
