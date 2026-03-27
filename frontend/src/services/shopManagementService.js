import apiClient from "./apiClient";

// ── Orders ──────────────────────────────────────────────────────────────────
export const shopOrderApi = {
  getAll:       (params = {}) => apiClient.get("/shop/orders", { params }).then((r) => r.data),
  getById:      (id)          => apiClient.get(`/shop/orders/${id}`).then((r) => r.data),
  confirm:      (id)          => apiClient.post(`/shop/orders/${id}/confirm`).then((r) => r.data),
  cancel:       (id, reason)  => apiClient.post(`/shop/orders/${id}/cancel`, { reason }).then((r) => r.data),
  updateStatus: (id, status)  => apiClient.put(`/shop/orders/${id}/status`, { status }).then((r) => r.data),
  pushToGhn:    (id)          => apiClient.post(`/shop/orders/${id}/ghn`).then((r) => r.data),
  track:        (id)          => apiClient.get(`/shop/orders/${id}/track`).then((r) => r.data),
  simulateGhn:  (ghnCode, ghnStatus) =>
    apiClient.post("/shipping/webhooks/ghn/simulate", { ghn_order_code: ghnCode, ghn_status: ghnStatus }).then((r) => r.data),
  devResetGhn:  (id) =>
    apiClient.post(`/shop/orders/${id}/dev-reset-ghn`).then((r) => r.data),
  syncGhn:      (id) =>
    apiClient.post(`/shop/orders/${id}/sync-ghn`).then((r) => r.data),
};

// ── Refunds ──────────────────────────────────────────────────────────────────
export const shopRefundApi = {
  getAll: (params = {}) => apiClient.get("/shop/refunds", { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/shop/refunds/${id}`).then((r) => r.data),
  approve:  (id, note) => apiClient.post(`/shop/refunds/${id}/approve`, { note }).then((r) => r.data),
  reject:   (id, note) => apiClient.post(`/shop/refunds/${id}/reject`,  { note }).then((r) => r.data),
  complete: (id, note) => apiClient.post(`/shop/refunds/${id}/complete`, { note }).then((r) => r.data),
};

// ── Customers ─────────────────────────────────────────────────────────────────
export const shopCustomerApi = {
  getAll: (params = {}) => apiClient.get("/shop/customers", { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/shop/customers/${id}`).then((r) => r.data),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const shopReviewApi = {
  getAll: (params = {}) => apiClient.get("/shop/reviews", { params }).then((r) => r.data),
  reply: (id, reply) => apiClient.post(`/shop/reviews/${id}/reply`, { reply }).then((r) => r.data),
};

// ── Wallet ────────────────────────────────────────────────────────────────────
export const shopWalletApi = {
  getWallet: () => apiClient.get("/shop/wallet").then((r) => r.data),
  getTransactions: (params = {}) => apiClient.get("/shop/wallet/transactions", { params }).then((r) => r.data),
  withdraw: (amount, bank_account_id, note) =>
    apiClient.post("/shop/wallet/withdraw", { amount, bank_account_id, note }).then((r) => r.data),
};
