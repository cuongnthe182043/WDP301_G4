const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/reviewController");

// POST /api/reviews — submit a review for a product in a delivered order
router.post("/", verifyToken, ctrl.submitReview);

// GET /api/reviews/my — get all reviews written by the current user
router.get("/my", verifyToken, ctrl.getUserReviews);

module.exports = router;
