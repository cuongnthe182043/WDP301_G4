const Ticket = require("../models/Ticket");

// ─── Customer ────────────────────────────────────────────────────────────────

exports.createTicket = async (userId, { order_id, shop_id, type, category, subject, message, images, priority }) => {
  if (!subject || !message) {
    const e = new Error("subject and message are required"); e.status = 400; throw e;
  }
  return Ticket.create({
    user_id:  userId,
    order_id: order_id  || undefined,
    shop_id:  shop_id   || undefined,
    type:     type      || "general",
    category: category  || "",
    subject:  subject.trim(),
    message:  message.trim(),
    images:   images || [],
    priority: priority || "medium",
    status:   "open",
    logs: [{ actor_id: userId, action: "Ticket created" }],
  });
};

exports.getUserTickets = async (userId, { page = 1, limit = 20, status, type } = {}) => {
  const filter = { user_id: userId };
  if (status) filter.status = status;
  if (type)   filter.type   = type;
  const safeLimit = Math.min(Number(limit), 50);
  const safePage  = Math.max(Number(page), 1);
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

exports.addCustomerReply = async (userId, ticketId, { message, images }) => {
  if (!message?.trim()) { const e = new Error("Message is required"); e.status = 400; throw e; }
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) { const e = new Error("Ticket not found"); e.status = 404; throw e; }
  if (ticket.user_id !== userId) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  if (ticket.status === "closed") { const e = new Error("Cannot reply to a closed ticket"); e.status = 400; throw e; }

  ticket.replies.push({ actor_id: userId, role: "customer", message: message.trim(), images: images || [] });
  // Reopen if in_progress so admin gets notified
  if (ticket.status === "in_progress") {
    ticket.status = "open";
    ticket.logs.push({ actor_id: userId, action: "Customer replied — reopened" });
  } else {
    ticket.logs.push({ actor_id: userId, action: "Customer replied" });
  }
  await ticket.save();
  return ticket.toObject();
};

// ─── Admin ────────────────────────────────────────────────────────────────────

exports.adminListTickets = async ({ page = 1, limit = 20, status, type, priority, search, assigned_to } = {}) => {
  const filter = {};
  if (status)      filter.status      = status;
  if (type)        filter.type        = type;
  if (priority)    filter.priority    = priority;
  if (assigned_to) filter.assigned_to = assigned_to;
  if (search)      filter.subject     = { $regex: search, $options: "i" };

  const safeLimit = Math.min(Number(limit), 100);
  const safePage  = Math.max(Number(page), 1);

  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Ticket.countDocuments(filter),
  ]);
  return { tickets, total, page: safePage, limit: safeLimit };
};

exports.adminGetTicketById = async (ticketId) => {
  const ticket = await Ticket.findById(ticketId).lean();
  if (!ticket) { const e = new Error("Ticket not found"); e.status = 404; throw e; }
  return ticket;
};

exports.adminUpdateTicket = async (adminId, ticketId, { status, priority, assigned_to, admin_note, resolution }) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) { const e = new Error("Ticket not found"); e.status = 404; throw e; }

  const prev = ticket.status;
  if (status      !== undefined) ticket.status      = status;
  if (priority    !== undefined) ticket.priority    = priority;
  if (assigned_to !== undefined) ticket.assigned_to = assigned_to;
  if (admin_note  !== undefined) ticket.admin_note  = admin_note;
  if (resolution  !== undefined) ticket.resolution  = resolution;

  if (status === "closed" && prev !== "closed") {
    ticket.resolved_at = new Date();
    ticket.resolved_by = adminId;
    ticket.logs.push({ actor_id: adminId, action: `Closed by admin. Resolution: ${resolution || "—"}` });
  } else if (status && status !== prev) {
    ticket.logs.push({ actor_id: adminId, action: `Status changed: ${prev} → ${status}` });
  }

  await ticket.save();
  return ticket.toObject();
};

exports.adminAddReply = async (adminId, ticketId, { message, images }) => {
  if (!message?.trim()) { const e = new Error("Message is required"); e.status = 400; throw e; }
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) { const e = new Error("Ticket not found"); e.status = 404; throw e; }

  ticket.replies.push({ actor_id: adminId, role: "admin", message: message.trim(), images: images || [] });
  if (ticket.status === "open") {
    ticket.status = "in_progress";
    ticket.logs.push({ actor_id: adminId, action: "Admin replied — moved to in_progress" });
  } else {
    ticket.logs.push({ actor_id: adminId, action: "Admin replied" });
  }
  await ticket.save();
  return ticket.toObject();
};

// ─── Shop ─────────────────────────────────────────────────────────────────────

exports.shopGetTickets = async (shopId, { page = 1, limit = 20, status } = {}) => {
  const filter = { shop_id: shopId };
  if (status) filter.status = status;
  const safeLimit = Math.min(Number(limit), 50);
  const safePage  = Math.max(Number(page), 1);
  const [tickets, total] = await Promise.all([
    Ticket.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    Ticket.countDocuments(filter),
  ]);
  return { tickets, total, page: safePage, limit: safeLimit };
};

exports.shopGetTicketById = async (shopId, ticketId) => {
  const ticket = await Ticket.findById(ticketId).lean();
  if (!ticket) { const e = new Error("Ticket not found"); e.status = 404; throw e; }
  if (ticket.shop_id !== shopId) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  return ticket;
};

exports.shopAddReply = async (shopOwnerId, shopId, ticketId, { message, images }) => {
  if (!message?.trim()) { const e = new Error("Message is required"); e.status = 400; throw e; }
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) { const e = new Error("Ticket not found"); e.status = 404; throw e; }
  if (ticket.shop_id !== shopId) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  if (ticket.status === "closed") { const e = new Error("Cannot reply to a closed ticket"); e.status = 400; throw e; }

  ticket.replies.push({ actor_id: shopOwnerId, role: "shop", message: message.trim(), images: images || [] });
  ticket.logs.push({ actor_id: shopOwnerId, action: "Shop replied" });
  await ticket.save();
  return ticket.toObject();
};
