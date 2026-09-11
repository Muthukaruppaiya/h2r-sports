import crypto from 'crypto';
import Razorpay from 'razorpay';

function getKeyId() {
  return process.env.RAZORPAY_KEY_ID || '';
}

function getKeySecret() {
  return process.env.RAZORPAY_KEY_SECRET || '';
}

export function isRazorpayConfigured() {
  return Boolean(getKeyId() && getKeySecret());
}

export function getRazorpayKeyId() {
  return getKeyId();
}

export function getRazorpayClient() {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  return new Razorpay({
    key_id: getKeyId(),
    key_secret: getKeySecret(),
  });
}

export function rupeesToPaise(amount) {
  return Math.round(Number(amount || 0) * 100);
}

export function verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const secret = getKeySecret();
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

export function verifyRazorpayWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
  } catch {
    return false;
  }
}

export function isRazorpayWebhookConfigured() {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
}
