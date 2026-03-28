// controllers/checkoutController.js
const checkoutSvc = require("../services/checkoutService");
const auditLog    = require("../services/auditLogService");

exports.preview = async (req, res, next) => {
  try {
    const r = await checkoutSvc.preview({
      userId:                req.userId || req.user?._id,
      selected_item_ids:     req.body.selected_item_ids,
      buy_now_items:         req.body.buy_now_items,
      address_id:            req.body.address_id,
      voucher_code:          req.body.voucher_code,
      shipping_voucher_code: req.body.shipping_voucher_code,
      credits_to_use:        req.body.credits_to_use,
    });
    res.json({ status: "success", data: r });
  } catch (e) {
    console.error("PREVIEW_ERROR:", e.message);
    next(e);
  }
};

exports.confirm = async (req, res, next) => {
  try {
    const userId = req.userId || req.user?._id;
    const r = await checkoutSvc.confirm({
      userId,
      selected_item_ids:     req.body.selected_item_ids,
      buy_now_items:         req.body.buy_now_items,
      address_id:            req.body.address_id,
      note:                  req.body.note,
      voucher_code:          req.body.voucher_code,
      shipping_voucher_code: req.body.shipping_voucher_code,
      credits_to_use:        req.body.credits_to_use,
      payment_method:        req.body.payment_method,
    });
    auditLog.log({ actorId: userId, action: "order.create", targetCollection: "orders", ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { payment_method: req.body.payment_method, voucher_code: req.body.voucher_code || null, shipping_voucher_code: req.body.shipping_voucher_code || null } });
    res.json({ status: "success", data: r });
  } catch (e) {
    console.error("CONFIRM_ERROR:", e.message);
    next(e);
  }
};
