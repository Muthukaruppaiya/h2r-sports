import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BRAND, formatINR, INDIAN_STATES } from '../utils/india';
import { api } from '../api/store';
import { clearBuyNowItem, getBuyNowItem } from '../utils/checkoutItem';
import { buildRazorpayOptions, openRazorpayCheckout } from '../utils/razorpay';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: 'Tamil Nadu',
  pincode: '',
};

const PAY_METHODS = [
  {
    id: 'upi',
    title: 'UPI',
    subtitle: 'Scan QR or enter UPI ID',
    badges: ['GPay', 'PhonePe', 'Paytm'],
    hint: 'Fastest · Recommended',
  },
  {
    id: 'card',
    title: 'Cards',
    subtitle: 'Debit / Credit / RuPay',
    badges: ['Visa', 'Mastercard', 'RuPay'],
    hint: 'Secure OTP checkout',
  },
  {
    id: 'netbanking',
    title: 'Netbanking',
    subtitle: 'All major Indian banks',
    badges: ['HDFC', 'SBI', 'ICICI'],
    hint: 'Bank login',
  },
];

function formatPhoneForRazorpay(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  return phone;
}

export default function Checkout() {
  const navigate = useNavigate();
  const [item, setItem] = useState(() => getBuyNowItem());
  const [form, setForm] = useState(() => {
    try {
      const userStr = localStorage.getItem('h2r_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return { ...emptyForm, name: user.name || '', email: user.email || '', phone: user.phone || '' };
      }
    } catch {
      /* ignore */
    }
    return emptyForm;
  });
  const [payMethod, setPayMethod] = useState('upi');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const total = item ? item.price * item.qty : 0;
  const shippingFee = 0;
  const payable = total + shippingFee;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const canSubmit = useMemo(() => !!item && !submitting, [item, submitting]);
  const selectedPay = PAY_METHODS.find((m) => m.id === payMethod) || PAY_METHODS[0];

  useEffect(() => {
    const token = localStorage.getItem('h2r_token');
    if (!token) {
      navigate('/login?redirect=checkout', { replace: true });
      return;
    }
    setItem(getBuyNowItem());
  }, [navigate]);

  async function placeOrder(e) {
    e.preventDefault();
    if (!canSubmit || !item) return;
    setError('');
    setSubmitting(true);

    const payload = {
      customer: {
        name: form.name,
        phone: form.phone,
        email: form.email,
      },
      shipping: {
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
      },
      items: [
        {
          id: item.id,
          sizeId: item.sizeId,
          weightId: item.weightId || '',
          qty: item.qty,
        },
      ],
    };

    try {
      const data = await api.createRazorpayOrder(payload);

      const options = buildRazorpayOptions({
        keyId: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        orderId: data.orderId,
        razorpayOrderId: data.razorpayOrderId,
        preferredMethod: payMethod,
        customer: {
          name: form.name,
          email: form.email,
          contact: formatPhoneForRazorpay(form.phone),
        },
        productLabel: `${item.name}${item.sizeLabel ? ` · ${item.sizeLabel}` : ''}`,
        onSuccess: async (response) => {
          try {
            const verified = await api.verifyRazorpayPayment({
              orderId: data.orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            clearBuyNowItem();
            navigate(`/order/${verified.order.id || verified.order.orderId}`, {
              state: { order: verified.order, justPaid: true },
            });
          } catch (verifyErr) {
            setError(
              verifyErr.response?.data?.error ||
                'Payment received but verification failed. Contact support with your payment ID.'
            );
            setSubmitting(false);
          }
        },
        onDismiss: () => {
          setSubmitting(false);
          setError('Payment window closed. Choose a method and try again.');
        },
      });

      await openRazorpayCheckout(options);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start payment. Please try again.');
      setSubmitting(false);
    }
  }

  if (!item) {
    return (
      <main className="checkout">
        <div className="container checkout__empty">
          <h1>No product selected</h1>
          <p>Choose a bat and tap Buy now to checkout.</p>
          <Link to="/shop" className="btn btn--primary">
            Browse bats
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout">
      <div className="container checkout__layout">
        <form className="checkout__form" onSubmit={placeOrder}>
          <h1>Checkout</h1>
          <p className="checkout__lead">
            Prepaid only · Free shipping across India · Secured by Razorpay
          </p>
          <p className="checkout__policy-note">
            By placing this order you agree to our{' '}
            <Link to="/policies/terms">Terms &amp; Policies</Link>
            {' '}(no refund · no COD · 6 months handle warranty).
          </p>

          {error && <div className="checkout__error">{error}</div>}

          <section className="checkout__section">
            <h2>1. Contact</h2>
            <div className="checkout__grid2">
              <label>
                Full name *
                <input required value={form.name} onChange={set('name')} />
              </label>
              <label>
                Phone *
                <input required inputMode="tel" value={form.phone} onChange={set('phone')} />
              </label>
            </div>
            <label>
              Email *
              <input required type="email" value={form.email} onChange={set('email')} />
            </label>
          </section>

          <section className="checkout__section">
            <h2>2. Shipping</h2>
            <label>
              Address line 1 *
              <input required value={form.addressLine1} onChange={set('addressLine1')} />
            </label>
            <label>
              Address line 2
              <input value={form.addressLine2} onChange={set('addressLine2')} />
            </label>
            <div className="checkout__grid2">
              <label>
                City *
                <input required value={form.city} onChange={set('city')} />
              </label>
              <label>
                PIN code *
                <input
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pincode}
                  onChange={set('pincode')}
                />
              </label>
            </div>
            <label>
              State *
              <select required value={form.state} onChange={set('state')}>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="checkout__section checkout__section--pay">
            <div className="pay-head">
              <h2>3. Payment</h2>
              <span className="pay-head__secure">Secured by Razorpay</span>
            </div>

            <div className="pay-method-grid" role="radiogroup" aria-label="Payment method">
              {PAY_METHODS.map((method) => {
                const active = payMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`pay-method${active ? ' is-active' : ''}${method.id === 'upi' ? ' pay-method--upi' : ''}`}
                    onClick={() => setPayMethod(method.id)}
                  >
                    <span className="pay-method__top">
                      <span className="pay-method__icon" aria-hidden>
                        {method.id === 'upi' ? '⬡' : method.id === 'card' ? '▭' : '☰'}
                      </span>
                      <span className="pay-method__titles">
                        <strong>{method.title}</strong>
                        <small>{method.subtitle}</small>
                      </span>
                      {method.id === 'upi' && <em className="pay-method__tag">Best</em>}
                    </span>
                    <span className="pay-method__badges">
                      {method.badges.map((b) => (
                        <span key={b}>{b}</span>
                      ))}
                    </span>
                    <span className="pay-method__hint">{method.hint}</span>
                  </button>
                );
              })}
            </div>

            {payMethod === 'upi' && (
              <div className="pay-upi-panel">
                <div className="pay-upi-panel__visual" aria-hidden>
                  <div className="pay-upi-qr">
                    <span />
                    <span />
                    <span />
                    <span />
                    <strong>QR</strong>
                  </div>
                  <div className="pay-upi-divider">or</div>
                  <div className="pay-upi-id">
                    <strong>UPI ID</strong>
                    <span>name@oksbi · name@ybl</span>
                  </div>
                </div>
                <p>
                  Opens Razorpay with <strong>UPI first</strong> (scan QR or enter UPI ID) when UPI is
                  enabled on your Razorpay account.
                </p>
                <p className="pay-upi-panel__note">
                  Test mode tip: if you only see Cards / Netbanking / Wallet, enable <strong>UPI</strong> in
                  Razorpay Dashboard → Payment Methods (or use a live key after KYC). Test cards still work now.
                </p>
              </div>
            )}

            {payMethod !== 'upi' && (
              <div className="pay-other-panel">
                <p>
                  Continues on Razorpay’s secure checkout for <strong>{selectedPay.title}</strong>. OTP /
                  bank login stays on Razorpay — we never store card numbers.
                </p>
              </div>
            )}
          </section>

          <button type="submit" className="btn btn--primary btn--full pay-cta" disabled={!canSubmit}>
            {submitting
              ? `Opening ${selectedPay.title}…`
              : payMethod === 'upi'
                ? `Pay ${formatINR(payable)} with UPI`
                : `Pay ${formatINR(payable)} with ${selectedPay.title}`}
          </button>
        </form>

        <aside className="checkout__summary checkout__summary--elevated">
          <h2>Order summary</h2>
          <ul>
            <li key={item.key}>
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.sizeLabel}
                  {item.weightLabel ? ` · ${item.weightLabel}` : ''} × {item.qty}
                </span>
              </div>
              <span>{formatINR(item.price * item.qty)}</span>
            </li>
          </ul>
          <div className="checkout__totals">
            <div>
              <span>Subtotal</span>
              <span>{formatINR(total)}</span>
            </div>
            <div>
              <span>Shipping</span>
              <span>FREE</span>
            </div>
            <div className="checkout__payable">
              <span>Total</span>
              <strong>{formatINR(payable)}</strong>
            </div>
          </div>
          <div className="pay-summary-method">
            <span>Paying via</span>
            <strong>{selectedPay.title}</strong>
          </div>
        </aside>
      </div>
    </main>
  );
}
