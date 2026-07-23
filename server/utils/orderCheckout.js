import Product from '../models/Product.js';

export async function buildLineItemsFromRequest(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('No items to order'), { status: 400 });
  }

  let subtotal = 0;
  const lineItems = [];

  for (const item of items) {
    const product = await Product.findOne({ id: item.id }).lean();
    if (!product) {
      throw Object.assign(new Error(`Unknown product: ${item.id}`), { status: 400 });
    }
    const size = product.sizes.find((s) => s.id === item.sizeId) || product.sizes[0];
    if (!size) {
      throw Object.assign(new Error(`No size available for ${product.name}`), { status: 400 });
    }
    const weights = Array.isArray(product.weights) ? product.weights : [];
    const weight = weights.find((w) => w.id === item.weightId) || weights[0] || null;
    const weightLabel = weight
      ? weight.label || `${weight.from}g – ${weight.to}g`
      : product.weight || '';
    const qty = Math.max(1, Number(item.qty) || 1);
    const lineTotal = size.price * qty;
    subtotal += lineTotal;
    lineItems.push({
      id: product.id,
      name: product.name,
      sizeId: size.id,
      sizeLabel: size.label,
      weightId: weight?.id || '',
      weightLabel,
      price: size.price,
      qty,
      lineTotal,
    });
  }

  const shippingFee = 0;
  const total = subtotal + shippingFee;
  return { lineItems, subtotal, shippingFee, total };
}

export function validateCheckoutPayload({ customer, shipping }) {
  if (!customer?.name || !customer?.phone || !customer?.email) {
    throw Object.assign(new Error('Name, phone and email are required'), { status: 400 });
  }
  if (!shipping?.addressLine1 || !shipping?.city || !shipping?.state || !shipping?.pincode) {
    throw Object.assign(new Error('Complete shipping address is required'), { status: 400 });
  }
  if (!/^[6-9]\d{9}$/.test(String(customer.phone).replace(/\s/g, ''))) {
    throw Object.assign(new Error('Enter a valid 10-digit Indian mobile number'), { status: 400 });
  }
  if (!/^\d{6}$/.test(String(shipping.pincode))) {
    throw Object.assign(new Error('Enter a valid 6-digit PIN code'), { status: 400 });
  }

  return {
    customer: {
      name: customer.name.trim(),
      phone: String(customer.phone).replace(/\s/g, ''),
      email: customer.email.trim().toLowerCase(),
    },
    shipping: {
      addressLine1: shipping.addressLine1.trim(),
      addressLine2: (shipping.addressLine2 || '').trim(),
      city: shipping.city.trim(),
      state: shipping.state,
      pincode: String(shipping.pincode),
    },
  };
}
