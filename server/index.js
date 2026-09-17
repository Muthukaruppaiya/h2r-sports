import './loadEnv.js';
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
import Notification from './models/Notification.js';
import MarketingSettings from './models/MarketingSettings.js';
import AppSettings from './models/AppSettings.js';
import Media from './models/Media.js';
import StoreBill from './models/StoreBill.js';
import PendingCheckout from './models/PendingCheckout.js';
import { ensureCounterSeed, nextSequence } from './models/Counter.js';
import { buildStatusUpdate, isValidStatus } from './utils/orderStatus.js';
import { parseInstagramUrl } from './utils/instagram.js';
import { buildLineItemsFromRequest, validateCheckoutPayload } from './utils/orderCheckout.js';
import { uniquifySizes, sizesNeedRewrite } from './utils/productSizes.js';
import { fulfillPaidCheckout, publicOrder } from './utils/orderFulfill.js';
import { sendOrderEmail } from './utils/orderMail.js';
import {
  getRazorpayClient,
  getRazorpayKeyId,
  isRazorpayConfigured,
  isRazorpayWebhookConfigured,
  rupeesToPaise,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignatureAnyMode,
  getPaymentMode,
  setPaymentMode,
  getPaymentModeStatus,
  ensureLivePaymentMode,
} from './utils/razorpay.js';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { isDeliverableEmail } from './utils/orderMail.js';
import { sendVerificationEmail, sendPasswordResetEmail } from './utils/authMail.js';

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
let marketingBucketDb = null;

function getMarketingBucket() {
  const db = mongoose.connection?.db;
  if (!db) {
    throw new Error('MongoDB is not connected yet');
  }
  // Re-create the bucket if the underlying Db handle ever changes (e.g. after the driver
  // recycles the connection following a long idle period) instead of caching it forever —
  // an old bucket pinned to a stale/closed Db handle would silently fail to serve files.
  if (!marketingBucket || marketingBucketDb !== db) {
    marketingBucket = new GridFSBucket(db, { bucketName: 'marketing' });
    marketingBucketDb = db;
  }
  return marketingBucket;
}

function publicApiOrigin(req) {
  return (
    process.env.PUBLIC_API_URL ||
    `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`
  ).replace(/\/$/, '');
}

/**
 * Where the React app is hosted — used to build password-reset / verify-email links.
 * CLIENT_URL may list several allowed origins (comma-separated, see CORS setup below) once
 * a store has both a bare domain and a `www.` alias (or an old Netlify subdomain still live) —
 * so pick whichever one this specific request actually came from, instead of blindly
 * returning the raw (possibly comma-joined) env var, which would build a broken link like
 * "https://h2rsports.in,https://www.h2rsports.in/reset-password/...".
 */
function resolveClientOrigin(req) {
  const requestOrigin = (() => {
    const raw = req.get('origin') || req.get('referer') || '';
    if (!raw) return '';
    try {
      const u = new URL(raw);
      return `${u.protocol}//${u.host}`;
    } catch {
      return '';
    }
  })();

  if (configuredClientOrigins.length) {
    if (requestOrigin && configuredClientOrigins.includes(requestOrigin.replace(/\/$/, ''))) {
      return requestOrigin;
    }
    return configuredClientOrigins[0];
  }

  return requestOrigin || 'http://localhost:5173';
}

/** Random token for email links — only the SHA-256 hash is stored server-side. */
function issueToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw || '')).digest('hex');
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
  const sizes = uniquifySizes(src.sizes || []);
  return { ...src, sizes, images, image: images[0] };
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
    out.sizes = uniquifySizes(
      out.sizes
        .map((s) => ({
          id: String(s.id || '').trim(),
          label: String(s.label || '').trim(),
          price: Number(s.price) || out.price || 0,
        }))
        .filter((s) => s.label || s.id)
    );
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

// Lock CORS down to known frontend origin(s) once CLIENT_URL is configured. Until then,
// stay permissive (identical to the previous `cors()` behaviour) so nothing breaks live
// traffic that hasn't set the env var yet — but the site should set CLIENT_URL before go-live.
const configuredClientOrigins = String(process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

if (configuredClientOrigins.length) {
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header = same-origin/non-browser request (curl, webhooks, mobile) — allow.
        if (!origin || configuredClientOrigins.includes(origin.replace(/\/$/, ''))) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
    })
  );
} else {
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '⚠ CLIENT_URL is not set — CORS is wide open to all origins. Set CLIENT_URL (comma-separated for multiple domains, e.g. https://h2rsports.in,https://www.h2rsports.in) before go-live to restrict it.'
    );
  }
  app.use(cors());
}

// ─── Rate limiting on auth endpoints ─────────────────────────────────────────
// Prevents brute-force login/OTP guessing and password-reset/verification email spam.
// A genuine user retrying a typo a few times will never hit this; scripted abuse will.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

// Pincode lookup is unauthenticated (used while filling the address form) and proxies an
// external API — rate-limit it so it can't be abused as an open relay / scraping vector.
const pincodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many pincode lookups. Please wait a moment.' },
});

app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/razorpay/webhook') {
    return express.raw({ type: 'application/json' })(req, res, next);
  }
  return express.json()(req, res, next);
});

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

const MAX_REVIEW_MEDIA_FILES = 4;
const MAX_REVIEW_MEDIA_BYTES = 25 * 1024 * 1024;

/** Customer review photos/clips — public upload, kept smaller than admin marketing uploads */
const reviewMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_REVIEW_MEDIA_BYTES, files: MAX_REVIEW_MEDIA_FILES },
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

function uploadErrorMessage(err, fallback, maxBytes = MAX_VIDEO_BYTES) {
  if (!err) return fallback;
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return `File is too large. Max ${Math.round(maxBytes / (1024 * 1024))}MB. Compress it and try again.`;
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return `You can upload up to ${MAX_REVIEW_MEDIA_FILES} photos/clips.`;
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
// Gapless, human-readable sequence (H2R-000001, H2R-000002, ...) instead of a
// timestamp+random string — makes order numbers scannable/orderable on printed
// invoices & shipping labels, and satisfies the usual "sequential invoice number"
// expectation for GST bookkeeping. Counter is seeded once at server boot (see below)
// so it continues on roughly from however many orders already exist.
async function makeOrderId() {
  const seq = await nextSequence('order');
  return `H2R-${String(seq).padStart(6, '0')}`;
}

async function makeStoreBillId() {
  const seq = await nextSequence('storeBill');
  return `SH-${String(seq).padStart(6, '0')}`;
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

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function isValidIndianPhone(phone) {
  return /^[6-9]\d{9}$/.test(normalizePhone(phone));
}

function ownsOrder(user, order) {
  if (!user || !order) return false;
  if (user.role === 'admin') return true;
  const email = String(user.email || '').toLowerCase();
  const phone = normalizePhone(user.phone);
  const orderEmail = String(order.customer?.email || '').toLowerCase();
  const orderPhone = normalizePhone(order.customer?.phone);
  return Boolean((email && email === orderEmail) || (phone && phone === orderPhone));
}

function authUserPayload(user, token) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    emailVerified: !!user.emailVerified,
    phone: user.phone || '',
    role: user.role,
    token,
  };
}

function publicAddresses(user) {
  return (user.addresses || []).map((a) => ({
    id: String(a._id),
    label: a.label || 'Home',
    name: a.name,
    phone: a.phone,
    addressLine1: a.addressLine1,
    addressLine2: a.addressLine2 || '',
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: !!a.isDefault,
  }));
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    // Cast every field to a string before it touches a Mongo query/document — otherwise
    // a JSON body like {"email": {"$ne": null}} would be interpreted as a query operator
    // (NoSQL injection) instead of a literal value.
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const phone = String(req.body?.phone || '');

    if (!name) return res.status(400).json({ error: 'Enter your name' });
    if (!email) return res.status(400).json({ error: 'Enter a valid email address' });
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'User already exists' });
    const cleanPhone = phone ? normalizePhone(phone) : '';
    if (cleanPhone && !isValidIndianPhone(cleanPhone)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
    }
    const user = await User.create({
      name,
      email,
      password,
      phone: cleanPhone,
    });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

    // Best-effort verification email — never blocks account creation.
    if (isDeliverableEmail(user.email)) {
      const { raw, hash } = issueToken();
      user.emailVerifyTokenHash = hash;
      user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
      const verifyUrl = `${resolveClientOrigin(req)}/verify-email/${raw}`;
      sendVerificationEmail(user, verifyUrl).catch(() => {});
    }

    res.status(201).json(authUserPayload(user, token));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    // Cast to string before querying — see note in /api/auth/register above.
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const user = email ? await User.findOne({ email }) : null;
    if (user && password && (await user.matchPassword(password))) {
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
      res.json(authUserPayload(user, token));
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Checkout phone gate — does this mobile already have an account? */
app.post('/api/auth/phone/check', authLimiter, async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    if (!isValidIndianPhone(phone)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' });
    }
    const user = await User.findOne({ phone });
    res.json({
      exists: !!user,
      name: user?.name || '',
      phone,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Continue checkout with phone:
 * - existing customer → log in
 * - new customer → create with name + phone (basic details)
 */
app.post('/api/auth/phone/continue', authLimiter, async (req, res) => {
  try {
    const phone = normalizePhone(req.body?.phone);
    const name = String(req.body?.name || '').trim();
    if (!isValidIndianPhone(phone)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' });
    }

    let user = await User.findOne({ phone });
    if (user) {
      if (user.role === 'admin') {
        return res.status(400).json({ error: 'Admin accounts must sign in with email' });
      }
      const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({
        ...authUserPayload(user, token),
        addresses: publicAddresses(user),
        isNew: false,
      });
    }

    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'Enter your name to create an account', needName: true });
    }

    const email = `${phone}@phone.h2rsports.in`;
    const password = `h2r_${phone}_${Math.random().toString(36).slice(2, 10)}`;
    user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'customer',
      addresses: [],
    });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
      ...authUserPayload(user, token),
      addresses: [],
      isNew: true,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ error: 'This mobile or email is already registered' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', protect, (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    emailVerified: !!req.user.emailVerified,
    phone: req.user.phone,
    role: req.user.role,
    addresses: publicAddresses(req.user),
  });
});

/** Resend the verification link for the logged-in user's own email. */
app.post('/api/auth/resend-verification', authLimiter, protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!isDeliverableEmail(user.email)) {
      return res.status(400).json({ error: 'No email address on file to verify' });
    }
    if (user.emailVerified) {
      return res.json({ ok: true, alreadyVerified: true });
    }
    const { raw, hash } = issueToken();
    user.emailVerifyTokenHash = hash;
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    const verifyUrl = `${resolveClientOrigin(req)}/verify-email/${raw}`;
    await sendVerificationEmail(user, verifyUrl);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Confirm an email address via the token from the verification email link. */
app.post('/api/auth/verify-email', authLimiter, async (req, res) => {
  try {
    const raw = String(req.body?.token || '').trim();
    if (!raw) return res.status(400).json({ error: 'Missing verification token' });

    const hash = hashToken(raw);
    const user = await User.findOne({
      emailVerifyTokenHash: hash,
      emailVerifyExpires: { $gt: new Date() },
    }).select('+emailVerifyTokenHash +emailVerifyExpires');

    if (!user) {
      return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
    }

    user.emailVerified = true;
    user.emailVerifyTokenHash = '';
    user.emailVerifyExpires = undefined;
    await user.save();

    res.json({ ok: true, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Start a password reset — always responds success-like to avoid leaking which emails exist. */
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const generic = {
      ok: true,
      message: 'If an account exists for that email, a reset link has been sent.',
    };
    if (!email) return res.json(generic);

    const user = await User.findOne({ email });
    if (!user || !isDeliverableEmail(user.email)) return res.json(generic);

    const { raw, hash } = issueToken();
    user.resetPasswordTokenHash = hash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${resolveClientOrigin(req)}/reset-password/${raw}`;
    sendPasswordResetEmail(user, resetUrl).catch(() => {});

    res.json(generic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Complete a password reset using the token from the reset email link. */
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const raw = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');
    if (!raw) return res.status(400).json({ error: 'Missing reset token' });
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hash = hashToken(raw);
    const user = await User.findOne({
      resetPasswordTokenHash: hash,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+resetPasswordTokenHash +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    }

    user.password = password; // pre-save hook re-hashes
    user.resetPasswordTokenHash = '';
    user.resetPasswordExpires = undefined;
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.json(authUserPayload(user, token));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/profile', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    // Update user profile
    req.user.name = name || req.user.name;
    if (phone !== undefined) {
      const cleanPhone = normalizePhone(phone);
      if (cleanPhone && !isValidIndianPhone(cleanPhone)) {
        return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
      }
      req.user.phone = cleanPhone;
    }
    const updatedUser = await req.user.save();

    // Also update their details in past orders to keep the admin view synchronized
    await Order.updateMany(
      { 'customer.email': updatedUser.email },
      { $set: { 'customer.name': updatedUser.name, 'customer.phone': updatedUser.phone } }
    );

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      addresses: publicAddresses(updatedUser),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/addresses', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ addresses: publicAddresses(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/addresses', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const body = req.body || {};
    const phone = normalizePhone(body.phone || user.phone);
    if (!body.name?.trim() || !body.addressLine1?.trim() || !body.city?.trim() || !body.state || !body.pincode) {
      return res.status(400).json({ error: 'Name, address, city, state and PIN are required' });
    }
    if (!isValidIndianPhone(phone)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
    }
    if (!/^\d{6}$/.test(String(body.pincode))) {
      return res.status(400).json({ error: 'Enter a valid 6-digit PIN code' });
    }

    const entry = {
      label: String(body.label || 'Home').trim() || 'Home',
      name: String(body.name).trim(),
      phone,
      addressLine1: String(body.addressLine1).trim(),
      addressLine2: String(body.addressLine2 || '').trim(),
      city: String(body.city).trim(),
      state: body.state,
      pincode: String(body.pincode),
      isDefault: user.addresses.length === 0 ? true : !!body.isDefault,
    };

    if (entry.isDefault) {
      user.addresses.forEach((a) => {
        a.isDefault = false;
      });
    }
    user.addresses.push(entry);
    await user.save();
    res.status(201).json({ addresses: publicAddresses(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/addresses/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const addr = user.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ error: 'Address not found' });

    const body = req.body || {};
    if (body.label != null) addr.label = String(body.label).trim() || addr.label;
    if (body.name != null) addr.name = String(body.name).trim();
    if (body.phone != null) {
      const phone = normalizePhone(body.phone);
      if (!isValidIndianPhone(phone)) {
        return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
      }
      addr.phone = phone;
    }
    if (body.addressLine1 != null) addr.addressLine1 = String(body.addressLine1).trim();
    if (body.addressLine2 != null) addr.addressLine2 = String(body.addressLine2).trim();
    if (body.city != null) addr.city = String(body.city).trim();
    if (body.state != null) addr.state = body.state;
    if (body.pincode != null) {
      if (!/^\d{6}$/.test(String(body.pincode))) {
        return res.status(400).json({ error: 'Enter a valid 6-digit PIN code' });
      }
      addr.pincode = String(body.pincode);
    }
    if (body.isDefault) {
      user.addresses.forEach((a) => {
        a.isDefault = String(a._id) === String(addr._id);
      });
    }
    await user.save();
    res.json({ addresses: publicAddresses(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/auth/addresses/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const addr = user.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ error: 'Address not found' });
    const wasDefault = addr.isDefault;
    addr.deleteOne();
    if (wasDefault && user.addresses.length) {
      user.addresses[0].isDefault = true;
    }
    await user.save();
    res.json({ addresses: publicAddresses(user) });
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
    supportPhone: '+91 99949 78963',
    supportEmail: 'h2rsports7@gmail.com',
    address: 'Tamil Nadu, India',
    payments: ['UPI', 'Cards', 'NetBanking'],
    whatsapp: '919994978963',
    whatsappLink: 'https://wa.me/919994978963',
    benefits: [
      'All India Free Shipping',
      'Free premium cover',
      '6 months handle warranty',
      'UPI & Cards accepted',
    ],
  });
});

// ─── Pincode → City/State lookup ───────────────────────────────────────────────
// Free, keyless India Post lookup — used to auto-fill the checkout address form.
const INDIAN_STATE_NAMES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];
// India Post's own data still uses a few pre-renamed / abbreviated state names.
const STATE_ALIASES = {
  orissa: 'Odisha',
  pondicherry: 'Puducherry',
  'nct of delhi': 'Delhi',
  'jammu & kashmir': 'Jammu and Kashmir',
  uttaranchal: 'Uttarakhand',
};
function normalizeStateName(raw) {
  const clean = String(raw || '').trim();
  if (!clean) return '';
  const lower = clean.toLowerCase();
  if (STATE_ALIASES[lower]) return STATE_ALIASES[lower];
  const match = INDIAN_STATE_NAMES.find((s) => s.toLowerCase() === lower);
  return match || clean;
}

const pincodeCache = new Map(); // in-memory cache — pincode → area data never changes

app.get('/api/utils/pincode/:code', pincodeLimiter, async (req, res) => {
  const code = String(req.params.code || '').trim();
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ found: false, error: 'Enter a valid 6-digit PIN code' });
  }
  if (pincodeCache.has(code)) {
    return res.json(pincodeCache.get(code));
  }
  try {
    const upstream = await fetch(`https://api.postalpincode.in/pincode/${code}`);
    const data = await upstream.json().catch(() => null);
    const entry = Array.isArray(data) ? data[0] : null;
    const office =
      entry?.Status === 'Success' && Array.isArray(entry.PostOffice) ? entry.PostOffice[0] : null;

    const result = office
      ? {
          found: true,
          pincode: code,
          city: office.District || office.Block || office.Name || '',
          state: normalizeStateName(office.State),
          area: office.Name || '',
        }
      : { found: false, pincode: code };

    pincodeCache.set(code, result);
    return res.json(result);
  } catch (err) {
    console.error('Pincode lookup failed:', err.message);
    return res.status(502).json({ found: false, pincode: code, error: 'Pincode lookup service unavailable' });
  }
});

// ─── Collections ──────────────────────────────────────────────────────────────
app.get('/api/collections', async (req, res) => {
  try {
    const includeEmpty = String(req.query.all || '') === 'true';
    const collections = await Collection.find().sort({ sortOrder: 1, featured: -1 }).lean();
    const withCounts = await Promise.all(
      collections.map(async (col) => ({
        ...col,
        count: await Product.countDocuments({ collection: col.id }),
      }))
    );
    res.json({
      collections: includeEmpty ? withCounts : withCounts.filter((c) => c.count > 0),
    });
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
    if (topSelling === 'true')   filter.topSelling = true;
    if (mostLoved  === 'true')   filter.mostLoved  = true;

    const familyByLabel = {
      'hard tennis': 'hard-tennis',
      'soft tennis': 'soft-tennis',
      season: 'season',
    };
    const requestedCategory = String(category || '').trim();
    const family = familyByLabel[requestedCategory.toLowerCase()];
    if (family) {
      const ids = await Collection.find({ family }).distinct('id');
      if (family === 'season') {
        filter.$or = [{ collection: { $in: ids } }, { category: /season/i }];
      } else {
        filter.collection = { $in: ids };
      }
    } else if (requestedCategory && requestedCategory !== 'All') {
      filter.category = requestedCategory;
    }

    if (q) {
      const term = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const textClause = {
        $or: [{ name: term }, { tagline: term }, { willow: term }, { category: term }],
      };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, textClause];
        delete filter.$or;
      } else {
        Object.assign(filter, textClause);
      }
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
function sanitizeReviewMedia(input) {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, MAX_REVIEW_MEDIA_FILES)
    .map((m) => ({
      url: String(m?.url || '').trim(),
      type: m?.type === 'video' ? 'video' : 'image',
    }))
    .filter((m) => m.url);
}

function publicReview(doc) {
  const r = doc?.toObject ? doc.toObject() : doc;
  if (!r) return null;
  return {
    id: String(r._id),
    name: r.name,
    text: r.text,
    rating: r.rating,
    location: r.location || '',
    image: r.image || '',
    media: Array.isArray(r.media) ? r.media.map((m) => ({ url: m.url, type: m.type || 'image' })) : [],
    productId: r.productId || '',
    productName: r.productName || '',
    status: r.status || 'approved',
    featured: !!r.featured,
    sortOrder: Number(r.sortOrder) || 0,
    source: r.source || 'admin',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Public storefront — approved reviews only */
app.get('/api/reviews', async (_req, res) => {
  try {
    const reviews = await Review.find({
      $or: [{ status: 'approved' }, { status: { $exists: false } }, { status: null }],
    })
      .sort({ featured: -1, sortOrder: 1, createdAt: -1 })
      .lean();
    res.json({ reviews: reviews.map(publicReview) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Customer uploads photos/short clips for their review before submitting.
 * Public endpoint (no auth) — limited to a few small files to prevent abuse.
 */
app.post('/api/reviews/upload-media', (req, res) => {
  reviewMediaUpload.array('media', MAX_REVIEW_MEDIA_FILES)(req, res, async (err) => {
    if (err) {
      console.error('Review media upload error:', err);
      return res.status(400).json({ error: uploadErrorMessage(err, 'Upload failed', MAX_REVIEW_MEDIA_BYTES) });
    }
    try {
      const files = req.files || [];
      if (!files.length) return res.status(400).json({ error: 'No photo or video selected' });

      const media = [];
      for (const file of files) {
        const mediaType = detectMediaType(file);
        if (!mediaType) continue;
        const contentType =
          mediaType === 'video' ? guessVideoContentType(file) : file.mimetype || 'image/jpeg';

        if (mediaType === 'image' && file.buffer.length <= 8 * 1024 * 1024) {
          const doc = await Media.create({
            filename: file.originalname || 'review.jpg',
            contentType,
            size: file.buffer.length,
            data: file.buffer,
          });
          media.push({ url: `/api/media/${doc._id}`, type: mediaType });
          continue;
        }

        const stored = await storeBufferInGridFS(file.buffer, {
          filename: file.originalname || `review-${Date.now()}`,
          contentType,
        });
        media.push({ url: stored.url, type: mediaType });
      }

      if (!media.length) return res.status(400).json({ error: 'Unsupported file type' });
      res.json({ ok: true, media });
    } catch (e) {
      console.error('Review media store error:', e);
      res.status(500).json({ error: e.message || 'Upload failed' });
    }
  });
});

/**
 * Customer submits a bat review → lands in admin as pending.
 * Admin must approve ("post on website") before it appears in the home marquee.
 */
app.post('/api/reviews', async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const text = String(body.text || '').trim();
    const productId = String(body.productId || '').trim();
    const productName = String(body.productName || '').trim();
    const location = String(body.location || '').trim();
    const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
    const media = sanitizeReviewMedia(body.media);

    if (name.length < 2) {
      return res.status(400).json({ error: 'Enter your name' });
    }
    if (text.length < 10) {
      return res.status(400).json({ error: 'Write a short review (at least 10 characters)' });
    }
    if (!productId && !productName) {
      return res.status(400).json({ error: 'Product is required' });
    }

    // Light spam guard: same name + product within 10 minutes
    const recent = await Review.findOne({
      name,
      productId: productId || '',
      source: 'customer',
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
    }).lean();
    if (recent) {
      return res.status(429).json({
        error: 'You already sent a review for this bat. Please wait a few minutes.',
      });
    }

    const review = await Review.create({
      name,
      text,
      rating,
      location,
      media,
      productId,
      productName: productName || productId,
      status: 'pending',
      featured: false,
      sortOrder: 0,
      source: 'customer',
    });

    res.status(201).json({
      ok: true,
      message: 'Thanks! Your review was sent for approval. It will appear on the site after H2R posts it.',
      review: publicReview(review),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Admin — full review management */
app.get('/api/admin/reviews', protect, admin, async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const filter = {};
    if (status && ['pending', 'approved', 'hidden'].includes(status)) {
      filter.status = status;
    }
    const reviews = await Review.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ reviews: reviews.map(publicReview) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/reviews', protect, admin, async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const text = String(body.text || '').trim();
    if (!name || !text) {
      return res.status(400).json({ error: 'Name and review text are required' });
    }
    const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
    const review = await Review.create({
      name,
      text,
      rating,
      location: String(body.location || '').trim(),
      image: String(body.image || '').trim(),
      media: sanitizeReviewMedia(body.media),
      productId: String(body.productId || '').trim(),
      productName: String(body.productName || '').trim(),
      status: ['pending', 'approved', 'hidden'].includes(body.status) ? body.status : 'approved',
      featured: !!body.featured,
      sortOrder: Number(body.sortOrder) || 0,
      source: 'admin',
    });
    res.status(201).json({ review: publicReview(review) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/reviews/:id', protect, admin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const body = req.body || {};
    if (body.name != null) review.name = String(body.name).trim();
    if (body.text != null) review.text = String(body.text).trim();
    if (body.rating != null) review.rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
    if (body.location != null) review.location = String(body.location).trim();
    if (body.image != null) review.image = String(body.image).trim();
    if (body.media != null) review.media = sanitizeReviewMedia(body.media);
    if (body.productId != null) review.productId = String(body.productId).trim();
    if (body.productName != null) review.productName = String(body.productName).trim();
    if (body.status != null && ['pending', 'approved', 'hidden'].includes(body.status)) {
      review.status = body.status;
    }
    if (body.featured != null) review.featured = !!body.featured;
    if (body.sortOrder != null) review.sortOrder = Number(body.sortOrder) || 0;

    if (!review.name || !review.text) {
      return res.status(400).json({ error: 'Name and review text are required' });
    }

    await review.save();
    res.json({ review: publicReview(review) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/reviews/:id', protect, admin, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Notifications ────────────────────────────────────────────────────────────
app.get('/api/admin/notifications', protect, admin, async (req, res) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 30);
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({}).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ read: false }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/notifications/read-all', protect, admin, async (_req, res) => {
  try {
    await Notification.updateMany({ read: false }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/notifications/:id/read', protect, admin, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { $set: { read: true } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Payment mode (Test ⇄ Live) ─────────────────────────────────────────────────
app.get('/api/admin/settings/payment', protect, admin, async (_req, res) => {
  try {
    const mode = await getPaymentMode();
    res.json({ mode, ...getPaymentModeStatus() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/settings/payment', protect, admin, async (req, res) => {
  try {
    const mode = await setPaymentMode(req.body?.mode, req.user?.name || 'Admin');
    res.json({ ok: true, mode, ...getPaymentModeStatus() });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── Store return / pickup address (printed on shipping labels) ────────────────
app.get('/api/admin/settings/store-address', protect, admin, async (_req, res) => {
  try {
    const settings = await AppSettings.findOne({ key: 'default' }).lean();
    res.json({ storeAddress: settings?.storeAddress || {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/settings/store-address', protect, admin, async (req, res) => {
  try {
    const b = req.body || {};
    const storeAddress = {
      name: String(b.name || '').trim() || 'H2R Sports',
      phone: String(b.phone || '').trim(),
      line1: String(b.line1 || '').trim(),
      line2: String(b.line2 || '').trim(),
      city: String(b.city || '').trim(),
      state: String(b.state || '').trim(),
      pincode: String(b.pincode || '').trim(),
      gstin: String(b.gstin || '').trim(),
    };
    const settings = await AppSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: { storeAddress } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ ok: true, storeAddress: settings.storeAddress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Orders / Razorpay ─────────────────────────────────────────────────────────
app.post('/api/payments/razorpay/create', async (req, res) => {
  try {
    const mode = await getPaymentMode();
    if (!isRazorpayConfigured(mode)) {
      return res.status(503).json({
        error: `Razorpay ${mode.toUpperCase()} is not configured on the server. Add RAZORPAY_${mode.toUpperCase()}_KEY_ID and RAZORPAY_${mode.toUpperCase()}_KEY_SECRET.`,
      });
    }

    const { customer, shipping, items } = req.body || {};
    const validated = validateCheckoutPayload({ customer, shipping });
    const { lineItems, subtotal, shippingFee, total } = await buildLineItemsFromRequest(items);

    const amountPaise = rupeesToPaise(total);
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      return res.status(400).json({ error: 'Order total must be at least ₹1 (100 paise)' });
    }

    const orderId = await makeOrderId();
    const razorpay = getRazorpayClient(mode);
    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: orderId.slice(0, 40),
      notes: {
        h2rOrderId: orderId,
        customerName: validated.customer.name,
      },
    });

    await PendingCheckout.findOneAndUpdate(
      { orderId },
      {
        orderId,
        razorpayOrderId: rzpOrder.id,
        amountPaise,
        currency: 'INR',
        paymentMode: mode,
        customer: validated.customer,
        shipping: validated.shipping,
        items: lineItems,
        subtotal,
        shippingFee,
        total,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      ok: true,
      keyId: getRazorpayKeyId(mode),
      amount: amountPaise,
      currency: 'INR',
      orderId,
      razorpayOrderId: rzpOrder.id,
    });
  } catch (err) {
    const rzpStatus = Number(err.statusCode || err.status) || 0;
    const status = rzpStatus === 401 ? 401 : err.status || 500;
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

    // Verify against whichever mode this specific order was created under — not necessarily
    // the admin's *current* toggle — so an in-flight payment always verifies correctly even
    // if the mode gets switched mid-checkout.
    const draftForMode = await PendingCheckout.findOne({ orderId, razorpayOrderId }).lean();
    const mode = draftForMode?.paymentMode || (await getPaymentMode());

    const valid = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      mode,
    });
    if (!valid) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const { order } = await fulfillPaidCheckout({
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      mode,
      changedBy: 'Checkout',
    });

    res.status(201).json({ ok: true, order: publicOrder(order) });
  } catch (err) {
    if (err?.code === 11000) {
      const again = await Order.findOne({ orderId: req.body?.orderId, paymentStatus: 'paid' });
      if (again) return res.json({ ok: true, order: publicOrder(again) });
    }
    const status = err.status || 500;
    console.error('Razorpay verify error:', err);
    res.status(status).json({ error: err.message || 'Payment verification failed' });
  }
});

app.post('/api/payments/razorpay/webhook', async (req, res) => {
  try {
    if (!isRazorpayWebhookConfigured()) {
      console.warn('Razorpay webhook received but no RAZORPAY_(TEST|LIVE)_WEBHOOK_SECRET is set');
      return res.status(503).json({ error: 'Webhook secret is not configured' });
    }
    const signature = req.get('x-razorpay-signature') || '';
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
    const { valid, mode } = verifyRazorpayWebhookSignatureAnyMode(rawBody, signature);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    const type = event?.event || '';
    if (type !== 'payment.captured') {
      return res.json({ ok: true, ignored: type });
    }

    const payment = event?.payload?.payment?.entity || {};
    const razorpayPaymentId = payment.id || '';
    const razorpayOrderId = payment.order_id || '';
    const h2rOrderId = payment.notes?.h2rOrderId || '';

    if (!razorpayOrderId) {
      return res.json({ ok: true, skipped: 'no order id' });
    }

    const { order, created } = await fulfillPaidCheckout({
      orderId: h2rOrderId || undefined,
      razorpayOrderId,
      razorpayPaymentId: razorpayPaymentId || payment.payment_id,
      razorpaySignature: signature,
      mode,
      changedBy: 'Razorpay webhook',
      note: `Order placed from Razorpay webhook (${type})`,
    });

    res.json({ ok: true, created, orderId: order.orderId });
  } catch (err) {
    if (err?.code === 11000) {
      return res.json({ ok: true, created: false });
    }
    if (err.status === 404) {
      // Payment for an unknown draft — acknowledge so Razorpay does not retry forever.
      console.warn('Razorpay webhook: no pending checkout', err.message);
      return res.json({ ok: true, skipped: 'no pending checkout' });
    }
    console.error('Razorpay webhook error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Webhook failed' });
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
    const orders = await Order.find({
      paymentStatus: 'paid',
      $or: [
        { 'customer.email': req.user.email },
        ...(req.user.phone ? [{ 'customer.phone': req.user.phone }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.id, paymentStatus: 'paid' }).lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!ownsOrder(req.user, order)) {
      return res.status(403).json({ error: 'Not authorized to view this order' });
    }
    res.json(publicOrder(order));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin APIs ────────────────────────────────────────────────────────────────
app.get('/api/admin/orders', protect, admin, async (req, res) => {
  try {
    // Remove abandoned pre-payment drafts from older flow (never fulfill unpaid)
    await Order.deleteMany({ paymentStatus: { $in: ['pending', 'failed'] } });

    const orders = await Order.find({ paymentStatus: 'paid' }).sort({ createdAt: -1 }).lean();
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

    const mailEvent = {
      packed: 'packed',
      shipped: 'shipped',
      delivered: 'delivered',
      cancelled: 'cancelled',
    }[currentOrder.status];
    if (mailEvent) {
      sendOrderEmail(currentOrder, mailEvent).catch(() => {});
    }

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
        showcaseVideos: [],
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
    const showcaseVideos = (settings.showcaseVideos || [])
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

    res.json({ floatingVideos, showcaseVideos, whatsappStatuses });
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

/** Shared sanitizer for both the floating-bubble videos and the homepage showcase videos */
function sanitizeVideoEntries(list, { idPrefix = 'video' } = {}) {
  const sanitized = [];
  for (const [idx, v] of list.entries()) {
    const videoUrl = String(v.videoUrl || '').trim();
    const title = String(v.title || '').trim();
    if (!videoUrl && !title) continue;
    if (!videoUrl) {
      return { error: `Upload a video file for "${title || `video ${idx + 1}`}" (required for autoplay).` };
    }
    let instagramUrl = '';
    if (v.instagramUrl) {
      const parsed = parseInstagramUrl(v.instagramUrl);
      if (!parsed) {
        return { error: `Invalid Instagram URL for "${title || `video ${idx + 1}`}".` };
      }
      instagramUrl = parsed.permalink;
    }
    sanitized.push({
      id: v.id || `${idPrefix}-${Date.now()}-${idx}`,
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
  return { sanitized };
}

app.put('/api/admin/marketing', protect, admin, async (req, res) => {
  try {
    const floatingVideos = Array.isArray(req.body.floatingVideos) ? req.body.floatingVideos : [];
    const showcaseVideos = Array.isArray(req.body.showcaseVideos) ? req.body.showcaseVideos : [];
    const whatsappStatuses = Array.isArray(req.body.whatsappStatuses) ? req.body.whatsappStatuses : [];

    const floatingResult = sanitizeVideoEntries(floatingVideos, { idPrefix: 'video' });
    if (floatingResult.error) return res.status(400).json({ error: floatingResult.error });
    const sanitizedVideos = floatingResult.sanitized;

    const showcaseResult = sanitizeVideoEntries(showcaseVideos, { idPrefix: 'showcase' });
    if (showcaseResult.error) return res.status(400).json({ error: showcaseResult.error });
    const sanitizedShowcaseVideos = showcaseResult.sanitized;

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
      {
        floatingVideos: sanitizedVideos,
        showcaseVideos: sanitizedShowcaseVideos,
        whatsappStatuses: sanitizedStatuses,
      },
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

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      paymentStatus: 'paid',
    })
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
    const fileSize = Number(file.length) || 0;
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Accept-Ranges', 'bytes');

    // Honour HTTP Range requests (206 Partial Content). Browsers — especially iOS/Safari,
    // and any browser re-fetching a video after its earlier full-body cache entry has
    // expired/evicted — request video byte-ranges for seeking/playback. Previously this
    // route advertised "Accept-Ranges: bytes" but always answered with the full file and a
    // 200, which many <video> elements reject outright once a real Range request comes in
    // (this is why a video could "work at first" but silently stop playing later).
    const rangeHeader = req.headers.range;
    const rangeMatch = rangeHeader && /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());

    if (rangeMatch && fileSize > 0) {
      let start = rangeMatch[1] ? parseInt(rangeMatch[1], 10) : 0;
      let end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : fileSize - 1;
      if (Number.isNaN(start) || start < 0) start = 0;
      if (Number.isNaN(end) || end > fileSize - 1) end = fileSize - 1;

      if (start > end || start >= fileSize) {
        res.status(416);
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', String(end - start + 1));

      // GridFS's `end` option is exclusive, so pass end+1 to include the last requested byte.
      const download = bucket.openDownloadStream(objectId, { start, end: end + 1 });
      download.on('error', (err) => {
        console.error('GridFS serve error:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to load media' });
        else res.end();
      });
      return download.pipe(res);
    }

    res.status(200);
    if (fileSize) res.setHeader('Content-Length', String(fileSize));
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
    const orders = await Order.find({ paymentStatus: 'paid' }).lean();
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

app.get('/api/admin/store-bills/:id', protect, admin, async (req, res) => {
  try {
    const bill = await StoreBill.findOne({ billId: req.params.id }).lean();
    if (!bill) return res.status(404).json({ error: 'Store bill not found' });
    res.json({ bill });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/store-bills', protect, admin, async (req, res) => {
  try {
    const data = sanitizeStoreBillInput(req.body);
    const billId = await makeStoreBillId();
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

    // Seed the sequential order/bill number counters once, continuing on from however many
    // already exist (legacy orders keep their old-format IDs; only new ones become sequential).
    await ensureCounterSeed('order', await Order.countDocuments());
    await ensureCounterSeed('storeBill', await StoreBill.countDocuments());
    await ensureLivePaymentMode();

    if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'h2r_sports_super_secret') {
      console.error('✗ JWT_SECRET is still the default. Set a long random JWT_SECRET on Render before taking live traffic.');
    }

    const products = await Product.find();
    let sizeFixes = 0;
    for (const product of products) {
      const next = uniquifySizes(product.sizes || []);
      if (sizesNeedRewrite(product.sizes || [], next)) {
        product.sizes = next;
        await product.save();
        sizeFixes += 1;
      }
    }
    if (sizeFixes) {
      console.log(`✓ Unique size ids written on ${sizeFixes} product(s)`);
    }

    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd || process.env.SEED_DEFAULT_ADMIN === 'true') {
      const adminExists = await User.findOne({ email: 'admin@h2rsports.in' });
      if (!adminExists) {
        await User.create({
          name: 'Admin',
          email: 'admin@h2rsports.in',
          password: 'admin123',
          role: 'admin',
        });
        console.log('✓ Default Admin created (admin@h2rsports.in) — change this password immediately');
      }
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
