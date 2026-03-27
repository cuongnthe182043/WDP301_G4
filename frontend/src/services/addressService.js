// src/services/addressService.js
import apiClient from "./apiClient";

const normalizeToArray = (d) => {
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.addresses)) return d.addresses;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

export const addressService = {
  list: () => apiClient.get("/addresses").then(r => normalizeToArray(r?.data?.data)),
  create: (payload) => apiClient.post("/addresses", payload).then(r => r.data.data),
  update: (id, payload) => apiClient.put(`/addresses/${id}`, payload).then(r => r.data.data),
  remove: (id) => apiClient.delete(`/addresses/${id}`).then(r => r.data),
  setDefault: (id) => apiClient.patch(`/addresses/${id}/default`).then(r => r.data.data),
};

export default addressService;

// GHN location data (for address form — accessible to all logged-in users)
export const ghnGetProvinces = () =>
  apiClient.get("/addresses/ghn/provinces").then(r => r.data.data || []);

export const ghnGetDistricts = (provinceId) =>
  apiClient.get("/addresses/ghn/districts", { params: { province_id: provinceId } }).then(r => r.data.data || []);

export const ghnGetWards = (districtId) =>
  apiClient.get("/addresses/ghn/wards", { params: { district_id: districtId } }).then(r => r.data.data || []);
