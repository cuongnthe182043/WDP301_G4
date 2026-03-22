import apiClient from "./apiClient";

const chatService = {
  // ─── Customer ───────────────────────────────────────────────────────────────

  /** Start or retrieve an existing conversation with a shop */
  startConversation: (shopId) =>
    apiClient.post("/conversations", { shop_id: shopId }).then(r => r.data.data),

  /** List all conversations for the current customer */
  listConversations: () =>
    apiClient.get("/conversations").then(r => r.data.data),

  /** Fetch paginated messages for a conversation */
  getMessages: (convId, page = 1, limit = 30) =>
    apiClient
      .get(`/conversations/${convId}/messages`, { params: { page, limit } })
      .then(r => r.data.data),

  /** Send a message as a customer */
  sendMessage: (convId, content, images = []) =>
    apiClient
      .post(`/conversations/${convId}/messages`, { content, images })
      .then(r => r.data.data),

  // ─── Shop ────────────────────────────────────────────────────────────────────

  /** List all conversations for the shop owned by the current user */
  shopListConversations: () =>
    apiClient.get("/shop/conversations").then(r => r.data.data),

  /** Fetch paginated messages for a conversation (shop side uses same endpoint) */
  shopGetMessages: (convId, page = 1, limit = 30) =>
    apiClient
      .get(`/conversations/${convId}/messages`, { params: { page, limit } })
      .then(r => r.data.data),

  /** Send a message as a shop */
  shopSendMessage: (convId, content, images = []) =>
    apiClient
      .post(`/conversations/${convId}/messages`, { content, images })
      .then(r => r.data.data),
};

export default chatService;
