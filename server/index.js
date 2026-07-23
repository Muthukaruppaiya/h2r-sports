import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

import Collection from './models/Collection.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import Review from './models/Review.js';
import User from './models/User.js';
import MarketingSettings from './models/MarketingSettings.js';
import Media from './models/Media.js';
import StoreBill from './models/StoreBill.js';
import { buildStatusUpdate, isValidStatus } from './utils/orderStatus.js';
import { parseInstagramUrl } from './utils/instagram.js';
import { buildLineItemsFromRequest, validateCheckoutPayload } from './utils/orderCheckout.js';
import {
  getRazorpayClient,
  getRazorpayKeyId,
  isRazorpayConfigured,
  mapRazorpayMethod,
  rupeesToPaise,
  verifyRazorpaySignature,
} from './utils/razorpay.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';

// ─── Paths ────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT         = path.join(__dirname, '..');
const FRAMES_DIR   = path.join(ROOT, 'FRAMES');
const CLIENT_DIST  = path.join(ROOT, 'client', 'dist');
const PRODUCTS_IMG_DIR = path.join(ROOT, 'client', 'public', 'products');
const LEGACY_MARKETING_DIR = path.join(ROOT, 'client', 'public', 'marketing');
/** Legacy disk uploads (kept as fallback for old URLs only) */
const MARKETING_DIR = path.join(__dirname, 'uploads', 'marketing');
const MARKETING_VIDEOS_DIR = path.join(MARKETING_DIR, 'videos');
const MARKETING_STATUS_DIR = path.join(MARKETING_DIR, 'statuses');
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const PORT      = process.env.PORT      || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/h2r-sports';
const JWT_SECRET = process.env.JWT_SECRET || 'h2r_sports_super_secret';

/** GridFS bucket for marketing videos (survives Render disk wipes) */
let marketingBucket = null;

function getMarketingBucket() {
  if (!marketingBucket) {
    if (!mongoose.connection?.db) {
      throw new Error('MongoDB is not connected yet');
    }
    marketingBucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'marketing',
    });
  }
  return marketingBucket;
}

function publicApiOrigin(req) {
  return (
    process.env.PUBLIC_API_URL ||
    `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`
  ).replace(/\/$/, '');
}

function storeBufferInGridFS(buffer, { filename, contentType }) {
  return new Promise((resolve, reject) => {
    const bucket = getMarketingBucket();
    const uploadStream = bucket.openUploadStream(filename || 'upload.bin', {
      contentType: contentType || 'application/octet-stream',
      metadata: { kind: 'marketing' },
    });
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve({
        id: String(uploadStream.id),
        url: `/api/media/${uploadStream.id}`,
      });
    });
    uploadStream.end(buffer);
  });
}// ─── Image helpers ────────────────────────────────────────────────────────────
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
    // Prefer real photos over SVG placeholders when both exist
    const rasters = files.filter((file) => /\.(jpe?g|png|webp|gif)$/i.test(file));
    const use = rasters.length ? rasters : files;
    if (use.length) return use.map((file) => `/products/${productId}/${file}`);
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

function sanitizeProductInput(body, { isCreate = false } = {}) {
  const allowed = [
    'id', 'name', 'tagline', 'price', 'compareAt', 'collection', 'category', 'badge',
    'weight', 'willow', 'madeIn', 'topSelling', 'mostLoved', 'inStock', 'sizes', 'weights',
    'features', 'images', 'description',
  ];
  const out = {};
  for (const key of allowed) {
    if (body[key] === undefined) continue;
    out[key] = body[key];
  }
  if (out.price !== undefined) out.price = Number(out.price);
  if (out.compareAt === '' || out.compareAt === null || out.compareAt === undefined) {
    out.compareAt = null;
  } else if (out.compareAt !== undefined) {
    out.compareAt = Number(out.compareAt);
  }
  if (out.inStock !== undefined) out.inStock = Boolean(out.inStock);
  if (Array.isArray(out.sizes)) {
    out.sizes = out.sizes
      .map((s) => ({
        id: String(s.id || '').trim(),
        label: String(s.label || '').trim(),
        price: Number(s.price) || out.price || 0,
      }))
      .filter((s) => s.id && s.label);
  }
  if (Array.isArray(out.weights)) {
    out.weights = out.weights
      .map((w) => {
        const from = String(w.from ?? '').replace(/[^\d.]/g, '').trim();
        const to = String(w.to ?? '').replace(/[^\d.]/g, '').trim();
        if (!from || !to) return null;
        const label =
          String(w.label || '').trim() || `${from}g – ${to}g`;
        const id = String(w.id || '').trim() || `${from}-${to}`;
        return { id, from, to, label };
      })
      .filter(Boolean);
  }
  if (Array.isArray(out.images)) {
    out.images = out.images.map((img) => String(img).trim()).filter(Boolean);
  }
  if (isCreate && !out.id) throw new Error('Product id is required');
  if (isCreate && (!out.name || !out.collection || !out.category || !out.price)) {
    throw new Error('Name, collection, category, and price are required');
  }
  return out;
}

// ─── Express app ─────────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// ─── Multer Config ───────────────────────────────────────────────────────────
// Product images + marketing media go to MongoDB (survives Render restarts).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

function isAllowedVideoFile(file) {
  const name = String(file?.originalname || '');
  const type = String(file?.mimetype || '').toLowerCase();
  if (type.startsWith('video/')) return true;
  // Browsers / phones sometimes send octet-stream for .mov/.mp4
  if (/\.(mp4|webm|mov|m4v|avi|mkv|qt)$/i.test(name)) return true;
  return false;
}

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter: (_req, file, cb) => {
    if (isAllowedVideoFile(file)) return cb(null, true);
    cb(new Error('Only video files are allowed (mp4, webm, mov).'));
  },
});

function isAllowedStatusMedia(file) {
  const name = String(file?.originalname || '');
  const type = String(file?.mimetype || '').toLowerCase();
  if (type.startsWith('image/') || type.startsWith('video/')) return true;
  if (/\.(jpe?g|png|webp|gif|mp4|webm|mov|m4v)$/i.test(name)) return true;
  return false;
}

const statusMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter: (_req, file, cb) => {
    if (isAllowedStatusMedia(file)) return cb(null, true);
    cb(new Error('Only photo or video files are allowed.'));
  },
});

function detectMediaType(file) {
  if (!file) return null;
  const name = String(file.originalname || '');
  const type = String(file.mimetype || '').toLowerCase();
  if (type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(name)) return 'image';
  if (type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(name)) return 'video';
  return null;
}

function guessVideoContentType(file) {
  const type = String(file?.mimetype || '').toLowerCase();
  if (type.startsWith('video/')) return type;
  const name = String(file?.originalname || '').toLowerCase();
  if (name.endsWith('.webm')) return 'video/webm';
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.m4v')) return 'video/x-m4v';
  return 'video/mp4';
}

function uploadErrorMessage(err, fallback) {
  if (!err) return fallback;
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return `File is too large. Max ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB. Compress the video and try again.`;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return 'Unexpected upload field. Please try again.';
    }
    return err.message || fallback;
  }
  return err.message || fallback;
}

function clampDurationDays(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(7, Math.max(1, Math.round(n)));
}

function computeExpiresAt(publishedAt, durationDays) {
  const start = new Date(publishedAt || Date.now());
  const end = new Date(start);
  end.setDate(end.getDate() + clampDurationDays(durationDays));
  return end;
}

function isStatusLive(status, now = new Date()) {
  if (!status || status.active === false) return false;
  if (!status.mediaUrl) return false;
  const expiresAt = status.expiresAt ? new Date(status.expiresAt) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt > now;
}

// ─── Order ID generator ───────────────────────────────────────────────────────
function makeOrderId() {
  const n = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `H2R-${n}-${r}`;
}

function toYmd(date) {
  return date.toISOString().slice(0, 10);
}

function safePercent(part, total) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(1));
}

function formatFloatingVideo(entry) {
  const videoUrl = String(entry.videoUrl || '').trim();
  if (!videoUrl) return null;
  const parsed = entry.instagramUrl ? parseInstagramUrl(entry.instagramUrl) : null;
  return {
    id: entry.id,
    title: entry.title,
    videoUrl,
    instagramUrl: parsed?.permalink || entry.instagramUrl || '',
    productPath: entry.productPath || '/shop',
    productName: entry.productName || 'Shop now',
    active: entry.active !== false,
    sortOrder: entry.sortOrder || 0,
  };
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
    const { name, email, password, phone } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'User already exists' });
    const user = await User.create({ name, email, password, phone });
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
    supportPhone: '+91 93618 13878',
    supportEmail: 'orders@h2rsports.in',
    address: 'Tamil Nadu, India',
    payments: ['UPI', 'Cards', 'NetBanking'],
    whatsapp: '919361813878',
    whatsappLink: 'https://wa.me/919361813878',
    benefits: [
      'All India Free Shipping',
      'Free premium cover',
      '6 months handle warranty',
      'UPI & Cards accepted',
    ],
  });
});

// ─── Collections ──────────────────────────────────────────────────────────────
app.get('/api/collections', async (_req, res) => {
  try {
    const collections = await Collection.find().sort({ sortOrder: 1, featured: -1 }).lean();
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
    const reviews = (await Review.find().sort({ createdAt: -1 }).lean()).map((r) => ({
      ...r,
      id: r.id || String(r._id),
    }));
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Orders / Razorpay ─────────────────────────────────────────────────────────
function publicOrder(orderDoc) {
  const order = orderDoc?.toObject ? orderDoc.toObject() : orderDoc;
  if (!order) return null;
  return {
    ...order,
    id: order.orderId,
  };
}

app.post('/api/payments/razorpay/create', async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        error: 'Razorpay is not configured on the server. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      });
    }

    const { customer, shipping, items } = req.body || {};
    const validated = validateCheckoutPayload({ customer, shipping });
    const { lineItems, subtotal, shippingFee, total } = await buildLineItemsFromRequest(items);

    if (total < 1) {
      return res.status(400).json({ error: 'Order total must be at least ₹1' });
    }

    const orderId = makeOrderId();
    const amountPaise = rupeesToPaise(total);
    const razorpay = getRazorpayClient();
    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: orderId.slice(0, 40),
      notes: {
        h2rOrderId: orderId,
        customerName: validated.customer.name,
      },
    });

    const now = new Date();
    const order = await Order.create({
      orderId,
      status: 'ordered',
      paymentStatus: 'pending',
      paymentMethod: 'razorpay',
      razorpayOrderId: rzpOrder.id,
      paymentMeta: {
        gateway: 'razorpay',
        razorpayOrderId: rzpOrder.id,
      },
      statusTimestamps: { orderedAt: now },
      statusHistory: [{
        to: 'ordered',
        changedAt: now,
        changedBy: 'System',
        note: 'Order created — awaiting Razorpay payment',
      }],
      customer: validated.customer,
      shipping: validated.shipping,
      items: lineItems,
      currency: 'INR',
      subtotal,
      shippingFee,
      total,
    });

    res.status(201).json({
      ok: true,
      keyId: getRazorpayKeyId(),
      amount: amountPaise,
      currency: 'INR',
      orderId: order.orderId,
      razorpayOrderId: rzpOrder.id,
      order: publicOrder(order),
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('Razorpay create error:', err);
    res.status(status).json({ error: err.message || 'Could not start payment' });
  }
});

app.post('/api/payments/razorpay/verify', async (req, res) => {
  try {
    const {
      orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body || {};

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.razorpayOrderId && order.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({ error: 'Razorpay order mismatch' });
    }

    if (order.paymentStatus === 'paid') {
      return res.json({ ok: true, order: publicOrder(order) });
    }

    const valid = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
    if (!valid) {
      order.paymentStatus = 'failed';
      order.paymentMeta = {
        ...(order.paymentMeta || {}),
        lastError: 'Invalid payment signature',
      };
      await order.save();
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    let method = 'razorpay';
    let paymentDetails = {};
    try {
      const payment = await getRazorpayClient().payments.fetch(razorpayPaymentId);
      method = mapRazorpayMethod(payment.method);
      paymentDetails = {
        method: payment.method,
        bank: payment.bank || '',
        wallet: payment.wallet || '',
        vpa: payment.vpa || '',
        cardLast4: payment.card?.last4 || '',
        cardNetwork: payment.card?.network || '',
        email: payment.email || '',
        contact: payment.contact || '',
      };
    } catch (fetchErr) {
      console.warn('Razorpay payment fetch skipped:', fetchErr.message);
    }

    const now = new Date();
    order.paymentStatus = 'paid';
    order.paymentMethod = method;
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpayOrderId = razorpayOrderId;
    order.paymentMeta = {
      ...(order.paymentMeta || {}),
      gateway: 'razorpay',
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      ...paymentDetails,
      paidAt: now.toISOString(),
    };
    order.statusTimestamps = {
      ...(order.statusTimestamps || {}),
      orderedAt: order.statusTimestamps?.orderedAt || now,
      paidAt: now,
      confirmedAt: now,
    };
    order.statusHistory.push({
      from: order.status,
      to: order.status,
      changedAt: now,
      changedBy: 'System',
      note: `Payment verified via Razorpay (${razorpayPaymentId})`,
    });
    await order.save();

    res.json({ ok: true, order: publicOrder(order) });
  } catch (err) {
    console.error('Razorpay verify error:', err);
    res.status(500).json({ error: err.message || 'Payment verification failed' });
  }
});

/** Legacy demo checkout — disabled. Use Razorpay create/verify. */
app.post('/api/orders', async (_req, res) => {
  res.status(410).json({
    error: 'Demo checkout retired. Pay with Razorpay via /api/payments/razorpay/create',
  });
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
    res.json(publicOrder(order));
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
    const { status, note, courier } = req.body;
    if (!isValidStatus(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    const currentOrder = await Order.findOne({ orderId: req.params.id });
    if (!currentOrder) return res.status(404).json({ error: 'Order not found' });

    const result = buildStatusUpdate(
      currentOrder.toObject(),
      status,
      req.user?.name || 'Admin',
      courier
    );
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    const { updates, historyEntry } = result;
    if (note) historyEntry.note = note;

    currentOrder.status = updates.status;
    currentOrder.statusTimestamps = updates.statusTimestamps;
    if (updates.paymentStatus) currentOrder.paymentStatus = updates.paymentStatus;
    if (updates.courier) currentOrder.courier = updates.courier;
    currentOrder.statusHistory.push(historyEntry);
    await currentOrder.save();

    res.json({ ok: true, order: currentOrder.toObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/marketing/public', async (_req, res) => {
  try {
    let settings = await MarketingSettings.findOne({ key: 'default' }).lean();
    if (!settings) {
      settings = await MarketingSettings.create({
        key: 'default',
        floatingVideos: [],
        whatsappStatuses: [],
      });
      settings = settings.toObject();
    }

    const now = new Date();
    const floatingVideos = (settings.floatingVideos || [])
      .filter((v) => v.active !== false)
      .map(formatFloatingVideo)
      .filter(Boolean)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const whatsappStatuses = (settings.whatsappStatuses || [])
      .filter((s) => isStatusLive(s, now))
      .map((s) => ({
        id: s.id,
        title: s.title || s.text || 'Update',
        text: s.text || '',
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        durationDays: s.durationDays || 1,
        publishedAt: s.publishedAt,
        expiresAt: s.expiresAt,
        ctaText: s.ctaText || 'Message us',
        prefillMessage: s.prefillMessage || '',
        sortOrder: s.sortOrder || 0,
      }))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    res.json({ floatingVideos, whatsappStatuses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/marketing', protect, admin, async (_req, res) => {
  try {
    let settings = await MarketingSettings.findOne({ key: 'default' });
    if (!settings) {
      settings = await MarketingSettings.create({ key: 'default' });
    }
    const payload = settings.toObject();
    const now = new Date();
    payload.whatsappStatuses = (payload.whatsappStatuses || []).map((s) => ({
      ...s,
      isExpired: !isStatusLive(s, now),
      hoursLeft: s.expiresAt
        ? Math.max(0, Math.round((new Date(s.expiresAt) - now) / 36e5))
        : 0,
    }));
    res.json({ settings: payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/marketing/upload-video', protect, admin, (req, res) => {
  videoUpload.single('video')(req, res, async (err) => {
    if (err) {
      console.error('Video upload error:', err);
      return res.status(400).json({ error: uploadErrorMessage(err, 'Video upload failed') });
    }
    try {
      if (!req.file?.buffer) return res.status(400).json({ error: 'No video file selected' });
      const stored = await storeBufferInGridFS(req.file.buffer, {
        filename: req.file.originalname || `video-${Date.now()}.mp4`,
        contentType: guessVideoContentType(req.file),
      });
      // Relative URL so local + Render both resolve via mediaUrl()
      res.json({ ok: true, url: stored.url });
    } catch (e) {
      console.error('Video GridFS store error:', e);
      res.status(500).json({ error: e.message || 'Video upload failed' });
    }
  });
});

app.post('/api/admin/marketing/upload-status-media', protect, admin, (req, res) => {
  statusMediaUpload.single('media')(req, res, async (err) => {
    if (err) {
      console.error('Status media upload error:', err);
      return res.status(400).json({ error: uploadErrorMessage(err, 'Status media upload failed') });
    }
    try {
      if (!req.file?.buffer) return res.status(400).json({ error: 'No photo or video selected' });
      const mediaType = detectMediaType(req.file);
      if (!mediaType) return res.status(400).json({ error: 'Unsupported file type' });

      const contentType =
        mediaType === 'video'
          ? guessVideoContentType(req.file)
          : req.file.mimetype || 'image/jpeg';

      // Small status images can use Media collection; videos use GridFS
      if (mediaType === 'image' && req.file.buffer.length <= 8 * 1024 * 1024) {
        const doc = await Media.create({
          filename: req.file.originalname || 'status.jpg',
          contentType,
          size: req.file.buffer.length,
          data: req.file.buffer,
        });
        return res.json({
          ok: true,
          url: `/api/media/${doc._id}`,
          mediaType,
        });
      }

      const stored = await storeBufferInGridFS(req.file.buffer, {
        filename: req.file.originalname || `status-${Date.now()}`,
        contentType,
      });
      res.json({ ok: true, url: stored.url, mediaType });
    } catch (e) {
      console.error('Status media store error:', e);
      res.status(500).json({ error: e.message || 'Status media upload failed' });
    }
  });
});

app.put('/api/admin/marketing', protect, admin, async (req, res) => {
  try {
    const floatingVideos = Array.isArray(req.body.floatingVideos) ? req.body.floatingVideos : [];
    const whatsappStatuses = Array.isArray(req.body.whatsappStatuses) ? req.body.whatsappStatuses : [];

    const sanitizedVideos = [];
    for (const [idx, v] of floatingVideos.entries()) {
      const videoUrl = String(v.videoUrl || '').trim();
      const title = String(v.title || '').trim();
      if (!videoUrl && !title) continue;
      if (!videoUrl) {
        return res.status(400).json({
          error: `Upload a video file for "${title || `video ${idx + 1}`}" (required for autoplay).`,
        });
      }
      let instagramUrl = '';
      if (v.instagramUrl) {
        const parsed = parseInstagramUrl(v.instagramUrl);
        if (!parsed) {
          return res.status(400).json({
            error: `Invalid Instagram URL for "${title || `video ${idx + 1}`}".`,
          });
        }
        instagramUrl = parsed.permalink;
      }
      sanitizedVideos.push({
        id: v.id || `video-${Date.now()}-${idx}`,
        title: title || 'Marketing Video',
        videoUrl,
        instagramUrl,
        productPath: String(v.productPath || '/shop').trim(),
        productName: String(v.productName || 'Shop now').trim(),
        productId: String(v.productId || '').trim(),
        active: v.active !== false,
        sortOrder: Number(v.sortOrder) || idx + 1,
      });
    }

    const existing = await MarketingSettings.findOne({ key: 'default' }).lean();
    const existingById = new Map((existing?.whatsappStatuses || []).map((s) => [s.id, s]));

    const sanitizedStatuses = [];
    for (const [idx, s] of whatsappStatuses.entries()) {
      const mediaUrl = String(s.mediaUrl || '').trim();
      const title = String(s.title || s.text || '').trim();
      if (!mediaUrl) continue; // skip legacy text-only / incomplete entries
      const mediaType = s.mediaType === 'video' ? 'video' : 'image';
      const durationDays = clampDurationDays(s.durationDays);
      const prev = existingById.get(s.id);
      const mediaChanged = !prev || prev.mediaUrl !== mediaUrl;
      const resetTimer = s.resetTimer === true || mediaChanged || !prev?.publishedAt;
      const publishedAt = resetTimer
        ? new Date()
        : new Date(s.publishedAt || prev?.publishedAt || Date.now());
      const expiresAt = computeExpiresAt(publishedAt, durationDays);

      sanitizedStatuses.push({
        id: s.id || `status-${Date.now()}-${idx}`,
        title: title || 'Status',
        text: String(s.text || title || '').trim(),
        mediaUrl,
        mediaType,
        durationDays,
        publishedAt,
        expiresAt,
        ctaText: String(s.ctaText || 'Message us').trim(),
        prefillMessage: String(s.prefillMessage || '').trim(),
        active: s.active !== false,
        sortOrder: Number(s.sortOrder) || idx + 1,
      });
    }

    const updated = await MarketingSettings.findOneAndUpdate(
      { key: 'default' },
      { floatingVideos: sanitizedVideos, whatsappStatuses: sanitizedStatuses },
      { new: true, upsert: true }
    ).lean();

    res.json({ ok: true, settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/reports/overview', protect, admin, async (req, res) => {
  try {
    const requestedDays = Number(req.query.days) || 30;
    const days = Math.min(Math.max(requestedDays, 7), 180);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const orders = await Order.find({ createdAt: { $gte: start, $lte: end } })
      .sort({ createdAt: 1 })
      .lean();

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const deliveredOrders = orders.filter((o) => (o.status === 'delivered')).length;
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled').length;
    const paidOrders = orders.filter((o) => o.paymentStatus === 'paid').length;
    const codOrders = orders.filter((o) => o.paymentMethod === 'cod').length;
    const prepaidOrders = orders.filter((o) => o.paymentMethod !== 'cod').length;
    const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;

    const normalizeOrderStatus = (status) =>
      status === 'confirmed' ? 'ordered' : status === 'paid' ? 'accepted' : status;

    const statusBreakdown = ['ordered', 'accepted', 'packed', 'shipped', 'delivered', 'cancelled'].map((status) => {
      const count = orders.filter((o) => normalizeOrderStatus(o.status) === status).length;
      return { status, count, pct: safePercent(count, totalOrders) };
    });

    const paymentBreakdown = ['upi', 'card', 'razorpay', 'cash', 'cod'].map((method) => {
      const count = orders.filter((o) => o.paymentMethod === method).length;
      return { method, count, revenue: orders.filter((o) => o.paymentMethod === method).reduce((s, o) => s + (o.total || 0), 0), pct: safePercent(count, totalOrders) };
    }).filter((p) => p.count > 0);

    const dailyMap = new Map();
    for (let i = 0; i < days; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dailyMap.set(toYmd(d), { date: toYmd(d), orders: 0, revenue: 0, delivered: 0, cancelled: 0 });
    }

    for (const order of orders) {
      const key = toYmd(new Date(order.createdAt));
      const bucket = dailyMap.get(key);
      if (!bucket) continue;
      bucket.orders += 1;
      bucket.revenue += order.total || 0;
      if (normalizeOrderStatus(order.status) === 'delivered') bucket.delivered += 1;
      if (normalizeOrderStatus(order.status) === 'cancelled') bucket.cancelled += 1;
    }

    const dailyTrend = Array.from(dailyMap.values());

    const productMap = new Map();
    for (const order of orders) {
      const seen = new Set();
      for (const item of order.items || []) {
        const current = productMap.get(item.id) || {
          id: item.id,
          name: item.name,
          units: 0,
          revenue: 0,
          orders: 0,
        };
        current.units += Number(item.qty) || 0;
        current.revenue += Number(item.lineTotal) || 0;
        if (!seen.has(item.id)) {
          current.orders += 1;
          seen.add(item.id);
        }
        productMap.set(item.id, current);
      }
    }
    const topProducts = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);

    const customerMap = new Map();
    for (const order of orders) {
      const email = order.customer?.email || 'unknown';
      const current = customerMap.get(email) || {
        email,
        name: order.customer?.name || 'Customer',
        phone: order.customer?.phone || '',
        orders: 0,
        spend: 0,
      };
      current.orders += 1;
      current.spend += order.total || 0;
      customerMap.set(email, current);
    }
    const topCustomers = Array.from(customerMap.values()).sort((a, b) => b.spend - a.spend);

    const drillOrders = orders.map((o) => ({
      orderId: o.orderId,
      createdAt: o.createdAt,
      date: toYmd(new Date(o.createdAt)),
      status: normalizeOrderStatus(o.status),
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      total: o.total || 0,
      customerName: o.customer?.name || '',
      customerEmail: o.customer?.email || '',
      customerPhone: o.customer?.phone || '',
      itemCount: (o.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
      items: (o.items || []).map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        sizeLabel: item.sizeLabel,
        weightLabel: item.weightLabel,
        lineTotal: item.lineTotal,
      })),
    })).reverse();

    res.json({
      range: { days, start, end },
      kpis: {
        totalOrders,
        totalRevenue,
        avgOrderValue,
        deliveredOrders,
        cancelledOrders,
        paidOrders,
        fulfillmentRate: safePercent(deliveredOrders, totalOrders),
        cancellationRate: safePercent(cancelledOrders, totalOrders),
        paymentSuccessRate: safePercent(paidOrders, totalOrders),
        codShare: safePercent(codOrders, totalOrders),
        prepaidShare: safePercent(prepaidOrders, totalOrders),
      },
      statusBreakdown,
      paymentBreakdown,
      dailyTrend,
      topProducts,
      topCustomers,
      drillOrders,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', protect, admin, async (req, res) => {
  try {
    const updates = sanitizeProductInput(req.body);
    delete updates.id;
    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true, product: withImages(product) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/products', protect, admin, async (req, res) => {
  try {
    const data = sanitizeProductInput(req.body, { isCreate: true });
    const exists = await Product.findOne({ id: data.id });
    if (exists) return res.status(400).json({ error: 'Product id already exists' });
    const product = await Product.create(data);
    res.status(201).json({ ok: true, product: withImages(product.toObject()) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/upload', protect, admin, (req, res) => {
  upload.array('images', 5)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: uploadErrorMessage(err, 'Image upload failed') });
    }
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      // Persist in MongoDB so images survive Render free-tier restarts
      const docs = await Media.insertMany(
        req.files.map((file) => ({
          filename: file.originalname || 'image',
          contentType: file.mimetype || 'image/jpeg',
          size: file.size || 0,
          data: file.buffer,
        }))
      );

      // Prefer absolute Render URLs so Netlify admin previews work immediately
      const publicOrigin = publicApiOrigin(req);
      const urls = docs.map((doc) => `${publicOrigin}/api/media/${doc._id}`);
      res.json({ ok: true, urls });
    } catch (e) {
      console.error('Image upload error:', e);
      res.status(500).json({ error: e.message || 'Image upload failed' });
    }
  });
});

/** Serve product images (Media) + marketing videos (GridFS) from MongoDB */
app.get('/api/media/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Media not found' });
    }
    const objectId = new mongoose.Types.ObjectId(req.params.id);

    // 1) Product / status images in Media collection
    const doc = await Media.findById(objectId).select('+data');
    if (doc?.data) {
      let buf = doc.data;
      if (!Buffer.isBuffer(buf)) {
        if (buf?.buffer) buf = Buffer.from(buf.buffer);
        else if (Array.isArray(buf)) buf = Buffer.from(buf);
        else buf = Buffer.from(buf);
      }

      res.status(200);
      res.setHeader('Content-Type', doc.contentType || 'image/jpeg');
      res.setHeader('Content-Length', String(buf.length));
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.end(buf);
    }

    // 2) Marketing videos / larger files in GridFS
    const bucket = getMarketingBucket();
    const files = await bucket.find({ _id: objectId }).toArray();
    if (!files.length) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const file = files[0];
    res.status(200);
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    if (file.length != null) res.setHeader('Content-Length', String(file.length));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Accept-Ranges', 'bytes');

    const download = bucket.openDownloadStream(objectId);
    download.on('error', (err) => {
      console.error('GridFS serve error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Failed to load media' });
      else res.end();
    });
    return download.pipe(res);
  } catch (err) {
    console.error('Media serve error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Failed to load media' });
    }
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

// ─── Store billing (physical shop / walk-in sales) ────────────────────────────
const STORE_BILL_METHODS = ['cash', 'upi', 'card'];

function sanitizeStoreBillInput(body = {}) {
  const itemName = String(body.itemName || body.title || '').trim();
  if (!itemName) throw new Error('Item / product name is required');

  const unitPrice = Math.max(0, Number(body.unitPrice) || Number(body.amount) || 0);
  const qty = Math.max(1, Number(body.qty) || 1);
  const discount = Math.max(0, Number(body.discount) || 0);
  const gross = unitPrice * qty;
  const amount = Math.max(0, Number.isFinite(Number(body.amount)) ? Number(body.amount) : gross - discount);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Valid amount is required');

  const paymentMethod = STORE_BILL_METHODS.includes(body.paymentMethod)
    ? body.paymentMethod
    : 'cash';

  const soldAt = body.soldAt ? new Date(body.soldAt) : new Date();

  return {
    customerName: String(body.customerName || '').trim(),
    customerPhone: String(body.customerPhone || '').trim(),
    productId: String(body.productId || '').trim(),
    itemName,
    sizeId: String(body.sizeId || '').trim(),
    sizeLabel: String(body.sizeLabel || '').trim(),
    weightId: String(body.weightId || '').trim(),
    weightLabel: String(body.weightLabel || '').trim(),
    qty,
    unitPrice,
    discount: Math.min(discount, gross),
    amount,
    paymentMethod,
    soldAt: Number.isNaN(soldAt.getTime()) ? new Date() : soldAt,
    notes: String(body.notes || '').trim(),
  };
}

app.get('/api/admin/store-bills', protect, admin, async (_req, res) => {
  try {
    const bills = await StoreBill.find().sort({ soldAt: -1, createdAt: -1 }).lean();
    const totals = bills.reduce(
      (acc, b) => {
        acc.totalSales += b.amount || 0;
        acc.bills += 1;
        const method = b.paymentMethod || 'cash';
        acc.byMethod[method] = (acc.byMethod[method] || 0) + (b.amount || 0);
        return acc;
      },
      { totalSales: 0, bills: 0, byMethod: { cash: 0, upi: 0, card: 0 } }
    );
    res.json({ bills, totals, count: bills.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/store-bills', protect, admin, async (req, res) => {
  try {
    const data = sanitizeStoreBillInput(req.body);
    const billId = `SH-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const bill = await StoreBill.create({ ...data, billId });
    res.status(201).json({ ok: true, bill });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/store-bills/:id', protect, admin, async (req, res) => {
  try {
    const data = sanitizeStoreBillInput(req.body);
    const bill = await StoreBill.findOneAndUpdate(
      { billId: req.params.id },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!bill) return res.status(404).json({ error: 'Store bill not found' });
    res.json({ ok: true, bill });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/store-bills/:id', protect, admin, async (req, res) => {
  try {
    const bill = await StoreBill.findOneAndDelete({ billId: req.params.id });
    if (!bill) return res.status(404).json({ error: 'Store bill not found' });
    res.json({ ok: true });
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
app.use('/products', express.static(PRODUCTS_IMG_DIR, { maxAge: '1d' }));
app.use('/frames', express.static(FRAMES_DIR, { maxAge: '1d', fallthrough: false }));
app.use('/marketing', express.static(MARKETING_DIR, { maxAge: '1d' }));
if (fs.existsSync(LEGACY_MARKETING_DIR)) {
  app.use('/marketing', express.static(LEGACY_MARKETING_DIR, { maxAge: '1d' }));
}

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/frames') ||
      req.path.startsWith('/marketing') ||
      req.path.startsWith('/products')
    ) {
      return next();
    }
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    if (!fs.existsSync(MARKETING_VIDEOS_DIR)) {
      fs.mkdirSync(MARKETING_VIDEOS_DIR, { recursive: true });
    }
    if (!fs.existsSync(MARKETING_STATUS_DIR)) {
      fs.mkdirSync(MARKETING_STATUS_DIR, { recursive: true });
    }
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
