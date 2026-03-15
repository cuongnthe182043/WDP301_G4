import apiClient from "./apiClient";

// ── Shop-owner API (requires auth) ────────────────────────────────────────────
export const voucherApi = {
  getAll:   (page = 1, limit = 10, code = "", status = "") =>
    apiClient.get("/vouchers", { params: { page, limit, code: code || undefined, status: status || undefined } }).then(r => r.data),

  getDetail: (id) =>
    apiClient.get(`/vouchers/${id}`).then(r => r.data),

  create: (data) =>
    apiClient.post("/vouchers", data).then(r => r.data),

  update: (id, data) =>
    apiClient.put(`/vouchers/${id}`, data).then(r => r.data),

  toggle: (id) =>
    apiClient.patch(`/vouchers/${id}/toggle`).then(r => r.data),

  delete: (id) =>
    apiClient.delete(`/vouchers/${id}`).then(r => r.data),
};

// ── Customer API ──────────────────────────────────────────────────────────────
export const publicVoucherApi = {
  // List active, non-expired, non-exhausted vouchers (no auth)
  listPublic: (params = {}) =>
    apiClient.get("/vouchers/public", { params }).then(r => r.data),

  // Validate a code + get discount amount (auth required)
  validate: (code, subtotal) =>
    apiClient.post("/vouchers/validate", { code, subtotal }).then(r => r.data),
};
