const svc      = require("../services/ticketService");
const auditLog = require("../services/auditLogService");
const ok  = (res, data) => res.json({ status: "success", data });
const bad = (res, e, fb = "Bad request") => res.status(e?.status || 400).json({ status: "fail", message: e?.message || fb });

exports.createTicket = async (req, res) => {
  try {
    const ticket = await svc.createTicket(req.user._id, req.body || {});
    auditLog.log({ actorId: req.user._id, action: "ticket.create", targetCollection: "tickets", targetId: ticket._id, ip: auditLog.getIp(req), userAgent: auditLog.getUA(req), metadata: { subject: req.body?.subject, type: req.body?.type } });
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
    auditLog.log({ actorId: req.user._id, action: "ticket.close", targetCollection: "tickets", targetId: req.params.id, ip: auditLog.getIp(req), userAgent: auditLog.getUA(req) });
    ok(res, { ticket });
  } catch (e) { bad(res, e, "Cannot close ticket"); }
};

exports.addReply = async (req, res) => {
  try {
    const ticket = await svc.addCustomerReply(req.user._id, req.params.id, req.body || {});
    ok(res, { ticket });
  } catch (e) { bad(res, e, "Cannot add reply"); }
};
