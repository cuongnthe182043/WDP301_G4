import apiClient from "./apiClient";

// ─── Public ───────────────────────────────────────────────────────────────────

export const getShopBySlug = async (slug) => {
  const res = await apiClient.get(`/vendor/shops/slug/${slug}`);
  return res.data.data;
};

export const getShopProducts = async (slug, params = {}) => {
  const res = await apiClient.get(`/vendor/shops/slug/${slug}/products`, { params });
  return res.data.data;
};

// ─── Shop Owner ───────────────────────────────────────────────────────────────

export const registerShop = async (payload) => {
  const res = await apiClient.post("/users/registershop", payload);
  return res.data;
};

export const getMyShop = async () => {
  const res = await apiClient.get("/vendor/shops/my");
  return res.data.data;
};

export const updateMyShop = async (payload) => {
  const res = await apiClient.put("/vendor/shops/my", payload);
  return res.data.data;
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminListShops = async (params = {}) => {
  const res = await apiClient.get("/vendor/shops/admin/list", { params });
  return res.data.data;
};

export const adminGetShopStats = async (id) => {
  const res = await apiClient.get(`/vendor/shops/admin/${id}/stats`);
  return res.data.data;
};

export const adminApproveShop = async (id) => {
  const res = await apiClient.patch(`/vendor/shops/admin/${id}/approve`);
  return res.data;
};

export const adminSuspendShop = async (id, reason = "") => {
  const res = await apiClient.patch(`/vendor/shops/admin/${id}/suspend`, { reason });
  return res.data;
};

export const adminRejectShop = async (id, reason = "") => {
  const res = await apiClient.patch(`/vendor/shops/admin/${id}/reject`, { reason });
  return res.data;
};

// ─── GHN Pickup Address ───────────────────────────────────────────────────────

export const getPickupAddress = async () => {
  const res = await apiClient.get("/shop/pickup-address");
  return res.data.data;
};

export const updatePickupAddress = async (payload) => {
  const res = await apiClient.put("/shop/pickup-address", payload);
  return res.data.data;
};

export const ghnGetProvinces = async () => {
  const res = await apiClient.get("/shop/ghn/provinces");
  return res.data.data;
};

export const ghnGetDistricts = async (provinceId) => {
  const res = await apiClient.get("/shop/ghn/districts", { params: { province_id: provinceId } });
  return res.data.data;
};

export const ghnGetWards = async (districtId) => {
  const res = await apiClient.get("/shop/ghn/wards", { params: { district_id: districtId } });
  return res.data.data;
};

// ─── Legacy (analytics) ───────────────────────────────────────────────────────

export const getAnalytics = async () => {
  const res = await apiClient.get("/shop/analytics");
  return res.data;
};

export const getRevenueByMonth = async () => {
  const res = await apiClient.get("/transactions/revenue-by-month");
  return res.data.data;
};

export const getRevenueByCategory = async () => {
  const res = await apiClient.get("/orders/revenue-by-category");
  return res.data.data;
};
