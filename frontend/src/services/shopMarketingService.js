import apiClient from "./apiClient";

// ── Shop-owner marketing API ───────────────────────────────────────────────────
export const campaignApi = {
  list:   (params = {}) => apiClient.get("/shop/marketing/campaigns", { params }).then(r => r.data),
  create: (data)        => apiClient.post("/shop/marketing/campaigns", data).then(r => r.data),
};

export const voucherDistributeApi = {
  distribute: (voucherId, data) =>
    apiClient.post(`/shop/marketing/vouchers/${voucherId}/distribute`, data).then(r => r.data),
};

export const shopCreditApi = {
  list:            (params = {}) => apiClient.get("/shop/marketing/credits", { params }).then(r => r.data),
  give:            (data)        => apiClient.post("/shop/marketing/credits/give", data).then(r => r.data),
  getCustomer:     (userId)      => apiClient.get(`/shop/marketing/credits/customer/${userId}`).then(r => r.data),
};

// ── Customer API ──────────────────────────────────────────────────────────────
export const myCreditsApi = {
  getAll: () => apiClient.get("/users/shop-credits").then(r => r.data),
};
