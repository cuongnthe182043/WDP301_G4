const svc = require("../services/ticketService");
const ok  = (res, data) => res.json({ status: "success", data });
const bad = (res, e, fb = "Bad request") => res.status(e?.status || 400).json({ status: "fail", message: e?.message || fb });

exports.listTickets = async (req, res) => {
  try {
    const data = await svc.shopGetTickets(req.shop._id, req.query);
    ok(res, data);
  } catch (e) { bad(res, e, "Cannot list tickets"); }
};

exports.getTicket = async (req, res) => {
  try {
    const ticket = await svc.shopGetTicketById(req.shop._id, req.params.id);
    ok(res, { ticket });
  } catch (e) { bad(res, e, "Cannot get ticket"); }
};

exports.addReply = async (req, res) => {
  try {
    const ticket = await svc.shopAddReply(req.user._id, req.shop._id, req.params.id, req.body || {});
    ok(res, { ticket });
  } catch (e) { bad(res, e, "Cannot add reply"); }
};
