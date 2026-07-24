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

  async createRazorpayOrder(payload) {
    const res = await client.post('/payments/razorpay/create', payload);
    return res.data;
  },

  async verifyRazorpayPayment(payload) {
    const res = await client.post('/payments/razorpay/verify', payload);
    return res.data;
  },

  async phoneCheck(phone) {
    const res = await client.post('/auth/phone/check', { phone });
    return res.data;
  },

  async phoneContinue({ phone, name }) {
    const res = await client.post('/auth/phone/continue', { phone, name });
    return res.data;
  },

  async getAddresses() {
    const res = await client.get('/auth/addresses');
    return res.data;
  },

  async addAddress(payload) {
    const res = await client.post('/auth/addresses', payload);
    return res.data;
  },

  async deleteAddress(id) {
    const res = await client.delete(`/auth/addresses/${id}`);
    return res.data;
  },

  async getMe() {
    const res = await client.get('/auth/me');
    return res.data;
  },

  async getOrder(id) {
    const res = await client.get(`/orders/${id}`);
    return res.data;
  },
};
