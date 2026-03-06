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
