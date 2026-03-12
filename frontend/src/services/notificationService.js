import apiClient from "./apiClient";

const BASE = "/notifications";

const notificationService = {
  getAll: (page = 1, limit = 20) =>
    apiClient.get(BASE, { params: { page, limit } }).then((r) => r.data.data),

  getUnreadCount: () =>
    apiClient.get(`${BASE}/unread-count`).then((r) => r.data.data.count),

  markRead: (id) =>
    apiClient.put(`${BASE}/${id}/read`).then((r) => r.data.data),

  markAllRead: () =>
    apiClient.put(`${BASE}/read-all`).then((r) => r.data.data),

  deleteOne: (id) =>
    apiClient.delete(`${BASE}/${id}`).then((r) => r.data.data),
};

export default notificationService;
