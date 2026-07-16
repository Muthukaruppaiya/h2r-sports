import { API_BASE_URL } from '../config/api.js';

const BASE_URL = API_BASE_URL;

function getHeaders(isFormData = false) {
  const token = localStorage.getItem('h2r_token');
  return {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

const client = {
  async get(endpoint) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`GET ${endpoint} failed`);
    return { data: await res.json() };
  },
  
  async post(endpoint, data) {
    const isFormData = data instanceof FormData;
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(isFormData),
      body: isFormData ? data : JSON.stringify(data)
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.error || `POST ${endpoint} failed`);
      err.response = { data: body, status: res.status };
      throw err;
    }
    return { data: body };
  },
  
  async put(endpoint, data) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.error || `PUT ${endpoint} failed`);
      err.response = { data: body, status: res.status };
      throw err;
    }
    return { data: body };
  },

  async delete(endpoint) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.error || `DELETE ${endpoint} failed`);
      err.response = { data: body, status: res.status };
      throw err;
    }
    return { data: body };
  }
};

export default client;
