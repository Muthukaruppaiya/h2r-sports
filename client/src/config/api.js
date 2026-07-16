const LOCAL_ORIGIN = 'http://localhost:5000';
const PRODUCTION_ORIGIN = 'https://h2r-sports.onrender.com';

/** Local dev → localhost; production build → Render (unless VITE_API_URL is set) */
const DEFAULT_ORIGIN = import.meta.env.DEV ? LOCAL_ORIGIN : PRODUCTION_ORIGIN;

export const API_ORIGIN = (
  import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '')
    : DEFAULT_ORIGIN
).replace(/\/$/, '');

export const API_BASE_URL = `${API_ORIGIN}/api`;

export function apiUrl(path = '') {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${suffix}`;
}

/** Static assets on Netlify vs uploads served from the API (Render) */
export function mediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  if (path.startsWith('/marketing/') || path.startsWith('/products/uploads/')) {
    return `${API_ORIGIN}${path}`;
  }
  return path;
}
