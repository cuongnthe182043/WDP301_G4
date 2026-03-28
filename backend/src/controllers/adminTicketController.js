const svc      = require("../services/ticketService");
const auditLog = require("../services/auditLogService");
const ok  = (res, data) => res.json({ status: "success", data });
const bad = (res, e, fb = "Bad request") => res.status(e?.status || 400).json({ status: "fail", message: e?.message || fb });

exports.listTickets = async (req, res) => {
  try {
    const data = await svc.adminListTickets(req.query);
    ok(res, data);
  } catch (e) { bad(res, e, "Cannot list tickets"); }
};

exports.getTicket = async (req, res) => {
  try {
    const ticket = await svc.adminGetTicketById(req.params.id);
    ok(res, { ticket });
  } catch (e) { bad(res, e, "Cannot get ticket"); }
};

exports.updateTicket = async (req, res) => {
  try {
    const ticket = await svc.adminUpdateTicket(req.user._id, req.params.id, req.body || {});
    auditLog.log({
      actorId: req.user._id, action: "admin.ticket.update",
      targetCollection: "tickets", targetId: req.params.id,
      ip: auditLog.getIp(req), userAgent: auditLog.getUA(req),
      metadata: { status: req.body?.status, priority: req.body?.priority },
    });
    ok(res, { ticket });
  } catch (e) { bad(res, e, "Cannot update ticket"); }
};

exports.addReply = async (req, res) => {
  try {
    const ticket = await svc.adminAddReply(req.user._id, req.params.id, req.body || {});
    ok(res, { ticket });
  } catch (e) { bad(res, e, "Cannot add reply"); }
};
