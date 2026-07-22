const KEY = 'h2r_buy_now';

/** Single-item checkout payload (replaces cart). */
export function setBuyNowItem(item) {
  sessionStorage.setItem(KEY, JSON.stringify(item));
}

export function getBuyNowItem() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (!item?.id || !item?.sizeId) return null;
    return {
      ...item,
      qty: Math.max(1, Number(item.qty) || 1),
      price: Number(item.price) || 0,
      key: `${item.id}:${item.sizeId}`,
    };
  } catch {
    return null;
  }
}

export function clearBuyNowItem() {
  sessionStorage.removeItem(KEY);
}
