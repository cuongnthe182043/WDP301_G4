// controllers/checkoutController.js
const checkoutSvc = require("../services/checkoutService");

exports.preview = async (req, res, next) => {
  try {
    const r = await checkoutSvc.preview({
      userId:            req.userId || req.user?._id,
      selected_item_ids: req.body.selected_item_ids,
      buy_now_items:     req.body.buy_now_items,
      address_id:        req.body.address_id,
      ship_provider:     req.body.shipping_provider,
      voucher_code:      req.body.voucher_code,
      credits_to_use:    req.body.credits_to_use,   // { [shopId]: amount }
    });
    res.json({ status: "success", data: r });
  } catch (e) {
    console.error("PREVIEW_ERROR:", e.message);
    next(e);
  }
};

exports.confirm = async (req, res, next) => {
  try {
    const r = await checkoutSvc.confirm({
      userId:            req.userId || req.user?._id,
      shopId:            req.body.shop_id,
      selected_item_ids: req.body.selected_item_ids,
      buy_now_items:     req.body.buy_now_items,
      address_id:        req.body.address_id,
      note:              req.body.note,
      ship_provider:     req.body.shipping_provider,
      voucher_code:      req.body.voucher_code,
      credits_to_use:    req.body.credits_to_use,   // { [shopId]: amount }
      payment_method:    req.body.payment_method,
    });
    res.json({ status: "success", data: r });
  } catch (e) {
    console.error("CONFIRM_ERROR:", e.message);
    next(e);
  }
};
