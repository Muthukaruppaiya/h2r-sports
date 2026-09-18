import Product from '../models/Product.js';

export function parseStock(value, fallback = 0) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, n);
}

export function sizeStock(size) {
  if (size?.stock === undefined || size?.stock === null || size?.stock === '') return 0;
  return parseStock(size.stock, 0);
}

function saleItems(items = []) {
  return (Array.isArray(items) ? items : [items])
    .map((item) => ({
      id: String(item?.id || item?.productId || '').trim(),
      sizeId: String(item?.sizeId || '').trim(),
      sizeLabel: String(item?.sizeLabel || '').trim(),
      name: item?.name || item?.itemName || '',
      qty: Math.max(1, parseStock(item?.qty, 1) || 1),
    }))
    .filter((item) => item.id);
}

async function resolveSizeId(productId, sizeId, sizeLabel) {
  if (sizeId) return sizeId;
  const product = await Product.findOne({ id: productId }).lean();
  const sizes = product?.sizes || [];
  const match =
    sizes.find((s) => s.label === sizeLabel) ||
    sizes[0];
  return match?.id ? String(match.id) : '';
}

export async function syncProductInStock(productId) {
  const product = await Product.findOne({ id: productId });
  if (!product) return;
  const sizes = product.sizes || [];
  if (!sizes.length) return;
  const available = sizes.some((s) => sizeStock(s) > 0);
  if (product.inStock !== available) {
    product.inStock = available;
    await product.save();
  }
}

export async function decrementStock(items = []) {
  const applied = [];
  try {
    for (const item of saleItems(items)) {
      const sizeId = await resolveSizeId(item.id, item.sizeId, item.sizeLabel);
      if (!sizeId) {
        throw Object.assign(new Error(`No size to deduct stock for ${item.name || item.id}`), {
          status: 409,
        });
      }
      const result = await Product.updateOne(
        { id: item.id, sizes: { $elemMatch: { id: sizeId, stock: { $gte: item.qty } } } },
        { $inc: { 'sizes.$.stock': -item.qty } }
      );
      if (result.modifiedCount !== 1) {
        throw Object.assign(
          new Error(`Not enough stock for ${item.name || item.id}${item.sizeLabel ? ` (${item.sizeLabel})` : ''}`),
          { status: 409 }
        );
      }
      applied.push({ id: item.id, sizeId, qty: item.qty });
    }
  } catch (err) {
    for (const row of applied.reverse()) {
      await Product.updateOne(
        { id: row.id, 'sizes.id': row.sizeId },
        { $inc: { 'sizes.$.stock': row.qty } }
      );
    }
    throw err;
  }
  const ids = [...new Set(applied.map((row) => row.id))];
  for (const id of ids) await syncProductInStock(id);
}

export async function restoreStock(items = []) {
  const ids = new Set();
  for (const item of saleItems(items)) {
    const sizeId = await resolveSizeId(item.id, item.sizeId, item.sizeLabel);
    if (!sizeId) continue;
    await Product.updateOne(
      { id: item.id, 'sizes.id': sizeId },
      { $inc: { 'sizes.$.stock': item.qty } }
    );
    ids.add(item.id);
  }
  for (const id of ids) await syncProductInStock(id);
}

export function billStockItems(bill) {
  const lines =
    Array.isArray(bill?.items) && bill.items.length
      ? bill.items
      : bill?.productId
        ? [bill]
        : [];
  return lines
    .filter((line) => line?.productId || line?.id)
    .map((line) => ({
      id: line.productId || line.id,
      sizeId: line.sizeId,
      sizeLabel: line.sizeLabel,
      name: line.itemName || line.name,
      qty: line.qty,
    }));
}
