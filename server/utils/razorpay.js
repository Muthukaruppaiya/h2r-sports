import crypto from 'crypto';
import Razorpay from 'razorpay';
import AppSettings from '../models/AppSettings.js';

const VALID_MODES = ['test', 'live'];

/** Razorpay key ids always start with rzp_test_ or rzp_live_ — lets legacy single-pair
 *  env vars (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) auto-slot into the right mode below. */
function detectModeFromKeyId(keyId) {
  if (String(keyId || '').startsWith('rzp_live_')) return 'live';
  if (String(keyId || '').startsWith('rzp_test_')) return 'test';
  return null;
}

function normalizeMode(mode) {
  return VALID_MODES.includes(mode) ? mode : 'test';
}

/**
 * Resolves the key id / secret / webhook secret for a given mode.
 * Prefers explicit RAZORPAY_TEST_* / RAZORPAY_LIVE_* env vars (needed so both sets of
 * credentials can be present at once and the admin can flip between them). Falls back to
 * the legacy unprefixed RAZORPAY_KEY_ID / KEY_SECRET / WEBHOOK_SECRET when they match the
 * requested mode's key prefix, so existing single-mode deployments keep working untouched.
 */
function getModeCredentials(mode) {
  const m = normalizeMode(mode);
  const upper = m.toUpperCase();

  let keyId = process.env[`RAZORPAY_${upper}_KEY_ID`] || '';
  let keySecret = process.env[`RAZORPAY_${upper}_KEY_SECRET`] || '';
  let webhookSecret = process.env[`RAZORPAY_${upper}_WEBHOOK_SECRET`] || '';

  const legacyKeyId = process.env.RAZORPAY_KEY_ID || '';
  const legacyKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const legacyWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const legacyMode = detectModeFromKeyId(legacyKeyId);

  if ((!keyId || !keySecret) && legacyMode === m) {
    keyId = keyId || legacyKeyId;
    keySecret = keySecret || legacyKeySecret;
  }
  if (!webhookSecret && legacyMode === m) {
    webhookSecret = legacyWebhookSecret;
  }

  return { keyId, keySecret, webhookSecret };
}

// ─── DB-backed mode (which set of credentials is "live" right now) ─────────────
let cachedMode = null;

export async function getPaymentMode() {
  if (cachedMode) return cachedMode;
  try {
    const settings = await AppSettings.findOne({ key: 'default' }).lean();
    cachedMode = settings?.paymentMode === 'live' ? 'live' : 'test';
  } catch {
    cachedMode = 'test';
  }
  return cachedMode;
}

export async function setPaymentMode(mode, changedBy = 'Admin') {
  const m = normalizeMode(mode);
  if (mode !== 'test' && mode !== 'live') {
    throw Object.assign(new Error('Payment mode must be "test" or "live"'), { status: 400 });
  }
  const creds = getModeCredentials(m);
  if (!creds.keyId || !creds.keySecret) {
    throw Object.assign(
      new Error(
        `Cannot switch to ${m.toUpperCase()} — set RAZORPAY_${m.toUpperCase()}_KEY_ID and ` +
          `RAZORPAY_${m.toUpperCase()}_KEY_SECRET on the server first.`
      ),
      { status: 400 }
    );
  }
  await AppSettings.findOneAndUpdate(
    { key: 'default' },
    { paymentMode: m, paymentModeChangedAt: new Date(), paymentModeChangedBy: changedBy },
    { upsert: true, setDefaultsOnInsert: true }
  );
  cachedMode = m;
  return m;
}

/** Masked status for both modes — safe to send to the admin UI (never the raw secret). */
export function getPaymentModeStatus() {
  const mask = (id) => {
    if (!id) return '';
    if (id.length <= 14) return `${id.slice(0, 8)}••••`;
    return `${id.slice(0, 12)}••••${id.slice(-4)}`;
  };
  const build = (mode) => {
    const c = getModeCredentials(mode);
    return {
      configured: Boolean(c.keyId && c.keySecret),
      keyId: mask(c.keyId),
      webhookConfigured: Boolean(c.webhookSecret),
    };
  };
  return { test: build('test'), live: build('live') };
}

export function isRazorpayConfigured(mode) {
  const c = getModeCredentials(mode);
  return Boolean(c.keyId && c.keySecret);
}

export function getRazorpayKeyId(mode) {
  return getModeCredentials(mode).keyId;
}

export function getRazorpayClient(mode) {
  const c = getModeCredentials(mode);
  if (!c.keyId || !c.keySecret) {
    const m = normalizeMode(mode);
    throw Object.assign(
      new Error(`Razorpay ${m.toUpperCase()} keys are not configured on the server.`),
      { status: 503 }
    );
  }
  return new Razorpay({ key_id: c.keyId, key_secret: c.keySecret });
}

export function rupeesToPaise(amount) {
  return Math.round(Number(amount || 0) * 100);
}

export function verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature, mode }) {
  const secret = getModeCredentials(mode).keySecret;
  if (!secret) return false;
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(razorpaySignature || '')));
  } catch {
    return false;
  }
}

export function mapRazorpayMethod(method) {
  if (method === 'upi') return 'upi';
  if (method === 'card') return 'card';
  if (method === 'netbanking' || method === 'wallet' || method === 'emi') return 'razorpay';
  return 'razorpay';
}

/**
 * A single webhook URL in the Razorpay dashboard can only belong to one mode at a time,
 * but both Test and Live webhook secrets may be configured here simultaneously (e.g. while
 * testing before go-live). Try every configured secret and report which mode matched,
 * instead of assuming "whichever mode is currently active in the admin toggle" — a webhook
 * for an in-flight test payment must still verify correctly even if the admin has since
 * flipped the toggle to Live (and vice versa).
 */
export function verifyRazorpayWebhookSignatureAnyMode(rawBody, signature) {
  if (!signature) return { valid: false, mode: null };
  for (const mode of VALID_MODES) {
    const secret = getModeCredentials(mode).webhookSecret;
    if (!secret) continue;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)))) {
        return { valid: true, mode };
      }
    } catch {
      /* different length → signature can't match this secret, try the next */
    }
  }
  return { valid: false, mode: null };
}

export function isRazorpayWebhookConfigured() {
  return Boolean(getModeCredentials('test').webhookSecret || getModeCredentials('live').webhookSecret);
}
