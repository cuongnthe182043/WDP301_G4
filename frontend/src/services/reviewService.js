import apiClient from "./apiClient";

export const reviewService = {
  submit: (payload) => apiClient.post("/reviews", payload).then(r => r.data.data),
  getMyReviews: () => apiClient.get("/reviews/my").then(r => r.data.data),
};
