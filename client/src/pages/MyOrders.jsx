import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { api as storeApi } from '../api/store';
import { formatINR, INDIAN_STATES } from '../utils/india';
import {
  STATUS_STAGES,
  getStageIndex,
  getStatusLabel,
  getStatusStyle,
  formatStatusDate,
} from '../utils/orderStatus';

const TABS = [
  {
    id: 'orders',
    label: 'Your Orders',
    hint: 'Track & manage',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: 'buy-again',
    label: 'Buy Again',
    hint: 'Reorder bats',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    ),
  },
  {
    id: 'account',
    label: 'Account',
    hint: 'Profile & addresses',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
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

export default function MyOrders() {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [trackingId, setTrackingId] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [addressSaving, setAddressSaving] = useState(false);
  const [toast, setToast] = useState('');

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'account' || tab === 'buy-again' || tab === 'orders') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const selectTab = (id) => {
    setActiveTab(id);
    setSearchParams(id === 'orders' ? {} : { tab: id }, { replace: true });
  };

  const firstName = profile?.name?.split(' ')[0] || 'Player';
  const orderCount = orders.length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  const buyAgainItems = useMemo(() => {
    const unique = [];
    const seen = new Set();
    for (const order of orders) {
      for (const item of order.items || []) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          unique.push(item);
        }
      }
    }
    return unique;
  }, [orders]);

  useEffect(() => {
    const token = localStorage.getItem('h2r_token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [profileRes, ordersRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/orders/my-orders'),
        ]);
        setProfile(profileRes.data);
        setProfileForm({
          name: profileRes.data.name || '',
          phone: profileRes.data.phone || '',
        });
        setAddresses(profileRes.data.addresses || []);
        setOrders(ordersRes.data.orders || []);
      } catch (err) {
        if (err.message?.includes('401')) {
          localStorage.removeItem('h2r_token');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const flash = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };

  const handleLogout = () => {
    localStorage.removeItem('h2r_token');
    localStorage.removeItem('h2r_user');
    navigate('/login');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileUpdating(true);
    try {
      const res = await api.put('/auth/profile', profileForm);
      setProfile(res.data);
      setAddresses(res.data.addresses || addresses);
      const user = JSON.parse(localStorage.getItem('h2r_user') || '{}');
      localStorage.setItem(
        'h2r_user',
        JSON.stringify({ ...user, name: res.data.name, phone: res.data.phone })
      );
      setIsEditingProfile(false);
      flash('Profile updated');
    } catch {
      flash('Could not update profile');
    } finally {
      setProfileUpdating(false);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setAddressSaving(true);
    try {
      const data = await storeApi.addAddress({
        ...addressForm,
        name: addressForm.name || profile?.name || '',
        phone: addressForm.phone || profile?.phone || '',
        isDefault: addresses.length === 0 || addressForm.isDefault,
      });
      setAddresses(data.addresses || []);
      setShowAddressForm(false);
      setAddressForm(emptyAddress);
      flash('Address saved');
    } catch (err) {
      flash(err.response?.data?.error || 'Could not save address');
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Remove this address?')) return;
    try {
      const data = await storeApi.deleteAddress(id);
      setAddresses(data.addresses || []);
      flash('Address removed');
    } catch {
      flash('Could not remove address');
    }
  };

  const getEffectiveStageIndex = (order) => {
    if (order.status === 'cancelled') return -1;
    return getStageIndex(order.status);
  };

  if (loading) {
    return (
      <main className="acct">
        <div className="acct-loading">
          <div className="acct-loading__spinner" />
          <p>Loading your account…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="acct">
      {toast ? <div className="acct-toast">{toast}</div> : null}

      <section className="acct-hero">
        <div className="acct-hero__inner container">
          <div className="acct-hero__user">
            <div className="acct-avatar" aria-hidden="true">
              {(profile?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="acct-hero__eyebrow">H2R Sports account</p>
              <h1>Hello, {firstName}</h1>
              <p className="acct-hero__meta">
                {profile?.phone ? `+91 ${profile.phone}` : profile?.email || 'Member'}
              </p>
            </div>
          </div>
          <div className="acct-stats">
            <div className="acct-stat">
              <strong>{orderCount}</strong>
              <span>Orders</span>
            </div>
            <div className="acct-stat">
              <strong>{deliveredCount}</strong>
              <span>Delivered</span>
            </div>
            <div className="acct-stat">
              <strong>{addresses.length}</strong>
              <span>Addresses</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container acct-body">
        <nav className="acct-tiles" aria-label="Account sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`acct-tile${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => selectTab(tab.id)}
            >
              <span className="acct-tile__icon">{tab.icon}</span>
              <span className="acct-tile__text">
                <strong>{tab.label}</strong>
                <small>{tab.hint}</small>
              </span>
              <span className="acct-tile__chev" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </nav>

        {activeTab === 'orders' && (
          <section className="acct-panel tab-content">
            <header className="acct-panel__head">
              <div>
                <h2>Your Orders</h2>
                <p>Track packages and view past purchases</p>
              </div>
              <button type="button" className="acct-link-btn" onClick={() => navigate('/shop')}>
                Shop bats
              </button>
            </header>

            {orders.length === 0 ? (
              <div className="acct-empty">
                <h3>No orders yet</h3>
                <p>When you buy a bat, it will show up here with live tracking.</p>
                <button type="button" className="btn btn--primary" onClick={() => navigate('/shop')}>
                  Browse collection
                </button>
              </div>
            ) : (
              <div className="acct-orders">
                {orders.map((order) => {
                  const open = expandedId === order.orderId;
                  const statusStyle = getStatusStyle(order.status);
                  return (
                    <article key={order.orderId} className={`acct-order${open ? ' is-open' : ''}`}>
                      <button
                        type="button"
                        className="acct-order__summary"
                        onClick={() => {
                          setExpandedId(open ? null : order.orderId);
                          setTrackingId(null);
                        }}
                      >
                        <div className="acct-order__main">
                          <span className="acct-order__id">
                            #{String(order.orderId).slice(0, 8).toUpperCase()}
                          </span>
                          <span className="acct-order__date">
                            Placed{' '}
                            {new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="acct-order__items">
                            {(order.items || []).map((i) => i.name).slice(0, 2).join(' · ')}
                            {(order.items || []).length > 2 ? '…' : ''}
                          </span>
                        </div>
                        <div className="acct-order__side">
                          <strong>{formatINR(order.total)}</strong>
                          <span
                            className="acct-badge"
                            style={{
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              borderColor: statusStyle.border,
                            }}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                          <span className={`acct-order__chev${open ? ' is-open' : ''}`}>▾</span>
                        </div>
                      </button>

                      {open && (
                        <div className="acct-order__body">
                          <div className="acct-order__grid">
                            <div>
                              <h4>Items</h4>
                              {(order.items || []).map((item) => (
                                <div key={`${item.id}-${item.sizeId}`} className="acct-line">
                                  <div>
                                    <strong>{item.name}</strong>
                                    <span>
                                      {item.sizeLabel}
                                      {item.weightLabel ? ` · ${item.weightLabel}` : ''} · Qty {item.qty}
                                    </span>
                                  </div>
                                  <b>{formatINR(item.lineTotal)}</b>
                                </div>
                              ))}

                              <h4 className="acct-mt">Delivery address</h4>
                              <div className="acct-ship">
                                <strong>{order.shipping?.name || profile?.name}</strong>
                                <p>
                                  {order.shipping?.addressLine1}
                                  {order.shipping?.addressLine2 ? `, ${order.shipping.addressLine2}` : ''}
                                  <br />
                                  {order.shipping?.city}, {order.shipping?.state} — {order.shipping?.pincode}
                                </p>
                              </div>
                            </div>

                            <aside className="acct-summary-card">
                              <h4>Price details</h4>
                              <div className="acct-price-row">
                                <span>Subtotal</span>
                                <span>{formatINR(order.subtotal)}</span>
                              </div>
                              <div className="acct-price-row">
                                <span>Shipping</span>
                                <span>{order.shippingFee === 0 ? 'FREE' : formatINR(order.shippingFee)}</span>
                              </div>
                              <div className="acct-price-row is-total">
                                <span>Total</span>
                                <strong>{formatINR(order.total)}</strong>
                              </div>
                              {order.status !== 'cancelled' && trackingId !== order.orderId && (
                                <button
                                  type="button"
                                  className="btn btn--primary btn--full"
                                  onClick={() => setTrackingId(order.orderId)}
                                >
                                  Track package
                                </button>
                              )}
                            </aside>
                          </div>

                          {trackingId === order.orderId && order.status !== 'cancelled' && (
                            <div className="acct-track">
                              <div className="acct-track__head">
                                <h4>Live tracking</h4>
                                <button type="button" className="acct-link-btn" onClick={() => setTrackingId(null)}>
                                  Hide
                                </button>
                              </div>
                              <ol className="acct-timeline">
                                {STATUS_STAGES.map((stage, index) => {
                                  const effectiveIndex = getEffectiveStageIndex(order);
                                  const isCompleted = index <= effectiveIndex;
                                  const isLast = index === STATUS_STAGES.length - 1;
                                  const stageDate =
                                    order.statusTimestamps?.[`${stage.id}At`] ||
                                    (stage.id === 'ordered' ? order.statusTimestamps?.confirmedAt : null) ||
                                    (stage.id === 'accepted' ? order.statusTimestamps?.paidAt : null);
                                  return (
                                    <li
                                      key={stage.id}
                                      className={`acct-timeline__item${isCompleted ? ' is-done' : ''}`}
                                    >
                                      {!isLast && <span className="acct-timeline__line" />}
                                      <span className="acct-timeline__dot">{isCompleted ? '✓' : ''}</span>
                                      <div>
                                        <strong>{stage.label}</strong>
                                        <p>{stage.description}</p>
                                        {stageDate && isCompleted ? (
                                          <small>{formatStatusDate(stageDate)}</small>
                                        ) : null}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ol>
                              {order.courier?.trackingId && (
                                <div className="acct-courier">
                                  <strong>{order.courier.name || 'Courier'}</strong>
                                  <p>Tracking ID: {order.courier.trackingId}</p>
                                  {order.courier.trackingUrl ? (
                                    <a href={order.courier.trackingUrl} target="_blank" rel="noreferrer">
                                      Track shipment →
                                    </a>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'buy-again' && (
          <section className="acct-panel tab-content">
            <header className="acct-panel__head">
              <div>
                <h2>Buy again</h2>
                <p>Quick reorder from bats you’ve purchased</p>
              </div>
            </header>

            {buyAgainItems.length === 0 ? (
              <div className="acct-empty">
                <h3>Nothing to reorder yet</h3>
                <p>Your purchased bats will appear here for one-tap revisit.</p>
                <button type="button" className="btn btn--primary" onClick={() => navigate('/shop')}>
                  Start shopping
                </button>
              </div>
            ) : (
              <div className="acct-again">
                {buyAgainItems.map((item) => (
                  <article key={item.id} className="acct-again__card">
                    <div className="acct-again__visual" aria-hidden="true">
                      <span>{(item.name || 'B').charAt(0)}</span>
                    </div>
                    <h3>{item.name}</h3>
                    <p className="acct-again__price">{formatINR(item.price)}</p>
                    <button
                      type="button"
                      className="acct-again__cta"
                      onClick={() => navigate(`/shop/${item.id}`)}
                    >
                      View item
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'account' && (
          <section className="acct-panel tab-content">
            <header className="acct-panel__head">
              <div>
                <h2>Account settings</h2>
                <p>Personal details and saved delivery addresses</p>
              </div>
              {!isEditingProfile && (
                <button type="button" className="acct-link-btn" onClick={() => setIsEditingProfile(true)}>
                  Edit profile
                </button>
              )}
            </header>

            <div className="acct-card">
              <h3>Personal info</h3>
              {isEditingProfile ? (
                <form className="acct-form" onSubmit={handleProfileSubmit}>
                  <label>
                    Full name
                    <input
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      inputMode="numeric"
                      maxLength={10}
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                        })
                      }
                      placeholder="10-digit mobile"
                    />
                  </label>
                  <label>
                    Email
                    <input value={profile?.email || ''} disabled />
                  </label>
                  <div className="acct-form__actions">
                    <button type="button" className="btn btn--ghost" onClick={() => setIsEditingProfile(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn--primary" disabled={profileUpdating}>
                      {profileUpdating ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <dl className="acct-dl">
                  <div>
                    <dt>Full name</dt>
                    <dd>{profile?.name}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>{profile?.phone ? `+91 ${profile.phone}` : 'Not added'}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd className="acct-dl__email">{profile?.email}</dd>
                  </div>
                </dl>
              )}
            </div>

            <div className="acct-card">
              <div className="acct-card__row">
                <div>
                  <h3>Saved addresses</h3>
                  <p>Used at checkout for faster delivery</p>
                </div>
                <button
                  type="button"
                  className="acct-link-btn"
                  onClick={() => {
                    setShowAddressForm(true);
                    setAddressForm({
                      ...emptyAddress,
                      name: profile?.name || '',
                      phone: profile?.phone || '',
                      isDefault: addresses.length === 0,
                    });
                  }}
                >
                  + Add address
                </button>
              </div>

              {addresses.length === 0 && !showAddressForm ? (
                <p className="acct-muted">No saved addresses yet. Add one for quicker checkout.</p>
              ) : (
                <div className="acct-address-list">
                  {addresses.map((a) => (
                    <div key={a.id} className={`acct-address${a.isDefault ? ' is-default' : ''}`}>
                      <div className="acct-address__head">
                        <strong>{a.name}</strong>
                        <em>{a.label}</em>
                        {a.isDefault ? <span className="acct-chip">Default</span> : null}
                      </div>
                      <p>
                        {a.addressLine1}
                        {a.addressLine2 ? `, ${a.addressLine2}` : ''}
                        <br />
                        {a.city}, {a.state} — {a.pincode}
                        <br />
                        Phone: {a.phone}
                      </p>
                      <button type="button" className="acct-danger" onClick={() => handleDeleteAddress(a.id)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showAddressForm && (
                <form className="acct-form acct-form--address" onSubmit={handleSaveAddress}>
                  <div className="acct-form__grid">
                    <label>
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
                    <label>
                      Name
                      <input
                        required
                        value={addressForm.name}
                        onChange={(e) => setAddressForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </label>
                  </div>
                  <label>
                    Phone
                    <input
                      required
                      inputMode="numeric"
                      maxLength={10}
                      value={addressForm.phone}
                      onChange={(e) =>
                        setAddressForm((f) => ({
                          ...f,
                          phone: e.target.value.replace(/\D/g, '').slice(0, 10),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Address line 1
                    <input
                      required
                      value={addressForm.addressLine1}
                      onChange={(e) => setAddressForm((f) => ({ ...f, addressLine1: e.target.value }))}
                    />
                  </label>
                  <label>
                    Address line 2
                    <input
                      value={addressForm.addressLine2}
                      onChange={(e) => setAddressForm((f) => ({ ...f, addressLine2: e.target.value }))}
                    />
                  </label>
                  <div className="acct-form__grid">
                    <label>
                      City
                      <input
                        required
                        value={addressForm.city}
                        onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
                      />
                    </label>
                    <label>
                      PIN
                      <input
                        required
                        inputMode="numeric"
                        maxLength={6}
                        value={addressForm.pincode}
                        onChange={(e) =>
                          setAddressForm((f) => ({
                            ...f,
                            pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label>
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
                  <label className="acct-check">
                    <input
                      type="checkbox"
                      checked={!!addressForm.isDefault || addresses.length === 0}
                      onChange={(e) => setAddressForm((f) => ({ ...f, isDefault: e.target.checked }))}
                    />
                    Make default address
                  </label>
                  <div className="acct-form__actions">
                    <button type="button" className="btn btn--ghost" onClick={() => setShowAddressForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn--primary" disabled={addressSaving}>
                      {addressSaving ? 'Saving…' : 'Save address'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <button type="button" className="acct-signout" onClick={handleLogout}>
              Sign out
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
