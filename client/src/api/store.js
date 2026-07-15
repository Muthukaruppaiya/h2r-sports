import client from './client';

export const api = {
  async getStoreInfo() {
    const res = await client.get('/store-info');
    return res.data;
  },

  async getCollections() {
    const res = await client.get('/collections');
    return res.data;
  },

  async getCollection(slug) {
    const res = await client.get(`/collections/${slug}`);
    return res.data;
  },

  async getProducts(query = {}) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) params.append(k, v);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await client.get(`/products${qs}`);
    return res.data;
  },

  async getProduct(id) {
    const res = await client.get(`/products/${id}`);
    return res.data;
  },

  async getReviews() {
    const res = await client.get('/reviews');
    return res.data;
  },

  async createOrder(payload) {
    const res = await client.post('/orders', payload);
    return res.data;
  },

  async getOrder(id) {
    const res = await client.get(`/orders/${id}`);
    return res.data;
  },
};
