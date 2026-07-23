const LOCAL_ORIGIN = 'http://localhost:5000';
const PRODUCTION_ORIGIN = 'https://h2r-sports.onrender.com';

/**
 * API host resolution:
 * 1) VITE_API_URL (Netlify build env / .env.production) — preferred
 * 2) Production builds (`npm run build` / Netlify) → Render
 * 3) Local `npm run dev` → localhost
 */
function resolveApiOrigin() {
  if (import.meta.env.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  if (import.meta.env.PROD) return PRODUCTION_ORIGIN;
  return LOCAL_ORIGIN;
}

export const API_ORIGIN = resolveApiOrigin();

export const API_BASE_URL = `${API_ORIGIN}/api`;

export function apiUrl(path = '') {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${suffix}`;
}

/** Resolve product/media URLs for Netlify ↔ Render split hosting */
export function mediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  // Already a full URL — rewrite mistaken Netlify /api/media links to current API
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const u = new URL(url);
      if (
        u.pathname.startsWith('/api/media/') ||
        u.pathname.startsWith('/marketing/')
      ) {
        return `${API_ORIGIN}${u.pathname}`;
      }
    } catch {
      /* ignore */
    }
    return url;
  }

  const path = url.startsWith('/') ? url : `/${url}`;
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
