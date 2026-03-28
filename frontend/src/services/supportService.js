import apiClient from "./apiClient";

export const supportService = {
  // Customer
  getTickets:   (params = {}) => apiClient.get("/tickets", { params }).then(r => r.data.data),
  getTicket:    (id)          => apiClient.get(`/tickets/${id}`).then(r => r.data.data.ticket),
  createTicket: (payload)     => apiClient.post("/tickets", payload).then(r => r.data.data.ticket),
  closeTicket:  (id)          => apiClient.patch(`/tickets/${id}/close`).then(r => r.data.data.ticket),
  addReply:     (id, payload) => apiClient.post(`/tickets/${id}/reply`, payload).then(r => r.data.data.ticket),

  // Admin
  adminGetTickets:  (params = {}) => apiClient.get("/admin/tickets", { params }).then(r => r.data.data),
  adminGetTicket:   (id)          => apiClient.get(`/admin/tickets/${id}`).then(r => r.data.data.ticket),
  adminUpdateTicket:(id, payload) => apiClient.patch(`/admin/tickets/${id}`, payload).then(r => r.data.data.ticket),
  adminAddReply:    (id, payload) => apiClient.post(`/admin/tickets/${id}/reply`, payload).then(r => r.data.data.ticket),

  // Shop
  shopGetTickets: (params = {}) => apiClient.get("/shop/tickets", { params }).then(r => r.data.data),
  shopGetTicket:  (id)          => apiClient.get(`/shop/tickets/${id}`).then(r => r.data.data.ticket),
  shopAddReply:   (id, payload) => apiClient.post(`/shop/tickets/${id}/reply`, payload).then(r => r.data.data.ticket),
};
