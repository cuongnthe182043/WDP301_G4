const Ticket = require("../models/Ticket");

exports.createTicket = async (userId, { order_id, shop_id, subject, message, images, priority }) => {
  if (!subject || !message) {
    const e = new Error("subject and message are required"); e.status = 400; throw e;
  }
  return Ticket.create({
    user_id: userId,
    order_id: order_id || undefined,
    shop_id: shop_id || undefined,
    subject: subject.trim(),
    message: message.trim(),
    images: images || [],
    priority: priority || "medium",
    status: "open",
    logs: [{ actor_id: userId, action: "Ticket created" }],
  });
};

exports.getUserTickets = async (userId, { page = 1, limit = 20, status } = {}) => {
  const filter = { user_id: userId };
  if (status) filter.status = status;
  const safeLimit = Math.min(Number(limit), 50);
  const safePage = Math.max(Number(page), 1);
  const [tickets, total] = await Promise.all([
    Ticket.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    Ticket.countDocuments(filter),
  ]);
  return { tickets, total, page: safePage, limit: safeLimit };
};

exports.getTicketById = async (userId, ticketId) => {
  const ticket = await Ticket.findById(ticketId).lean();
  if (!ticket) { const e = new Error("Ticket not found"); e.status = 404; throw e; }
  if (ticket.user_id !== userId) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  return ticket;
};

exports.closeTicket = async (userId, ticketId) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) { const e = new Error("Ticket not found"); e.status = 404; throw e; }
  if (ticket.user_id !== userId) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  if (ticket.status === "closed") { const e = new Error("Ticket already closed"); e.status = 400; throw e; }
  ticket.status = "closed";
  ticket.logs.push({ actor_id: userId, action: "Closed by user" });
  await ticket.save();
  return ticket.toObject();
};
