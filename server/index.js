import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const FRAMES_DIR = path.join(ROOT, 'FRAMES');
const CLIENT_DIST = path.join(ROOT, 'client', 'dist');
const PORT = process.env.PORT || 5000;
const PRODUCTS_IMG_DIR = path.join(ROOT, 'client', 'public', 'products');
const PLACEHOLDER_IMGS = [
  '/products/placeholders/front.svg',
  '/products/placeholders/side.svg',
  '/products/placeholders/scoop.svg',
  '/products/placeholders/face.svg',
  '/products/placeholders/handle.svg',
];

function getProductImages(productId) {
  const dir = path.join(PRODUCTS_IMG_DIR, productId);
  if (fs.existsSync(dir)) {
    const files = fs
      .readdirSync(dir)
      .filter((file) => /\.(jpe?g|png|webp|svg|gif)$/i.test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (files.length) {
      return files.map((file) => `/products/${productId}/${file}`);
    }
  }
  return [...PLACEHOLDER_IMGS];
}

function withImages(product) {
  const images = Array.isArray(product.images) && product.images.length
    ? product.images
    : getProductImages(product.id);
  return {
    ...product,
    images,
    image: images[0],
  };
}

const COLLECTIONS = [
  {
    id: 'hard-tennis',
    name: 'Hard Tennis Bats',
    slug: 'hard-tennis',
    blurb: 'Unleash your power on the ground — engineered for red/heavy tennis ball cricket across India.',
  },
  {
    id: 'soft-tennis',
    name: 'Soft Tennis Bats',
    slug: 'soft-tennis',
    blurb: 'Precision soft tennis edition — control every shot with light pickup and a wide sweet spot.',
  },
  {
    id: 'season',
    name: 'Season Bats',
    slug: 'season',
    blurb: 'Kashmir & English willow leather-ball bats — optimal weight and balance for match cricket.',
  },
];

/** H2R Sports catalogue — Tamil Nadu cricket bats (@h2r_sports_) */
const PRODUCTS = [
  {
    id: 'thala-hard',
    name: 'Thala Edition Hard Tennis Bat',
    tagline: 'Most loved hard tennis',
    price: 2799,
    compareAt: 3499,
    collection: 'hard-tennis',
    category: 'Hard Tennis',
    badge: 'Sale',
    weight: '850–950 g',
    willow: 'Kashmir Willow',
    madeIn: 'Tamil Nadu, India',
    topSelling: true,
    mostLoved: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 2799 },
      { id: 'lh', label: 'Long Handle (LH)', price: 2899 },
    ],
    description:
      'Hard tennis power bat with aggressive profile — bestseller balance for gully and club tennis-ball cricket.',
    features: ['All India free shipping', 'COD available', '6 months bat warranty', 'Free cover on prepaid*'],
    inStock: true,
  },
  {
    id: 'rhino-advance',
    name: 'Rhino Advance Hard Tennis Bat',
    tagline: 'Bottom punch specialist',
    price: 3499,
    compareAt: 5500,
    collection: 'hard-tennis',
    category: 'Hard Tennis',
    badge: 'Sale',
    weight: '880–980 g',
    willow: 'Kashmir Willow',
    madeIn: 'Tamil Nadu, India',
    topSelling: true,
    mostLoved: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 3499 },
      { id: 'lh', label: 'Long Handle (LH)', price: 3599 },
    ],
    description:
      'Advance scoop profile with serious sweet-spot punch — a customer favourite for hard tennis ball.',
    features: ['All India free shipping', 'COD available', '6 months bat warranty', 'Pre-oiled & pressed'],
    inStock: true,
  },
  {
    id: 'viper-hard',
    name: 'Viper Edition Hard Tennis Bat',
    tagline: 'Premium hard tennis',
    price: 5999,
    compareAt: 7000,
    collection: 'hard-tennis',
    category: 'Hard Tennis',
    badge: 'Sale',
    weight: '900–1000 g',
    willow: 'Top Grade Kashmir Willow',
    madeIn: 'Tamil Nadu, India',
    topSelling: true,
    mostLoved: false,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 5999 },
      { id: 'lh', label: 'Long Handle (LH)', price: 6199 },
    ],
    description:
      'Premium hard tennis edition with elite finish and pick-up for power hitters.',
    features: ['Free engraving on prepaid*', '6 months warranty', 'COD available', 'Pan-India delivery'],
    inStock: true,
  },
  {
    id: 'wolverine-hard',
    name: 'Wolverine Hard Tennis Bat',
    tagline: 'Value hard tennis',
    price: 2299,
    compareAt: 2500,
    collection: 'hard-tennis',
    category: 'Hard Tennis',
    badge: 'Sale',
    weight: '850–940 g',
    willow: 'Kashmir Willow',
    madeIn: 'Tamil Nadu, India',
    topSelling: false,
    mostLoved: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 2299 },
      { id: 'lh', label: 'Long Handle (LH)', price: 2399 },
    ],
    description: 'Sharp pickup hard tennis bat — everyday net and match companion.',
    features: ['COD available', 'All India shipping', '6 months warranty'],
    inStock: true,
  },
  {
    id: 'wolverine-gold',
    name: 'Wolverine Hard Tennis Bat Gold Edition',
    tagline: 'Gold finish edition',
    price: 2799,
    compareAt: 3299,
    collection: 'hard-tennis',
    category: 'Hard Tennis',
    badge: 'Sale',
    weight: '860–950 g',
    willow: 'Kashmir Willow',
    madeIn: 'Tamil Nadu, India',
    topSelling: false,
    mostLoved: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 2799 },
      { id: 'lh', label: 'Long Handle (LH)', price: 2899 },
    ],
    description: 'Gold edition styling with Wolverine balance and punch.',
    features: ['COD available', 'Free cover on prepaid*', '6 months warranty'],
    inStock: true,
  },
  {
    id: 'ghost-hard',
    name: 'Ghost Edition Hard Tennis Bat',
    tagline: 'Scary for bowlers',
    price: 4499,
    compareAt: 5499,
    collection: 'hard-tennis',
    category: 'Hard Tennis',
    badge: 'Sale',
    weight: '870–970 g',
    willow: 'Kashmir Willow',
    madeIn: 'Tamil Nadu, India',
    topSelling: false,
    mostLoved: false,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 4499 },
      { id: 'lh', label: 'Long Handle (LH)', price: 4599 },
    ],
    description: 'Aggressive hard tennis profile built for big hitting.',
    features: ['6 months warranty', 'COD available', 'Pan-India delivery'],
    inStock: true,
  },
  {
    id: 'ghost-soft',
    name: 'Ghost Edition Soft Tennis Bat',
    tagline: 'Soft tennis control',
    price: 3299,
    compareAt: 3999,
    collection: 'soft-tennis',
    category: 'Soft Tennis',
    badge: 'Sale',
    weight: '820–920 g',
    willow: 'Kashmir Willow',
    madeIn: 'Tamil Nadu, India',
    topSelling: false,
    mostLoved: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 3299 },
      { id: 'lh', label: 'Long Handle (LH)', price: 3399 },
    ],
    description: 'Soft tennis edition tuned for timing and soft-ball bounce.',
    features: ['COD available', '6 months warranty', 'All India shipping'],
    inStock: true,
  },
  {
    id: 'thala-rhino-soft',
    name: 'Thala & Rhino Soft Tennis Bat',
    tagline: 'Dual-edition soft tennis',
    price: 2999,
    compareAt: 3799,
    collection: 'soft-tennis',
    category: 'Soft Tennis',
    badge: 'Sale',
    weight: '830–930 g',
    willow: 'Kashmir Willow',
    madeIn: 'Tamil Nadu, India',
    topSelling: false,
    mostLoved: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 2999 },
      { id: 'lh', label: 'Long Handle (LH)', price: 3099 },
    ],
    description: 'Precision soft tennis bat — light hands, clean middle.',
    features: ['Free gloves offer*', 'COD available', '6 months warranty'],
    inStock: true,
  },
  {
    id: 'players-english',
    name: "Player's Edition English Willow Bat",
    tagline: 'Season English willow',
    price: 4499,
    compareAt: 5500,
    collection: 'season',
    category: 'Season',
    badge: 'Sale',
    weight: '1140–1200 g',
    willow: 'English Willow',
    madeIn: 'Tamil Nadu, India',
    topSelling: true,
    mostLoved: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 4499 },
      { id: 'lh', label: 'Long Handle (LH)', price: 4699 },
      { id: 'full', label: 'Full Size (Adult)', price: 4499 },
    ],
    description:
      'Match-ready English willow season bat — pressed, oiled, and sized for Indian leather-ball cricket.',
    features: ['All India free shipping', '6 months warranty', 'COD available', 'GST included'],
    inStock: true,
  },
  {
    id: 'beast-english',
    name: 'English Willow Bat — Beast Edition',
    tagline: 'Elite season bat',
    price: 9500,
    compareAt: 14999,
    collection: 'season',
    category: 'Season',
    badge: 'Sale',
    weight: '1160–1220 g',
    willow: 'Grade English Willow',
    madeIn: 'Tamil Nadu, India',
    topSelling: false,
    mostLoved: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 9500 },
      { id: 'lh', label: 'Long Handle (LH)', price: 9800 },
    ],
    description: 'Beast profile English willow for serious season cricket.',
    features: ['Free engraving on prepaid*', '6 months warranty', 'Pan-India delivery'],
    inStock: true,
  },
  {
    id: 'kashmir-players',
    name: "Kashmir Willow Player's Edition",
    tagline: 'Season Kashmir willow',
    price: 3499,
    compareAt: 4000,
    collection: 'season',
    category: 'Season',
    badge: 'Sale',
    weight: '1100–1180 g',
    willow: 'Kashmir Willow',
    madeIn: 'Tamil Nadu, India',
    topSelling: false,
    mostLoved: true,
    sizes: [
      { id: 'sh', label: 'Short Handle (SH)', price: 3499 },
      { id: 'lh', label: 'Long Handle (LH)', price: 3599 },
      { id: 'size-6', label: 'Size 6', price: 3299 },
    ],
    description: 'Top-grade Kashmir willow player edition for leather-ball season cricket.',
    features: ['COD available', '6 months warranty', 'GST included'],
    inStock: true,
  },
  {
    id: 'kids-season',
    name: 'Kids Season Bat (Top Grade Kashmir Willow)',
    tagline: 'Junior season bat',
    price: 2499,
    compareAt: 3200,
    collection: 'season',
    category: 'Season',
    badge: 'Sale',
    weight: '900–1050 g',
    willow: 'Top Grade Kashmir Willow',
    madeIn: 'Tamil Nadu, India',
    topSelling: false,
    mostLoved: true,
    sizes: [
      { id: 'size-4', label: 'Size 4', price: 2299 },
      { id: 'size-5', label: 'Size 5', price: 2399 },
      { id: 'size-6', label: 'Size 6', price: 2499 },
      { id: 'harrow', label: 'Harrow', price: 2699 },
    ],
    description: 'Junior season bat sized for school and academy leather-ball cricket.',
    features: ['COD available', 'School kit ready', '6 months warranty'],
    inStock: true,
  },
];

const REVIEWS = [
  { id: 1, name: 'Balvant Jogi', text: 'Bat is so good and perfect balancing. Thank you!' },
  { id: 2, name: 'Jayesh Nawab', text: 'Best quality and perfect delivery time. Thank you so much bhai.' },
  { id: 3, name: 'Meetrajsinh Jadeja', text: 'Superb bat quality & super service by H2R Sports. Thank you!' },
  { id: 4, name: 'Akshit Shetty', text: 'Amazing bats… balance and weight distribution are excellent.' },
  { id: 5, name: 'Ashutosh Jha', text: 'Ordered from Delhi NCR. Huge difference vs local market bats.' },
  { id: 6, name: 'Sandeep Sandy', text: 'Great punch and good finishing — value for money.' },
  { id: 7, name: 'Priyanshu Barik', text: 'Craftsmanship stands out — perfect balance and premium finish.' },
  { id: 8, name: 'Anu', text: 'Excellent customer service and a very trustable brand.' },
  { id: 9, name: 'Ganesh Borkar', text: 'Smashed 5 sixes with it today. Absolutely loved it!' },
  { id: 10, name: 'Vasu Naik', text: 'Super quality bat and packaging. Will order again.' },
  { id: 11, name: 'Syed Khaled', text: 'Awesome bat, super quality and service. Love H2R Sports.' },
  { id: 12, name: 'Karan More', text: 'Rhino style punch is excellent. Highly recommended.' },
];

const app = express();
app.use(cors());
app.use(express.json());

function listFrames() {
  if (!fs.existsSync(FRAMES_DIR)) return [];
  return fs
    .readdirSync(FRAMES_DIR)
    .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file, index) => ({
      index,
      filename: file,
      url: `/frames/${file}`,
    }));
}

function filterProducts({ collection, category, q, topSelling, mostLoved }) {
  let items = [...PRODUCTS];
  if (collection) items = items.filter((p) => p.collection === collection);
  if (category && category !== 'All') items = items.filter((p) => p.category === category);
  if (topSelling === 'true') items = items.filter((p) => p.topSelling);
  if (mostLoved === 'true') items = items.filter((p) => p.mostLoved);
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'h2r-sports-api', region: 'IN', currency: 'INR' });
});

app.get('/api/frames', (_req, res) => {
  const frames = listFrames();
  res.json({ total: frames.length, frames });
});

app.get('/api/store-info', (_req, res) => {
  res.json({
    brand: 'H2R Sports',
    tagline: 'Tamil Nadu Cricket Bats',
    instagram: 'https://www.instagram.com/h2r_sports_/',
    instagramHandle: '@h2r_sports_',
    country: 'India',
    currency: 'INR',
    gstInclusive: true,
    freeShippingIndia: true,
    supportPhone: '+91 98765 43210',
    supportEmail: 'orders@h2rsports.in',
    address: 'Tamil Nadu, India',
    payments: ['UPI', 'Cards', 'NetBanking', 'COD'],
    benefits: [
      'All India Free Shipping',
      'Free premium cover & gloves worth ₹650*',
      'Free engraving on prepaid orders',
      '6 months full bat warranty',
      'COD available',
    ],
  });
});

const ORDERS_FILE = path.join(__dirname, 'orders.json');

function readOrders() {
  try {
    if (!fs.existsSync(ORDERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

function makeOrderId() {
  const n = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `H2R-${n}-${r}`;
}

app.post('/api/orders', (req, res) => {
  const { customer, shipping, items, paymentMethod, paymentMeta } = req.body || {};

  if (!customer?.name || !customer?.phone || !customer?.email) {
    return res.status(400).json({ error: 'Name, phone and email are required' });
  }
  if (!shipping?.addressLine1 || !shipping?.city || !shipping?.state || !shipping?.pincode) {
    return res.status(400).json({ error: 'Complete shipping address is required' });
  }
  if (!/^[6-9]\d{9}$/.test(String(customer.phone).replace(/\s/g, ''))) {
    return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' });
  }
  if (!/^\d{6}$/.test(String(shipping.pincode))) {
    return res.status(400).json({ error: 'Enter a valid 6-digit PIN code' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const allowedPay = ['cod', 'upi', 'card'];
  if (!allowedPay.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Invalid payment method' });
  }

  if (paymentMethod === 'upi' && !paymentMeta?.upiId) {
    return res.status(400).json({ error: 'UPI ID is required' });
  }
  if (paymentMethod === 'card') {
    if (!paymentMeta?.cardName || !paymentMeta?.cardLast4) {
      return res.status(400).json({ error: 'Card details are required' });
    }
  }

  let subtotal = 0;
  const lineItems = [];

  for (const item of items) {
    const product = PRODUCTS.find((p) => p.id === item.id);
    if (!product) {
      return res.status(400).json({ error: `Unknown product: ${item.id}` });
    }
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

  const shippingFee = 0;
  const total = subtotal + shippingFee;

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
          ? { cardName: paymentMeta.cardName, cardLast4: String(paymentMeta.cardLast4).slice(-4) }
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
    shippingFee,
    total,
  };

  try {
    const orders = readOrders();
    orders.unshift(order);
    writeOrders(orders);
    res.status(201).json({ ok: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not place order' });
  }
});

app.get('/api/orders/:id', (req, res) => {
  const order = readOrders().find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

app.get('/api/collections', (_req, res) => {
  res.json({
    collections: COLLECTIONS.map((c) => ({
      ...c,
      count: PRODUCTS.filter((p) => p.collection === c.id).length,
    })),
  });
});

app.get('/api/collections/:slug', (req, res) => {
  const col = COLLECTIONS.find((c) => c.slug === req.params.slug);
  if (!col) return res.status(404).json({ error: 'Collection not found' });
  const products = filterProducts({ collection: col.id }).map(withImages);
  res.json({ collection: col, total: products.length, currency: 'INR', products });
});

app.get('/api/products', (req, res) => {
  const products = filterProducts(req.query).map(withImages);
  res.json({ total: products.length, currency: 'INR', products });
});

app.get('/api/products/:id', (req, res) => {
  const product = PRODUCTS.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ ...withImages(product), currency: 'INR' });
});

app.get('/api/reviews', (_req, res) => {
  res.json({ reviews: REVIEWS });
});

app.use('/frames', express.static(FRAMES_DIR, { maxAge: '1d', fallthrough: false }));

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/frames')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`H2R Sports store on http://localhost:${PORT}`);
  console.log(`Catalogue: ${PRODUCTS.length} bats · ${COLLECTIONS.length} collections`);
});
