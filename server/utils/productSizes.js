function slugPart(value, fallback) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

/** Duplicate ids like SIZE/SIZE make checkout pick the first size every time. */
export function uniquifySizes(sizes = []) {
  if (!Array.isArray(sizes)) return [];
  const seen = new Set();
  return sizes
    .map((s, index) => {
      const label = String(s?.label || '').trim() || String(s?.id || `Size ${index + 1}`);
      let id = String(s?.id || '').trim();
      const generic = !id || /^size$/i.test(id);
      if (generic || seen.has(id)) {
        id = `size-${slugPart(label, String(index + 1))}`;
      }
      let candidate = id;
      let n = 2;
      while (seen.has(candidate)) {
        candidate = `${id}-${n}`;
        n += 1;
      }
      seen.add(candidate);
      const stockRaw = s?.stock;
      const stockNum = Math.floor(Number(stockRaw));
      return {
        id: candidate,
        label,
        price: Number(s?.price) || 0,
        stock: Number.isFinite(stockNum) ? Math.max(0, stockNum) : 0,
      };
    })
    .filter((s) => s.label);
}

export function resolveProductSize(product, item = {}) {
  const sizes = uniquifySizes(product?.sizes || []);
  if (!sizes.length) return null;
  const sizeId = String(item.sizeId || '').trim();
  const sizeLabel = String(item.sizeLabel || '').trim();
  return (
    sizes.find((s) => s.id === sizeId) ||
    sizes.find((s) => s.label === sizeLabel) ||
    sizes.find((s) => s.label === sizeId) ||
    sizes[0]
  );
}

export function sizesNeedRewrite(original = [], next = []) {
  if (!Array.isArray(original) || original.length !== next.length) return true;
  return original.some(
    (s, i) =>
      String(s?.id) !== next[i].id ||
      String(s?.label) !== next[i].label ||
      s?.stock === undefined ||
      s?.stock === null
  );
}
