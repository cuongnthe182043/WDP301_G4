const svc = require("../services/reviewService");
const ok  = (res, data) => res.json({ status: "success", data });
const bad = (res, e, fb = "Bad request") => res.status(e?.status || 400).json({ status: "fail", message: e?.message || fb });

exports.submitReview = async (req, res) => {
  try {
    const review = await svc.submitReview(req.user._id, req.body || {});
    ok(res, { review });
  } catch (e) { bad(res, e, "Cannot submit review"); }
};

exports.getUserReviews = async (req, res) => {
  try {
    const reviews = await svc.getUserReviews(req.user._id);
    ok(res, { reviews });
  } catch (e) { bad(res, e, "Cannot get reviews"); }
};

exports.getReviewsByOrder = async (req, res) => {
  try {
    const reviews = await svc.getReviewsByOrder(req.user._id, req.params.orderId);
    ok(res, { reviews });
  } catch (e) { bad(res, e, "Cannot get order reviews"); }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await svc.updateReview(req.user._id, req.params.id, req.body || {});
    ok(res, { review });
  } catch (e) { bad(res, e, "Cannot update review"); }
};

exports.deleteReview = async (req, res) => {
  try {
    const result = await svc.deleteReview(req.user._id, req.params.id);
    ok(res, result);
  } catch (e) { bad(res, e, "Cannot delete review"); }
};

exports.uploadImages = async (req, res) => {
  try {
    const images = await svc.uploadReviewImages(req.files || []);
    ok(res, { images });
  } catch (e) { bad(res, e, "Cannot upload images"); }
};
