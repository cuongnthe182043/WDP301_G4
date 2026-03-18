const svc = require("../services/refundService");
const ok  = (res, data) => res.json({ status: "success", data });
const bad = (res, e, fb = "Bad request") => res.status(e?.status || 400).json({ status: "fail", message: e?.message || fb });

exports.requestRefund = async (req, res) => {
  try {
    const refund = await svc.requestRefund(req.user._id, req.body || {});
    ok(res, { refund });
  } catch (e) { bad(res, e, "Cannot request refund"); }
};

exports.getUserRefunds = async (req, res) => {
  try {
    const refunds = await svc.getUserRefunds(req.user._id);
    ok(res, { refunds });
  } catch (e) { bad(res, e, "Cannot get refunds"); }
};
