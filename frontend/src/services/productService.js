import apiClient from "./apiClient";

const withNoCache = (params = {}) => ({ ...params, _t: Date.now() });

export const productApi = {
  getByTag:    (tag)    => apiClient.get(`/products/tag/${tag}`, { params: withNoCache() }),
  getNew:      ()       => apiClient.get("/products/new",         { params: withNoCache() }),
  getByCategory: (slug) => apiClient.get(`/products/category/${slug}`, { params: withNoCache() }),
  // Main filtered listing — maps to GET /api/products?...
  getAll: (params = {}) => apiClient.get("/products", { params: withNoCache(params) }).then((r) => r.data.data),
};

export const productService = {
  async getDetail(idOrSlug) {
    const res = await apiClient.get(`/products/${idOrSlug}`, { params: withNoCache() });
    return res.data.data;
  },
  async getReviews(idOrSlug, page = 1, limit = 10, star) {
    const params = withNoCache({ page, limit });
    if (star !== undefined && star !== null) params.star = star;
    const res = await apiClient.get(`/products/${idOrSlug}/reviews`, { params });
    return res.data.data;
  },
  async getRatingsSummary(idOrSlug) {
    const res = await apiClient.get(`/products/${idOrSlug}/ratings-summary`, { params: withNoCache() });
    return res.data.data;
  },
  async getRelated(idOrSlug, limit = 12) {
    const res = await apiClient.get(`/products/${idOrSlug}/related`, { params: withNoCache({ limit }) });
    return res.data.data;
  },

  async getAllProducts() {
    const res = await apiClient.get("/products/all-products", { params: withNoCache() });
    return res.data.data;
  },
  async searchProducts(query) {
    const res = await apiClient.get(`/products/search`, { params: withNoCache({ q: query }) });
    return res.data.data;
  },
  async updateProduct(id, updateData) {
    const res = await apiClient.patch(`/products/${id}`, updateData);
    return res.data.data;
  },
  async deleteProduct(id) {
    const res = await apiClient.delete(`/products/${id}`);
    return res.data.data;
  },
  async sizeMatch(id, measurements) {
    const res = await apiClient.post(`/products/${id}/size-match`, measurements);
    return res.data.data;
  },
};
