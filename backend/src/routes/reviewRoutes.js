const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const checkBanStatus  = require("../middlewares/checkBanStatus");
const { uploadImagesMw } = require("../middlewares/uploadMiddleware");
const ctrl = require("../controllers/reviewController");

// Read-only — allowed for banned users
router.get("/my",             verifyToken, ctrl.getUserReviews);
router.get("/order/:orderId", verifyToken, ctrl.getReviewsByOrder);

// Write operations — blocked for banned users
router.post("/upload-images", verifyToken, checkBanStatus, uploadImagesMw, ctrl.uploadImages);
router.post("/",              verifyToken, checkBanStatus, ctrl.submitReview);
router.put("/:id",            verifyToken, checkBanStatus, ctrl.updateReview);
router.delete("/:id",         verifyToken, checkBanStatus, ctrl.deleteReview);
router.post("/:id/thread",    verifyToken, checkBanStatus, ctrl.addThreadReply);

module.exports = router;
