import apiClient from "./apiClient";

export const reviewService = {
  submit: (payload) => apiClient.post("/reviews", payload).then(r => r.data.data),
  getMyReviews: () => apiClient.get("/reviews/my").then(r => r.data.data),
  getByOrder: (orderId) => apiClient.get(`/reviews/order/${orderId}`).then(r => r.data.data),
  update: (id, payload) => apiClient.put(`/reviews/${id}`, payload).then(r => r.data.data),
  delete: (id) => apiClient.delete(`/reviews/${id}`).then(r => r.data.data),
  addThreadReply: (id, text) => apiClient.post(`/reviews/${id}/thread`, { text }).then(r => r.data.data),

  /** Upload review images via multer → Cloudinary. Returns [{ url, public_id }] */
  uploadImages: (files) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("images", f));
    return apiClient
      .post("/reviews/upload-images", fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data.data.images);
  },
};
