// src/sockets/realtime.js
module.exports = (io) => {
  const nsp = io.of("/realtime");

  nsp.on("connection", (socket) => {
    // Shop dashboard room
    socket.on("join-shop", ({ shopId }) => {
      if (shopId) socket.join(`shop:${shopId}`);
    });

    // Per-user notification room — client sends { userId } after login
    socket.on("join-user", ({ userId }) => {
      if (userId) socket.join(`user:${userId}`);
    });

    // Allow client to leave user room on logout
    socket.on("leave-user", ({ userId }) => {
      if (userId) socket.leave(`user:${userId}`);
    });

    // Conversation room for real-time chat
    socket.on("join-conversation", ({ conversationId }) => {
      if (conversationId) socket.join(`conv:${conversationId}`);
    });
    socket.on("leave-conversation", ({ conversationId }) => {
      if (conversationId) socket.leave(`conv:${conversationId}`);
    });
  });

  function broadcastOrderUpdate(shopId, payload) {
    nsp.to(`shop:${shopId}`).emit("order:update", payload);
  }

  /** Emit any event to a specific user's room */
  function emitToUser(userId, event, data) {
    nsp.to(`user:${String(userId)}`).emit(event, data);
  }

  /** Emit an event to all sockets in a conversation room */
  function emitToConversation(convId, event, data) {
    nsp.to(`conv:${convId}`).emit(event, data);
  }

  return { broadcastOrderUpdate, emitToUser, emitToConversation };
};
