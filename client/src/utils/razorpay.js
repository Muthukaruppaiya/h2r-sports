import { BRAND } from './india';

let checkoutPromise = null;

export function loadRazorpayCheckout() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay requires a browser'));
  }
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (checkoutPromise) return checkoutPromise;

  checkoutPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay-checkout]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay));
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = () => {
      if (!window.Razorpay) {
        reject(new Error('Razorpay SDK missing after load'));
        return;
      }
      resolve(window.Razorpay);
    };
    script.onerror = () => {
      checkoutPromise = null;
      reject(new Error('Failed to load Razorpay Checkout'));
    };
    document.body.appendChild(script);
  });

  return checkoutPromise;
}

/** Prefer UPI when the Razorpay account has it enabled; keep defaults as fallback (test mode often lacks UPI). */
export function buildRazorpayDisplayConfig(preferredMethod = 'upi') {
  const sequence =
    preferredMethod === 'card'
      ? ['card', 'upi', 'netbanking', 'wallet']
      : preferredMethod === 'netbanking'
        ? ['netbanking', 'upi', 'card', 'wallet']
        : ['upi', 'card', 'netbanking', 'wallet'];

  return {
    display: {
      // Highlight UPI as its own block when the merchant account supports it
      blocks: {
        upi_preferred: {
          name: 'Pay using UPI (QR / UPI ID)',
          instruments: [{ method: 'upi' }],
        },
      },
      hide: [{ method: 'paylater' }],
      sequence:
        preferredMethod === 'upi'
          ? ['block.upi_preferred', 'card', 'netbanking', 'wallet']
          : sequence,
      preferences: {
        // IMPORTANT: keep defaults on — test accounts often have no UPI yet;
        // false would hide everything except what we list (and UPI vanishes).
        show_default_blocks: true,
      },
    },
  };
}

export function buildRazorpayOptions({
  keyId,
  amount,
  currency = 'INR',
  orderId,
  razorpayOrderId,
  preferredMethod = 'upi',
  customer,
  productLabel,
  onSuccess,
  onDismiss,
}) {
  return {
    key: keyId,
    amount,
    currency,
    name: BRAND.name,
    description: productLabel || 'H2R Sports order',
    image: '/h2r-crest.png',
    order_id: razorpayOrderId,
    prefill: {
      name: customer?.name || '',
      email: customer?.email || '',
      contact: customer?.contact || '',
      method: preferredMethod === 'netbanking' ? 'netbanking' : preferredMethod,
    },
    notes: {
      h2rOrderId: orderId,
    },
    theme: {
      color: '#0a2540',
      backdrop_color: 'rgba(10, 37, 64, 0.72)',
    },
    config: buildRazorpayDisplayConfig(preferredMethod),
    retry: { enabled: true, max_count: 2 },
    remember_customer: true,
    handler: onSuccess,
    modal: {
      confirm_close: true,
      ondismiss: onDismiss,
      animation: true,
    },
  };
}

export function openRazorpayCheckout(options) {
  return loadRazorpayCheckout().then((Razorpay) => {
    const rzp = new Razorpay(options);
    rzp.on('payment.failed', () => {
      /* user can retry in modal; dismiss handled separately */
    });
    rzp.open();
    return rzp;
  });
}
