import apiClient from "./apiClient";

const BASE = "/admin/moderate";

const moderationService = {
  // Dashboard
  getDashboard: () =>
    apiClient.get(`${BASE}/dashboard`).then(r => r.data.data),

  // Users
  listUsers: (params) =>
    apiClient.get(`${BASE}/users`, { params }).then(r => r.data.data),

  getUserDetail: (id) =>
    apiClient.get(`${BASE}/users/${id}`).then(r => r.data.data),

  banUser: (id, data) =>
    apiClient.post(`${BASE}/users/${id}/ban`, data).then(r => r.data),

  unbanUser: (id) =>
    apiClient.post(`${BASE}/users/${id}/unban`).then(r => r.data),

  warnUser: (id, data) =>
    apiClient.post(`${BASE}/users/${id}/warn`, data).then(r => r.data),

  // Violations
  listViolations: (params) =>
    apiClient.get(`${BASE}/violations`, { params }).then(r => r.data.data),

  reviewViolation: (id, data) =>
    apiClient.patch(`${BASE}/violations/${id}`, data).then(r => r.data),

  // Reports
  listReports: (params) =>
    apiClient.get(`${BASE}/reports`, { params }).then(r => r.data.data),

  resolveReport: (id, data) =>
    apiClient.patch(`${BASE}/reports/${id}`, data).then(r => r.data),

  // Appeals
  listAppeals: (params) =>
    apiClient.get(`${BASE}/appeals`, { params }).then(r => r.data.data),

  reviewAppeal: (id, data) =>
    apiClient.patch(`${BASE}/appeals/${id}`, data).then(r => r.data),

  // Manual detection trigger
  runDetection: () =>
    apiClient.post(`${BASE}/run-detection`).then(r => r.data),

  // User-facing: report, appeal, ban status
  submitReport: (data) =>
    apiClient.post("/reports", data).then(r => r.data),

  submitAppeal: (data) =>
    apiClient.post("/reports/appeal", data).then(r => r.data),

  getBanStatus: () =>
    apiClient.get("/reports/ban-status").then(r => r.data.data),
};

export default moderationService;
