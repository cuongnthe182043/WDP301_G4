const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const { uploadImagesMw } = require("../middlewares/uploadMiddleware");
const ctrl = require("../controllers/reviewController");

// POST /api/reviews/upload-images — upload review images to Cloudinary
router.post("/upload-images", verifyToken, uploadImagesMw, ctrl.uploadImages);

// POST /api/reviews — submit a review for a product in a delivered order
router.post("/", verifyToken, ctrl.submitReview);

// GET /api/reviews/my — get all reviews written by the current user
router.get("/my", verifyToken, ctrl.getUserReviews);

// GET /api/reviews/order/:orderId — get reviews for a specific order
router.get("/order/:orderId", verifyToken, ctrl.getReviewsByOrder);

// PUT /api/reviews/:id — update a review
router.put("/:id", verifyToken, ctrl.updateReview);

// DELETE /api/reviews/:id — soft-delete a review
router.delete("/:id", verifyToken, ctrl.deleteReview);

module.exports = router;
