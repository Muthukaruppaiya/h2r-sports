const STORAGE_KEY = 'h2r_cookie_prefs';

export const DEFAULT_PREFS = {
  essential: true, // always on — required for checkout/login to function
  analytics: false,
  marketing: false,
};

export function getCookiePrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw) return null;
    return { ...DEFAULT_PREFS, ...raw, essential: true };
  } catch {
    return null;
  }
}

export function hasDecidedCookiePrefs() {
  return getCookiePrefs() !== null;
}

export function saveCookiePrefs(prefs) {
  const value = { ...DEFAULT_PREFS, ...prefs, essential: true, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('h2r:cookie-prefs-changed', { detail: value }));
  return value;
}

export function acceptAllCookies() {
  return saveCookiePrefs({ essential: true, analytics: true, marketing: true });
}

export function rejectOptionalCookies() {
  return saveCookiePrefs({ essential: true, analytics: false, marketing: false });
}
