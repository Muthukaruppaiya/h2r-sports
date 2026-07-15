import { COLLECTIONS, PRODUCTS, REVIEWS, STORE_INFO } from '../data/catalogue';

const ORDERS_KEY = 'h2r_orders';

function delay(value) {
  return Promise.resolve(value);
}

function filterProducts({ collection, category, q, topSelling, mostLoved } = {}) {
  let items = [...PRODUCTS];
  if (collection) items = items.filter((p) => p.collection === collection);
  if (category && category !== 'All') items = items.filter((p) => p.category === category);
  if (topSelling === true || topSelling === 'true') items = items.filter((p) => p.topSelling);
  if (mostLoved === true || mostLoved === 'true') items = items.filter((p) => p.mostLoved);
  if (q) {
    const term = String(q).toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.tagline.toLowerCase().includes(term) ||
        p.willow.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
    );
  }
  return items;
}

function readOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function makeOrderId() {
  const n = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `H2R-${n}-${r}`;
}

export const api = {
  getStoreInfo() {
    return delay(STORE_INFO);
  },

  getCollections() {
    return delay({
      collections: COLLECTIONS.map((c) => ({
        ...c,
        count: PRODUCTS.filter((p) => p.collection === c.id).length,
      })),
    });
  },

  getCollection(slug) {
    const collection = COLLECTIONS.find((c) => c.slug === slug);
    if (!collection) return Promise.reject(new Error('Collection not found'));
    const products = filterProducts({ collection: collection.id });
    return delay({ collection, total: products.length, currency: 'INR', products });
  },

  getProducts(query = {}) {
    const products = filterProducts(query);
    return delay({ total: products.length, currency: 'INR', products });
  },

  getProduct(id) {
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product) return Promise.reject(new Error('Product not found'));
    return delay({ ...product, currency: 'INR' });
  },

  getReviews() {
    return delay({ reviews: REVIEWS });
  },

  createOrder(payload) {
    const { customer, shipping, items, paymentMethod, paymentMeta } = payload || {};

    if (!customer?.name || !customer?.phone || !customer?.email) {
      return Promise.reject(new Error('Name, phone and email are required'));
    }
    if (!shipping?.addressLine1 || !shipping?.city || !shipping?.state || !shipping?.pincode) {
      return Promise.reject(new Error('Complete shipping address is required'));
    }
    if (!/^[6-9]\d{9}$/.test(String(customer.phone).replace(/\s/g, ''))) {
      return Promise.reject(new Error('Enter a valid 10-digit Indian mobile number'));
    }
    if (!/^\d{6}$/.test(String(shipping.pincode))) {
      return Promise.reject(new Error('Enter a valid 6-digit PIN code'));
    }
    if (!Array.isArray(items) || items.length === 0) {
      return Promise.reject(new Error('Cart is empty'));
    }

    const allowedPay = ['cod', 'upi', 'card'];
    if (!allowedPay.includes(paymentMethod)) {
      return Promise.reject(new Error('Invalid payment method'));
    }
    if (paymentMethod === 'upi' && !paymentMeta?.upiId) {
      return Promise.reject(new Error('UPI ID is required'));
    }
    if (paymentMethod === 'card' && (!paymentMeta?.cardName || !paymentMeta?.cardLast4)) {
      return Promise.reject(new Error('Card details are required'));
    }

    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const product = PRODUCTS.find((p) => p.id === item.id);
      if (!product) return Promise.reject(new Error(`Unknown product: ${item.id}`));
      const size = product.sizes.find((s) => s.id === item.sizeId) || product.sizes[0];
      const qty = Math.max(1, Number(item.qty) || 1);
      const lineTotal = size.price * qty;
      subtotal += lineTotal;
      lineItems.push({
        id: product.id,
        name: product.name,
        sizeId: size.id,
        sizeLabel: size.label,
        price: size.price,
        qty,
        lineTotal,
      });
    }

    const order = {
      id: makeOrderId(),
      createdAt: new Date().toISOString(),
      status: paymentMethod === 'cod' ? 'confirmed' : 'paid',
      paymentStatus: paymentMethod === 'cod' ? 'pending_cod' : 'paid',
      paymentMethod,
      paymentMeta:
        paymentMethod === 'upi'
          ? { upiId: paymentMeta.upiId }
          : paymentMethod === 'card'
            ? {
                cardName: paymentMeta.cardName,
                cardLast4: String(paymentMeta.cardLast4).slice(-4),
              }
            : { note: 'Cash on delivery' },
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
      items: lineItems,
      currency: 'INR',
      subtotal,
      shippingFee: 0,
      total: subtotal,
    };

    const orders = readOrders();
    orders.unshift(order);
    writeOrders(orders);
    return delay({ ok: true, order });
  },

  getOrder(id) {
    const order = readOrders().find((o) => o.id === id);
    if (!order) return Promise.reject(new Error('Order not found'));
    return delay(order);
  },
};
