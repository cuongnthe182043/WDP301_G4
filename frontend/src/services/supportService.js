import apiClient from "./apiClient";

export const supportService = {
  getTickets:  (params = {}) => apiClient.get("/tickets", { params }).then(r => r.data.data),
  getTicket:   (id)          => apiClient.get(`/tickets/${id}`).then(r => r.data.data.ticket),
  createTicket:(payload)     => apiClient.post("/tickets", payload).then(r => r.data.data.ticket),
  closeTicket: (id)          => apiClient.patch(`/tickets/${id}/close`).then(r => r.data.data.ticket),
};
