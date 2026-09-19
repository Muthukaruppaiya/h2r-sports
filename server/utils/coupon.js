import Coupon from '../models/Coupon.js';

export function normalizeCouponCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export async function applyCouponToSubtotal(rawCode, subtotal) {
  const code = normalizeCouponCode(rawCode);
  if (!code) {
    return { discount: 0, couponCode: '', coupon: null };
  }

  const coupon = await Coupon.findOne({ code }).lean();
  if (!coupon || !coupon.active) {
    throw Object.assign(new Error('Invalid coupon code'), { status: 400 });
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    throw Object.assign(new Error('This coupon has expired'), { status: 400 });
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw Object.assign(new Error('This coupon has been fully used'), { status: 400 });
  }

  const amount = Math.max(0, Number(subtotal) || 0);
  if (coupon.minOrder > 0 && amount < coupon.minOrder) {
    throw Object.assign(
      new Error(`Minimum order ₹${coupon.minOrder.toLocaleString('en-IN')} for this coupon`),
      { status: 400 }
    );
  }

  let discount = 0;
  if (coupon.type === 'percent') {
    discount = Math.round((amount * Number(coupon.value || 0)) / 100);
    if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = Math.round(Number(coupon.value) || 0);
  }
  discount = Math.min(discount, amount);
  if (discount < 1) {
    throw Object.assign(new Error('Coupon does not apply to this order'), { status: 400 });
  }

  return { discount, couponCode: coupon.code, coupon };
}
