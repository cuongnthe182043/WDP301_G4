import apiClient from "./apiClient";

export const sizeChartService = {
  list:    (params = {}) => apiClient.get("/size-charts",       { params }).then((r) => r.data),
  getOne:  (id)          => apiClient.get(`/size-charts/${id}`).then((r) => r.data),
  create:  (data)        => apiClient.post("/size-charts",       data).then((r) => r.data),
  update:  (id, data)    => apiClient.put(`/size-charts/${id}`,  data).then((r) => r.data),
  remove:  (id)          => apiClient.delete(`/size-charts/${id}`).then((r) => r.data),
};
