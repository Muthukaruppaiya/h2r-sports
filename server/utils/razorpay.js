import crypto from 'crypto';
import Razorpay from 'razorpay';

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export function isRazorpayConfigured() {
  return Boolean(KEY_ID && KEY_SECRET);
}

export function getRazorpayKeyId() {
  return KEY_ID;
}

export function getRazorpayClient() {
  if (!isRazorpayConfigured()) {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  return new Razorpay({
    key_id: KEY_ID,
    key_secret: KEY_SECRET,
  });
}

export function rupeesToPaise(amount) {
  return Math.round(Number(amount || 0) * 100);
}

export function verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (!KEY_SECRET) return false;
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac('sha256', KEY_SECRET).update(body).digest('hex');
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
