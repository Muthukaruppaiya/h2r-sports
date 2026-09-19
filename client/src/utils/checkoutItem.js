const KEY = 'h2r_cart';
const LEGACY = 'h2r_buy_now';

function lineKey(item) {
  return `${item.id}:${item.sizeId}:${item.weightId || 'na'}`;
}

function normalize(item) {
  if (!item?.id) return null;
  const sizeId = item.sizeId || 'default';
  const next = {
    ...item,
    id: String(item.id),
    sizeId: String(sizeId),
    sizeLabel: item.sizeLabel || '',
    weightId: item.weightId || '',
    weightLabel: item.weightLabel || '',
    qty: Math.max(1, Number(item.qty) || 1),
    price: Number(item.price) || 0,
    compareAt: item.compareAt ? Number(item.compareAt) : null,
    image: item.image || '',
    name: item.name || '',
  };
  next.key = lineKey(next);
  return next;
}

function emitCart() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('h2r-cart'));
  }
}

function readLegacy() {
  try {
    const raw = sessionStorage.getItem(LEGACY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function getCart() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalize).filter(Boolean);
      }
    }
    const legacy = readLegacy();
    return legacy ? [legacy] : [];
  } catch {
    return [];
  }
}

export function setCart(items) {
  const next = (items || []).map(normalize).filter(Boolean);
  sessionStorage.setItem(KEY, JSON.stringify(next));
  sessionStorage.removeItem(LEGACY);
  emitCart();
  return next;
}

/** Replaces checkout with this one product (no shopping bag). */
export function setBuyNowItem(item) {
  const incoming = normalize(item);
  if (!incoming) return getCart();
  return setCart([incoming]);
}

export function addCartItem(item) {
  return setBuyNowItem(item);
}

export function updateCartQty(key, qty) {
  const nextQty = Math.max(1, Number(qty) || 1);
  return setCart(getCart().map((row) => (row.key === key ? { ...row, qty: nextQty } : row)));
}

export function removeCartItem(key) {
  return setCart(getCart().filter((row) => row.key !== key));
}

export function cartCount(items = getCart()) {
  return items.reduce((n, row) => n + (Number(row.qty) || 0), 0);
}

export function getBuyNowItem() {
  return getCart()[0] || null;
}

export function clearBuyNowItem() {
  setCart([]);
}
