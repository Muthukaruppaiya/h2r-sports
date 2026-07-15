const BASE_URL = 'http://localhost:5000/api';

function getHeaders() {
  const token = localStorage.getItem('h2r_token');
  return {
    'Content-Type': 'application/json',
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
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`POST ${endpoint} failed`);
    return { data: await res.json() };
  },
  
  async put(endpoint, data) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`PUT ${endpoint} failed`);
    return { data: await res.json() };
  }
};

export default client;
