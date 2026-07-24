import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BRAND, formatINR, INDIAN_STATES, savePercent } from '../utils/india';
import { api } from '../api/store';
import { clearBuyNowItem, getBuyNowItem } from '../utils/checkoutItem';
import { buildRazorpayOptions, openRazorpayCheckout } from '../utils/razorpay';
import { mediaUrl } from '../config/api.js';

const STEPS = [
  { id: 'address', label: 'Address' },
  { id: 'summary', label: 'Order Summary' },
  { id: 'payment', label: 'Payment' },
];

const emptyAddress = {
  label: 'Home',
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: 'Tamil Nadu',
  pincode: '',
  isDefault: true,
};

function persistSession(userPayload) {
  localStorage.setItem('h2r_token', userPayload.token);
  localStorage.setItem(
    'h2r_user',
    JSON.stringify({
      _id: userPayload._id,
      name: userPayload.name,
      email: userPayload.email,
      phone: userPayload.phone || '',
      role: userPayload.role,
      token: userPayload.token,
    })
  );
}

function formatPhoneForRazorpay(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  return phone;
}

function Stepper({ active }) {
  const order = ['address', 'summary', 'payment'];
  const idx = order.indexOf(active);
  return (
    <ol className="ck-steps">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <li key={s.id} className={`ck-steps__item${done ? ' is-done' : ''}${current ? ' is-active' : ''}`}>
            <span className="ck-steps__dot">{done ? '✓' : i + 1}</span>
            <span className="ck-steps__label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const [item, setItem] = useState(() => getBuyNowItem());
  const [bootstrapping, setBootstrapping] = useState(true);
  const [step, setStep] = useState('phone'); // phone | register | address | summary | payment | loading
  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [payMethod, setPayMethod] = useState('upi');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const total = item ? item.price * item.qty : 0;
  const compareAt = item?.compareAt ? Number(item.compareAt) : 0;
  const discount = compareAt > total ? compareAt - total : 0;
  const savePct = savePercent(item?.price || 0, compareAt || 0);
  const shippingFee = 0;
  const payable = total + shippingFee;
  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) || addresses.find((a) => a.isDefault) || addresses[0],
    [addresses, selectedAddressId]
  );

  useEffect(() => {
    const boot = async () => {
      const buy = getBuyNowItem();
      setItem(buy);
      if (!buy) {
        setBootstrapping(false);
        return;
      }

      const token = localStorage.getItem('h2r_token');
      if (!token) {
        setStep('phone');
        setBootstrapping(false);
        return;
      }

      try {
        const me = await api.getMe();
        setUser(me);
        setPhone(me.phone || '');
        setName(me.name || '');
        const list = me.addresses || [];
        setAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        setSelectedAddressId(def?.id || '');
        setShowAddressForm(list.length === 0);
        if (list.length === 0) {
          setAddressForm((f) => ({
            ...f,
            name: me.name || '',
            phone: me.phone || '',
          }));
        }
        setStep('address');
      } catch {
        localStorage.removeItem('h2r_token');
        localStorage.removeItem('h2r_user');
        setStep('phone');
      } finally {
        setBootstrapping(false);
      }
    };
    boot();
  }, []);

  async function handlePhoneContinue(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const check = await api.phoneCheck(phone);
      if (!check.exists) {
        setStep('register');
        setSubmitting(false);
        return;
      }
      const data = await api.phoneContinue({ phone: check.phone });
      persistSession(data);
      setUser(data);
      setAddresses(data.addresses || []);
      const def = (data.addresses || []).find((a) => a.isDefault) || data.addresses?.[0];
      setSelectedAddressId(def?.id || '');
      setShowAddressForm(!(data.addresses || []).length);
      if (!(data.addresses || []).length) {
        setAddressForm((f) => ({ ...f, name: data.name || '', phone: data.phone || phone }));
      }
      setStep('address');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not continue');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api.phoneContinue({ phone, name });
      persistSession(data);
      setUser(data);
      setAddresses([]);
      setShowAddressForm(true);
      setAddressForm((f) => ({ ...f, name: data.name || name, phone: data.phone || phone }));
      setStep('address');
    } catch (err) {
      if (err.response?.data?.needName) setStep('register');
      setError(err.response?.data?.error || err.message || 'Could not create account');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveAddress(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api.addAddress({
        ...addressForm,
        phone: addressForm.phone || phone || user?.phone,
        name: addressForm.name || name || user?.name,
        isDefault: addresses.length === 0 || addressForm.isDefault,
      });
      setAddresses(data.addresses || []);
      const newest = data.addresses?.[data.addresses.length - 1];
      const def = data.addresses?.find((a) => a.isDefault) || newest;
      setSelectedAddressId(def?.id || '');
      setShowAddressForm(false);
      setAddressForm(emptyAddress);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not save address');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteAddress(id) {
    if (!window.confirm('Remove this address?')) return;
    try {
      const data = await api.deleteAddress(id);
      setAddresses(data.addresses || []);
      const def = data.addresses?.find((a) => a.isDefault) || data.addresses?.[0];
      setSelectedAddressId(def?.id || '');
      if (!(data.addresses || []).length) setShowAddressForm(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete address');
    }
  }

  function goSummary() {
    if (!selectedAddress) {
      setError('Add or select a delivery address to continue');
      setShowAddressForm(true);
      return;
    }
    setError('');
    setStep('summary');
  }

  async function startPayment() {
    if (!item || !selectedAddress || !user) return;
    setError('');
    setStep('loading');
    setSubmitting(true);

    const payload = {
      customer: {
        name: selectedAddress.name || user.name,
        phone: selectedAddress.phone || user.phone,
        email: user.email,
      },
      shipping: {
        addressLine1: selectedAddress.addressLine1,
        addressLine2: selectedAddress.addressLine2 || '',
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
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
      setStep('payment');

      const options = buildRazorpayOptions({
        keyId: data.keyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        orderId: data.orderId,
        razorpayOrderId: data.razorpayOrderId,
        preferredMethod: payMethod,
        customer: {
          name: selectedAddress.name || user.name,
          email: user.email,
          contact: formatPhoneForRazorpay(selectedAddress.phone || user.phone),
        },
        productLabel: `${item.name}${item.sizeLabel ? ` · ${item.sizeLabel}` : ''}`,
        onSuccess: async (response) => {
          setStep('loading');
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
            setStep('summary');
            setSubmitting(false);
          }
        },
        onDismiss: () => {
          setSubmitting(false);
          setStep('summary');
          setError('Payment not completed — no order was placed. You can try again anytime.');
        },
      });

      await openRazorpayCheckout(options);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start payment. Please try again.');
      setStep('summary');
      setSubmitting(false);
    }
  }

  if (bootstrapping) {
    return (
      <main className="ck-flow">
        <div className="ck-loading">
          <div className="ck-loading__spinner" />
          <p>Preparing checkout…</p>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="ck-flow">
        <div className="ck-empty">
          <h1>No product selected</h1>
          <p>Choose a bat and tap Buy now to checkout.</p>
          <Link to="/shop" className="ck-btn ck-btn--primary">
            Browse bats
          </Link>
        </div>
      </main>
    );
  }

  const stepperActive = step === 'phone' || step === 'register' ? 'address' : step === 'loading' ? 'payment' : step;

  return (
    <main className="ck-flow">
      <header className="ck-top">
        <button type="button" className="ck-top__back" onClick={() => navigate(-1)} aria-label="Back">
          ←
        </button>
        <div className="ck-top__brand">
          <img src={BRAND.logo} alt="" width="28" height="28" />
          <strong>{BRAND.name}</strong>
        </div>
      </header>

      {(step === 'address' || step === 'summary' || step === 'payment') && <Stepper active={stepperActive} />}

      {error && <div className="ck-error">{error}</div>}

      {step === 'phone' && (
        <form className="ck-card ck-card--narrow" onSubmit={handlePhoneContinue}>
          <h1>Enter mobile number</h1>
          <p className="ck-lead">We’ll use this to find or create your H2R account.</p>
          <label className="ck-field">
            Mobile number
            <div className="ck-phone">
              <span>+91</span>
              <input
                required
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
              />
            </div>
          </label>
          <button type="submit" className="ck-btn ck-btn--primary ck-btn--block" disabled={submitting || phone.length !== 10}>
            {submitting ? 'Please wait…' : 'Continue'}
          </button>
        </form>
      )}

      {step === 'register' && (
        <form className="ck-card ck-card--narrow" onSubmit={handleRegister}>
          <h1>Create your account</h1>
          <p className="ck-lead">New number +91 {phone}. Just your name to continue.</p>
          <label className="ck-field">
            Full name
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </label>
          <button type="submit" className="ck-btn ck-btn--primary ck-btn--block" disabled={submitting || name.trim().length < 2}>
            {submitting ? 'Creating…' : 'Continue'}
          </button>
          <button type="button" className="ck-link" onClick={() => setStep('phone')}>
            Change number
          </button>
        </form>
      )}

      {step === 'address' && (
        <div className="ck-stack">
          <div className="ck-card">
            <div className="ck-card__row">
              <h2>Deliver to</h2>
              <button
                type="button"
                className="ck-link"
                onClick={() => {
                  setShowAddressForm(true);
                  setAddressForm({
                    ...emptyAddress,
                    name: user?.name || name || '',
                    phone: user?.phone || phone || '',
                    isDefault: addresses.length === 0,
                  });
                }}
              >
                + Add new
              </button>
            </div>

            {addresses.length > 0 && !showAddressForm && (
              <div className="ck-address-list">
                {addresses.map((a) => (
                  <label key={a.id} className={`ck-address${selectedAddressId === a.id ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id)}
                    />
                    <div>
                      <div className="ck-address__head">
                        <strong>{a.name}</strong>
                        <em>{a.label}</em>
                      </div>
                      <p>
                        {a.addressLine1}
                        {a.addressLine2 ? `, ${a.addressLine2}` : ''}
                        <br />
                        {a.city}, {a.state} — {a.pincode}
                        <br />
                        Phone: {a.phone}
                      </p>
                      <button type="button" className="ck-link ck-link--danger" onClick={() => handleDeleteAddress(a.id)}>
                        Remove
                      </button>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {(showAddressForm || addresses.length === 0) && (
              <form className="ck-address-form" onSubmit={handleSaveAddress}>
                <h3>{addresses.length ? 'New address' : 'Add delivery address'}</h3>
                <div className="ck-grid2">
                  <label className="ck-field">
                    Label
                    <select
                      value={addressForm.label}
                      onChange={(e) => setAddressForm((f) => ({ ...f, label: e.target.value }))}
                    >
                      <option>Home</option>
                      <option>Work</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <label className="ck-field">
                    Full name
                    <input
                      required
                      value={addressForm.name}
                      onChange={(e) => setAddressForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </label>
                </div>
                <label className="ck-field">
                  Phone
                  <input
                    required
                    inputMode="numeric"
                    maxLength={10}
                    value={addressForm.phone}
                    onChange={(e) =>
                      setAddressForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))
                    }
                  />
                </label>
                <label className="ck-field">
                  Address line 1
                  <input
                    required
                    value={addressForm.addressLine1}
                    onChange={(e) => setAddressForm((f) => ({ ...f, addressLine1: e.target.value }))}
                  />
                </label>
                <label className="ck-field">
                  Address line 2
                  <input
                    value={addressForm.addressLine2}
                    onChange={(e) => setAddressForm((f) => ({ ...f, addressLine2: e.target.value }))}
                  />
                </label>
                <div className="ck-grid2">
                  <label className="ck-field">
                    City
                    <input
                      required
                      value={addressForm.city}
                      onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
                    />
                  </label>
                  <label className="ck-field">
                    PIN code
                    <input
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={addressForm.pincode}
                      onChange={(e) =>
                        setAddressForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))
                      }
                    />
                  </label>
                </div>
                <label className="ck-field">
                  State
                  <select
                    required
                    value={addressForm.state}
                    onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))}
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ck-check">
                  <input
                    type="checkbox"
                    checked={!!addressForm.isDefault || addresses.length === 0}
                    onChange={(e) => setAddressForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  />
                  Make default address
                </label>
                <div className="ck-form-actions">
                  {addresses.length > 0 && (
                    <button type="button" className="ck-btn ck-btn--ghost" onClick={() => setShowAddressForm(false)}>
                      Cancel
                    </button>
                  )}
                  <button type="submit" className="ck-btn ck-btn--primary" disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save address'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="ck-footbar">
            <div>
              <span className="ck-footbar__mrp">{compareAt > total ? formatINR(compareAt) : ''}</span>
              <strong>{formatINR(payable)}</strong>
            </div>
            <button type="button" className="ck-btn ck-btn--cta" onClick={goSummary} disabled={!selectedAddress}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'summary' && selectedAddress && (
        <div className="ck-stack">
          <div className="ck-card">
            <div className="ck-card__row">
              <h2>Deliver to</h2>
              <button type="button" className="ck-link" onClick={() => setStep('address')}>
                Change
              </button>
            </div>
            <div className="ck-address is-selected ck-address--static">
              <div>
                <div className="ck-address__head">
                  <strong>{selectedAddress.name}</strong>
                  <em>{selectedAddress.label}</em>
                </div>
                <p>
                  {selectedAddress.addressLine1}
                  {selectedAddress.addressLine2 ? `, ${selectedAddress.addressLine2}` : ''}
                  <br />
                  {selectedAddress.city}, {selectedAddress.state} — {selectedAddress.pincode}
                  <br />
                  Phone: {selectedAddress.phone}
                </p>
              </div>
            </div>
          </div>

          <div className="ck-card ck-product">
            {savePct ? <span className="ck-product__deal">Hot Deal</span> : null}
            <div className="ck-product__row">
              <img src={mediaUrl(item.image) || '/products/placeholders/front.svg'} alt="" />
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.sizeLabel}
                  {item.weightLabel ? ` · ${item.weightLabel}` : ''}
                </span>
                <span>Qty: {item.qty}</span>
                <div className="ck-product__price">
                  {savePct ? <em>↓{savePct}%</em> : null}
                  {compareAt > total ? <s>{formatINR(compareAt)}</s> : null}
                  <b>{formatINR(total)}</b>
                </div>
              </div>
            </div>
          </div>

          <div className="ck-card">
            <h2>Price Details</h2>
            <div className="ck-price-box">
              <div>
                <span>MRP {compareAt > total ? '(incl. of all taxes)' : ''}</span>
                <span>{formatINR(compareAt > total ? compareAt : total)}</span>
              </div>
              {discount > 0 && (
                <div className="is-save">
                  <span>Discounts</span>
                  <span>− {formatINR(discount)}</span>
                </div>
              )}
              <div>
                <span>Shipping</span>
                <span>FREE</span>
              </div>
              <div className="ck-price-box__total">
                <span>Total Amount</span>
                <strong>{formatINR(payable)}</strong>
              </div>
            </div>
            {discount > 0 && (
              <div className="ck-save-banner">You’ll save {formatINR(discount)} on this order!</div>
            )}
          </div>

          <div className="ck-card">
            <h2>Payment method</h2>
            <div className="ck-pay-options">
              {[
                { id: 'upi', label: 'UPI', hint: 'QR / UPI ID' },
                { id: 'card', label: 'Cards', hint: 'Debit / Credit' },
                { id: 'netbanking', label: 'Netbanking', hint: 'Banks & wallets' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`ck-pay-opt${payMethod === m.id ? ' is-active' : ''}`}
                  onClick={() => setPayMethod(m.id)}
                >
                  <strong>{m.label}</strong>
                  <small>{m.hint}</small>
                </button>
              ))}
            </div>
          </div>

          <p className="ck-legal">
            By continuing you agree to our <Link to="/policies/terms">Terms</Link>. Prepaid only · No COD · Free
            shipping.
          </p>

          <div className="ck-footbar">
            <div>
              {compareAt > total ? <span className="ck-footbar__mrp">{formatINR(compareAt)}</span> : null}
              <strong>{formatINR(payable)}</strong>
            </div>
            <button type="button" className="ck-btn ck-btn--cta" onClick={startPayment} disabled={submitting}>
              Continue
            </button>
          </div>
        </div>
      )}

      {(step === 'loading' || step === 'payment') && (
        <div className="ck-loading">
          <div className="ck-loading__spinner" />
          <p>{step === 'payment' ? 'Complete payment in the Razorpay window…' : 'Securing your payment…'}</p>
          <small>Do not refresh or press back</small>
        </div>
      )}
    </main>
  );
}
