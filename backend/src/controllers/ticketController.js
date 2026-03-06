const svc = require("../services/ticketService");
const ok  = (res, data) => res.json({ status: "success", data });
const bad = (res, e, fb = "Bad request") => res.status(e?.status || 400).json({ status: "fail", message: e?.message || fb });

exports.createTicket = async (req, res) => {
  try {
    const ticket = await svc.createTicket(req.user._id, req.body || {});
    ok(res, { ticket });
  } catch (e) { bad(res, e, "Cannot create ticket"); }
};

exports.getUserTickets = async (req, res) => {
  try {
    const data = await svc.getUserTickets(req.user._id, req.query);
    ok(res, data);
  } catch (e) { bad(res, e, "Cannot get tickets"); }
};

exports.getTicketById = async (req, res) => {
  try {
    const ticket = await svc.getTicketById(req.user._id, req.params.id);
    ok(res, { ticket });
  } catch (e) { bad(res, e, "Cannot get ticket"); }
};

exports.closeTicket = async (req, res) => {
  try {
    const ticket = await svc.closeTicket(req.user._id, req.params.id);
    ok(res, { ticket });
  } catch (e) { bad(res, e, "Cannot close ticket"); }
};
