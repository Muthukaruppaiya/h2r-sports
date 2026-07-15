import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import Collection from './models/Collection.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import Review from './models/Review.js';
import User from './models/User.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';

// ─── Paths ────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT         = path.join(__dirname, '..');
const FRAMES_DIR   = path.join(ROOT, 'FRAMES');
const CLIENT_DIST  = path.join(ROOT, 'client', 'dist');
const PRODUCTS_IMG_DIR = path.join(ROOT, 'client', 'public', 'products');

const PORT      = process.env.PORT      || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/h2r-sports';
const JWT_SECRET = process.env.JWT_SECRET || 'h2r_sports_super_secret';



// ─── Image helpers ────────────────────────────────────────────────────────────
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
    if (files.length) return files.map((file) => `/products/${productId}/${file}`);
  }
  return [...PLACEHOLDER_IMGS];
}

function withImages(product) {
  const src = product.toObject ? product.toObject() : { ...product };
  const images =
    Array.isArray(src.images) && src.images.length
      ? src.images
      : getProductImages(src.id);
  return { ...src, images, image: images[0] };
}

// ─── Express app ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ─── Multer Config ───────────────────────────────────────────────────────────
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(PRODUCTS_IMG_DIR, 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  }
});
const upload = multer({ storage: uploadStorage });

// ─── Order ID generator ───────────────────────────────────────────────────────
function makeOrderId() {
  const n = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `H2R-${n}-${r}`;
}

// ─── Frames helper ────────────────────────────────────────────────────────────
function listFrames() {
  if (!fs.existsSync(FRAMES_DIR)) return [];
  return fs
    .readdirSync(FRAMES_DIR)
    .filter((file) => /\.(jpe?g|png|webp)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file, index) => ({ index, filename: file, url: `/frames/${file}` }));
}

// ════════════════════════════════════════════════════════════════════════════
//  Routes
// ════════════════════════════════════════════════════════════════════════════

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) return res.status(401).json({ error: 'Not authorized, user not found' });
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ error: 'Not authorized as an admin' });
  }
};

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'User already exists' });
    const user = await User.create({ name, email, password });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, token });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', protect, (req, res) => {
  res.json({ _id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone, role: req.user.role });
});

app.put('/api/auth/profile', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    // Update user profile
    req.user.name = name || req.user.name;
    req.user.phone = phone !== undefined ? phone : req.user.phone;
    const updatedUser = await req.user.save();

    // Also update their details in past orders to keep the admin view synchronized
    await Order.updateMany(
      { 'customer.email': updatedUser.email },
      { $set: { 'customer.name': updatedUser.name, 'customer.phone': updatedUser.phone } }
    );

    res.json({ _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone, role: updatedUser.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health
app.get('/api/health', (_req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    ok: true,
    service: 'h2r-sports-api',
    region: 'IN',
    currency: 'INR',
    db: dbState[mongoose.connection.readyState] ?? 'unknown',
  });
});

// Frames
app.get('/api/frames', (_req, res) => {
  const frames = listFrames();
  res.json({ total: frames.length, frames });
});

// Store info
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

// ─── Collections ──────────────────────────────────────────────────────────────
app.get('/api/collections', async (_req, res) => {
  try {
    const collections = await Collection.find().lean();
    const withCounts = await Promise.all(
      collections.map(async (col) => ({
        ...col,
        count: await Product.countDocuments({ collection: col.id }),
      }))
    );
    res.json({ collections: withCounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/collections/:slug', async (req, res) => {
  try {
    const col = await Collection.findOne({ slug: req.params.slug }).lean();
    if (!col) return res.status(404).json({ error: 'Collection not found' });
    const products = (await Product.find({ collection: col.id }).lean()).map(withImages);
    res.json({ collection: col, total: products.length, currency: 'INR', products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Products ─────────────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { collection, category, q, topSelling, mostLoved } = req.query;
    const filter = {};
    if (collection)              filter.collection = collection;
    if (category && category !== 'All') filter.category = category;
    if (topSelling === 'true')   filter.topSelling = true;
    if (mostLoved  === 'true')   filter.mostLoved  = true;
    if (q) {
      const term = new RegExp(String(q), 'i');
      filter.$or = [
        { name: term }, { tagline: term }, { willow: term }, { category: term },
      ];
    }
    const products = (await Product.find(filter).lean()).map(withImages);
    res.json({ total: products.length, currency: 'INR', products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id }).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ ...withImages(product), currency: 'INR' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Reviews ──────────────────────────────────────────────────────────────────
app.get('/api/reviews', async (_req, res) => {
  try {
    const reviews = await Review.find().lean();
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Orders ───────────────────────────────────────────────────────────────────
app.post('/api/orders', async (req, res) => {
  const { customer, shipping, items, paymentMethod, paymentMeta } = req.body || {};

  // Validation
  if (!customer?.name || !customer?.phone || !customer?.email)
    return res.status(400).json({ error: 'Name, phone and email are required' });
  if (!shipping?.addressLine1 || !shipping?.city || !shipping?.state || !shipping?.pincode)
    return res.status(400).json({ error: 'Complete shipping address is required' });
  if (!/^[6-9]\d{9}$/.test(String(customer.phone).replace(/\s/g, '')))
    return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' });
  if (!/^\d{6}$/.test(String(shipping.pincode)))
    return res.status(400).json({ error: 'Enter a valid 6-digit PIN code' });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Cart is empty' });
  if (!['cod', 'upi', 'card'].includes(paymentMethod))
    return res.status(400).json({ error: 'Invalid payment method' });
  if (paymentMethod === 'upi' && !paymentMeta?.upiId)
    return res.status(400).json({ error: 'UPI ID is required' });
  if (paymentMethod === 'card' && (!paymentMeta?.cardName || !paymentMeta?.cardLast4))
    return res.status(400).json({ error: 'Card details are required' });

  try {
    // Resolve products from DB
    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const product = await Product.findOne({ id: item.id }).lean();
      if (!product) return res.status(400).json({ error: `Unknown product: ${item.id}` });
      const size = product.sizes.find((s) => s.id === item.sizeId) || product.sizes[0];
      const qty  = Math.max(1, Number(item.qty) || 1);
      const lineTotal = size.price * qty;
      subtotal += lineTotal;
      lineItems.push({
        id: product.id, name: product.name,
        sizeId: size.id, sizeLabel: size.label,
        price: size.price, qty, lineTotal,
      });
    }

    const shippingFee = 0;
    const total = subtotal + shippingFee;

    const order = await Order.create({
      orderId: makeOrderId(),
      status:        paymentMethod === 'cod' ? 'confirmed' : 'paid',
      paymentStatus: paymentMethod === 'cod' ? 'pending_cod' : 'paid',
      paymentMethod,
      paymentMeta:
        paymentMethod === 'upi'
          ? { upiId: paymentMeta.upiId }
          : paymentMethod === 'card'
            ? { cardName: paymentMeta.cardName, cardLast4: String(paymentMeta.cardLast4).slice(-4) }
            : { note: 'Cash on delivery' },
      customer: {
        name:  customer.name.trim(),
        phone: String(customer.phone).replace(/\s/g, ''),
        email: customer.email.trim().toLowerCase(),
      },
      shipping: {
        addressLine1: shipping.addressLine1.trim(),
        addressLine2: (shipping.addressLine2 || '').trim(),
        city:    shipping.city.trim(),
        state:   shipping.state,
        pincode: String(shipping.pincode),
      },
      items: lineItems,
      currency: 'INR',
      subtotal, shippingFee, total,
    });

    res.status(201).json({ ok: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Could not place order' });
  }
});

app.get('/api/orders/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ 'customer.email': req.user.email }).sort({ createdAt: -1 }).lean();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id }).lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin APIs ────────────────────────────────────────────────────────────────
app.get('/api/admin/orders', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/orders/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      { status },
      { new: true }
    ).lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ ok: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', protect, admin, async (req, res) => {
  try {
    const updates = req.body;
    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { new: true }
    ).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/products', protect, admin, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ ok: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/upload', protect, admin, upload.array('images', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const urls = req.files.map(file => `/products/uploads/${file.filename}`);
    res.json({ ok: true, urls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ id: req.params.id });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/customers', protect, admin, async (req, res) => {
  try {
    const orders = await Order.find().lean();
    const customersMap = {};
    
    orders.forEach(order => {
      const email = order.customer.email;
      if (!customersMap[email]) {
        customersMap[email] = {
          name: order.customer.name,
          email: email,
          phone: order.customer.phone,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: order.createdAt
        };
      }
      customersMap[email].totalOrders += 1;
      customersMap[email].totalSpent += order.total;
      if (new Date(order.createdAt) > new Date(customersMap[email].lastOrderDate)) {
        customersMap[email].lastOrderDate = order.createdAt;
      }
    });

    const customers = Object.values(customersMap).sort((a, b) => b.totalSpent - a.totalSpent);
    res.json({ customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/customers/:email', protect, admin, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const email = req.params.email;
    
    // Update the User if exists
    await User.findOneAndUpdate({ email: email }, { name, phone });
    
    // Update orders to reflect the new customer details
    await Order.updateMany(
      { 'customer.email': email },
      { $set: { 'customer.name': name, 'customer.phone': phone } }
    );
    
    res.json({ ok: true, message: 'Customer updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Static assets ────────────────────────────────────────────────────────────
app.use('/frames', express.static(FRAMES_DIR, { maxAge: '1d', fallthrough: false }));

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/frames')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✓ MongoDB connected → ${MONGO_URI}`);

    const adminExists = await User.findOne({ email: 'admin@h2rsports.in' });
    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: 'admin@h2rsports.in',
        password: 'admin123',
        role: 'admin'
      });
      console.log('✓ Default Admin created (admin@h2rsports.in / admin123)');
    }

    app.listen(PORT, () => {
      console.log(`✓ H2R Sports API  → http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('✗ Failed to connect to MongoDB:', err.message);
    console.error('  Make sure MongoDB is running and MONGO_URI in .env is correct.');
    process.exit(1);
  }
}

start();
