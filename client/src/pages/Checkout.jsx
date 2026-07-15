import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { BRAND, formatINR, INDIAN_STATES } from '../utils/india';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: 'Tamil Nadu',
  pincode: '',
  paymentMethod: 'cod',
  upiId: '',
  cardName: '',
  cardNumber: '',
  cardExpiry: '',
  cardCvv: '',
};

export default function Checkout() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const shippingFee = 0;
  const payable = total + shippingFee;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const canSubmit = useMemo(() => items.length > 0 && !submitting, [items.length, submitting]);

  async function placeOrder(e) {
    e.preventDefault();
    if (!canSubmit) return;
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
      items: items.map((i) => ({
        id: i.id,
        sizeId: i.sizeId,
        qty: i.qty,
      })),
      paymentMethod: form.paymentMethod,
      paymentMeta:
        form.paymentMethod === 'upi'
          ? { upiId: form.upiId }
          : form.paymentMethod === 'card'
            ? {
                cardName: form.cardName,
                cardLast4: form.cardNumber.replace(/\s/g, '').slice(-4),
              }
            : {},
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order failed');
      clear();
      navigate(`/order/${data.order.id}`, { state: { order: data.order } });
    } catch (err) {
      setError(err.message || 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="checkout">
        <div className="container checkout__empty">
          <h1>Your bag is empty</h1>
          <p>Add a bat before checkout.</p>
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
            Complete your details — {BRAND.name} ships all over India.
          </p>

          {error && <div className="checkout__error">{error}</div>}

          <section className="checkout__section">
            <h2>1. Contact</h2>
            <div className="checkout__grid2">
              <label>
                Full name *
                <input required value={form.name} onChange={set('name')} placeholder="As on package" />
              </label>
              <label>
                Mobile *
                <input
                  required
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="10-digit mobile"
                />
              </label>
            </div>
            <label>
              Email *
              <input
                required
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="for order updates"
              />
            </label>
          </section>

          <section className="checkout__section">
            <h2>2. Shipping address</h2>
            <label>
              Address line 1 *
              <input
                required
                value={form.addressLine1}
                onChange={set('addressLine1')}
                placeholder="House / street"
              />
            </label>
            <label>
              Address line 2
              <input
                value={form.addressLine2}
                onChange={set('addressLine2')}
                placeholder="Landmark (optional)"
              />
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

          <section className="checkout__section">
            <h2>3. Payment</h2>
            <div className="pay-options">
              {[
                { id: 'cod', label: 'Cash on Delivery', hint: 'Pay when bat arrives' },
                { id: 'upi', label: 'UPI', hint: 'GPay / PhonePe / Paytm' },
                { id: 'card', label: 'Debit / Credit Card', hint: 'Demo card checkout' },
              ].map((opt) => (
                <label key={opt.id} className={`pay-option${form.paymentMethod === opt.id ? ' pay-option--active' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value={opt.id}
                    checked={form.paymentMethod === opt.id}
                    onChange={set('paymentMethod')}
                  />
                  <span>
                    <strong>{opt.label}</strong>
                    <small>{opt.hint}</small>
                  </span>
                </label>
              ))}
            </div>

            {form.paymentMethod === 'upi' && (
              <label>
                UPI ID *
                <input
                  required
                  value={form.upiId}
                  onChange={set('upiId')}
                  placeholder="name@upi"
                />
              </label>
            )}

            {form.paymentMethod === 'card' && (
              <div className="card-fields">
                <label>
                  Name on card *
                  <input required value={form.cardName} onChange={set('cardName')} />
                </label>
                <label>
                  Card number *
                  <input
                    required
                    inputMode="numeric"
                    maxLength={19}
                    value={form.cardNumber}
                    onChange={set('cardNumber')}
                    placeholder="XXXX XXXX XXXX XXXX"
                  />
                </label>
                <div className="checkout__grid2">
                  <label>
                    Expiry *
                    <input
                      required
                      value={form.cardExpiry}
                      onChange={set('cardExpiry')}
                      placeholder="MM/YY"
                    />
                  </label>
                  <label>
                    CVV *
                    <input
                      required
                      inputMode="numeric"
                      maxLength={4}
                      value={form.cardCvv}
                      onChange={set('cardCvv')}
                      placeholder="***"
                    />
                  </label>
                </div>
                <p className="checkout__note">
                  Demo mode — card is not charged to a live gateway yet (Razorpay can be connected later).
                </p>
              </div>
            )}
          </section>

          <button type="submit" className="btn btn--primary btn--full" disabled={!canSubmit}>
            {submitting
              ? 'Placing order…'
              : form.paymentMethod === 'cod'
                ? `Place COD order — ${formatINR(payable)}`
                : `Pay ${formatINR(payable)} & place order`}
          </button>
        </form>

        <aside className="checkout__summary">
          <h2>Order summary</h2>
          <ul>
            {items.map((item) => (
              <li key={item.key}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {item.sizeLabel} × {item.qty}
                  </span>
                </div>
                <span>{formatINR(item.price * item.qty)}</span>
              </li>
            ))}
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
              <span>Total (incl. GST)</span>
              <strong>{formatINR(payable)}</strong>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
