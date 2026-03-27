import apiClient from "./apiClient";

// ── Shop owner Flash Sale API (/shop/flashsales) ──────────────────────────────
export const shopFlashsaleApi = {
  getAll:  (params = {}) =>
    apiClient.get("/shop/flashsales", { params }).then((r) => r.data),
  getById: (id) =>
    apiClient.get(`/shop/flashsales/${id}`).then((r) => r.data),
  create:  (data) =>
    apiClient.post("/shop/flashsales", data).then((r) => r.data),
  update:  (id, data) =>
    apiClient.put(`/shop/flashsales/${id}`, data).then((r) => r.data),
  cancel:  (id) =>
    apiClient.patch(`/shop/flashsales/${id}/status`, { status: "cancelled" }).then((r) => r.data),
  delete:  (id) =>
    apiClient.delete(`/shop/flashsales/${id}`).then((r) => r.data),
};

// ── Legacy public API (kept for storefront usage) ─────────────────────────────
export const flashsaleApi = shopFlashsaleApi;
