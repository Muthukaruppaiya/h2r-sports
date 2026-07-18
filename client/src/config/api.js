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

/** Resolve product/media URLs for Netlify ↔ Render split hosting */
export function mediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const path = url.startsWith('/') ? url : `/${url}`;
  // Uploads & marketing live on the API host (Render). Local public assets stay same-origin.
  if (
    path.startsWith('/products/uploads/') ||
    path.startsWith('/api/media/') ||
    path.startsWith('/marketing/') ||
    path.startsWith('/frames/')
  ) {
    return `${API_ORIGIN}${path}`;
  }
  return path;
}
