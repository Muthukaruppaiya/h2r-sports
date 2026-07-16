import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  STATUS_STAGES,
  getStageIndex,
  getStatusLabel,
  getStatusStyle,
  formatStatusDate,
} from '../utils/orderStatus';

export default function MyOrders() {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'buy-again', 'account'

  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [profileUpdating, setProfileUpdating] = useState(false);

  // Orders UI state
  const [expandedId, setExpandedId] = useState(null);
  const [trackingId, setTrackingId] = useState(null);

  const navigate = useNavigate();

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
          api.get('/orders/my-orders')
        ]);
        
        setProfile(profileRes.data);
        setProfileForm({ name: profileRes.data.name || '', phone: profileRes.data.phone || '' });
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
      // Update local storage user just in case
      const user = JSON.parse(localStorage.getItem('h2r_user') || '{}');
      localStorage.setItem('h2r_user', JSON.stringify({ ...user, name: res.data.name }));
      setIsEditingProfile(false);
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setProfileUpdating(false);
    }
  };

  const getEffectiveStageIndex = (order) => {
    if (order.status === 'cancelled') return -1;
    if (order.paymentMethod === 'cod' && order.status === 'confirmed' && order.paymentStatus === 'pending_cod') {
      return 1;
    }
    return getStageIndex(order.status);
  };

  if (loading) return <div style={{ padding: 'var(--header-offset) 1rem 4rem', textAlign: 'center', color: 'var(--gray-400)' }}>Loading your account...</div>;

  return (
    <div className="container" style={{ paddingTop: 'calc(var(--header-offset) + 2rem)', paddingBottom: '4rem', maxWidth: '900px', margin: '0 auto', minHeight: '60vh' }}>
      
      {/* Amazon-Style Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--navy) 0%, #1e3a8a 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--navy)', fontWeight: '700', letterSpacing: '-0.02em' }}>
            Hello, {profile?.name ? profile.name.split(' ')[0] : 'User'}
          </h1>
        </div>
      </div>

      {/* Action Pills */}
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', padding: '0.25rem 0.5rem 1rem', marginBottom: '1.5rem', WebkitOverflowScrolling: 'touch' }}>
        <button 
          onClick={() => setActiveTab('orders')}
          style={{ padding: '0.6rem 1.25rem', borderRadius: '100px', border: activeTab === 'orders' ? '1px solid transparent' : '1px solid #cbd5e1', background: activeTab === 'orders' ? '#f8fafc' : 'white', color: 'var(--navy)', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: activeTab === 'orders' ? 'inset 0 0 0 2px var(--navy)' : 'none', transition: 'all 0.2s' }}>
          Your Orders
        </button>
        <button 
          onClick={() => setActiveTab('buy-again')}
          style={{ padding: '0.6rem 1.25rem', borderRadius: '100px', border: activeTab === 'buy-again' ? '1px solid transparent' : '1px solid #cbd5e1', background: activeTab === 'buy-again' ? '#f8fafc' : 'white', color: 'var(--navy)', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: activeTab === 'buy-again' ? 'inset 0 0 0 2px var(--navy)' : 'none', transition: 'all 0.2s' }}>
          Buy Again
        </button>
        <button 
          onClick={() => setActiveTab('account')}
          style={{ padding: '0.6rem 1.25rem', borderRadius: '100px', border: activeTab === 'account' ? '1px solid transparent' : '1px solid #cbd5e1', background: activeTab === 'account' ? '#f8fafc' : 'white', color: 'var(--navy)', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: activeTab === 'account' ? 'inset 0 0 0 2px var(--navy)' : 'none', transition: 'all 0.2s' }}>
          Account
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tab-content { animation: fadeIn 0.3s ease forwards; }
      `}</style>

      {/* ---------------- ACCOUNT TAB ---------------- */}
      {activeTab === 'account' && (
        <div className="tab-content" style={{ padding: '0 0.5rem' }}>
          <div style={{ background: 'var(--white)', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--navy)', fontWeight: '700' }}>Personal Info</h2>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--gray-600)', fontSize: '0.9rem' }}>Manage your account details</p>
              </div>
              {!isEditingProfile && (
                <button onClick={() => setIsEditingProfile(true)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: 'var(--navy)', cursor: 'pointer', fontWeight: '600', padding: '0.6rem 1.2rem', borderRadius: '6px', fontSize: '0.85rem', transition: 'background 0.2s' }} onMouseOver={e => e.target.style.background = '#f1f5f9'} onMouseOut={e => e.target.style.background = '#f8fafc'}>
                  Edit Profile
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '400px', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '600', color: 'var(--navy)' }}>Full Name</label>
                  <input required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} style={{ width: '100%', padding: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.95rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '600', color: 'var(--navy)' }}>Phone Number</label>
                  <input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder="e.g. 9876543210" style={{ width: '100%', padding: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.95rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', color: '#94a3b8', fontWeight: '600' }}>Email (Cannot be changed)</label>
                  <input value={profile.email} disabled style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', color: '#94a3b8', fontSize: '0.95rem' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: '0.85rem', background: '#f1f5f9', color: 'var(--navy)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
                  <button type="submit" disabled={profileUpdating} style={{ flex: 1, padding: '0.85rem', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>
                    {profileUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Full Name</p>
                  <p style={{ margin: 0, fontWeight: '600', color: 'var(--navy)', fontSize: '1.05rem' }}>{profile?.name}</p>
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Email Address</p>
                  <p style={{ margin: 0, fontWeight: '600', color: 'var(--navy)', fontSize: '1.05rem' }}>{profile?.email}</p>
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <p style={{ margin: '0 0 0.35rem', fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Phone Number</p>
                  <p style={{ margin: 0, fontWeight: '600', color: 'var(--navy)', fontSize: '1.05rem' }}>{profile?.phone || <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 'normal' }}>Not provided</span>}</p>
                </div>
              </div>
            )}
          </div>
          
          <button onClick={handleLogout} style={{ marginTop: '2rem', width: '100%', padding: '1rem', background: 'white', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '12px', fontWeight: '700', fontSize: '1.05rem', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            Sign Out
          </button>
        </div>
      )}

      {/* ---------------- BUY AGAIN TAB ---------------- */}
      {activeTab === 'buy-again' && (
        <div className="tab-content" style={{ padding: '0 0.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: 'var(--navy)', fontWeight: '700' }}>Buy it again</h2>
          {(() => {
            const allItems = orders.flatMap(o => o.items);
            const uniqueItems = [];
            const seen = new Set();
            for (const item of allItems) {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                uniqueItems.push(item);
              }
            }

            if (uniqueItems.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: 'var(--gray-600)', margin: '0 0 1.5rem' }}>You haven't purchased anything yet.</p>
                  <button onClick={() => navigate('/shop')} style={{ padding: '0.75rem 1.5rem', background: 'var(--navy)', color: 'white', borderRadius: '100px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Start Shopping</button>
                </div>
              );
            }

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                {uniqueItems.map(item => (
                  <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', background: 'white', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: '120px', background: '#f8fafc', marginBottom: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: '600', color: 'var(--navy)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1, lineHeight: '1.4' }}>{item.name}</p>
                    <p style={{ margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: '700', color: '#b91c1c' }}>₹{item.price}</p>
                    <button onClick={() => navigate(`/shop/${item.id}`)} style={{ width: '100%', padding: '0.65rem', background: '#fcd34d', color: '#92400e', border: 'none', borderRadius: '100px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', transition: 'background 0.2s' }} onMouseOver={e => e.target.style.background = '#fbbf24'} onMouseOut={e => e.target.style.background = '#fcd34d'}>
                      View Item
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ---------------- ORDERS TAB ---------------- */}
      {activeTab === 'orders' && (
        <div className="tab-content" style={{ padding: '0 0.5rem' }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', color: 'var(--navy)', fontWeight: '700' }}>Your Orders</h2>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--white)', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>You haven't placed any orders yet.</p>
              <button onClick={() => navigate('/shop')} className="btn btn-primary">Start Shopping</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {orders.map(order => (
                <div key={order.orderId} style={{ background: 'var(--white)', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div 
                    style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: expandedId === order.orderId ? '1px solid var(--gray-200)' : 'none', background: '#f8fafc' }}
                    onClick={() => {
                      setExpandedId(expandedId === order.orderId ? null : order.orderId);
                      setTrackingId(null); 
                    }}
                  >
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--navy)', fontSize: '1.05rem', fontWeight: '700' }}>Order #{order.orderId.substring(0,8).toUpperCase()}</h3>
                      <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '0.85rem' }}>
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <p style={{ margin: '0 0 0.35rem 0', fontWeight: '700', fontSize: '1.05rem' }}>₹{order.total.toLocaleString('en-IN')}</p>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '100px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          background: getStatusStyle(order.status).bg,
                          color: getStatusStyle(order.status).color,
                          border: `1px solid ${getStatusStyle(order.status).border}`,
                        }}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedId === order.orderId ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#94a3b8' }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>

                  {expandedId === order.orderId && (
                    <div style={{ padding: '2rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem' }}>
                        {/* Left Column: Items and Shipping */}
                        <div style={{ flex: '1 1 60%', minWidth: '280px' }}>
                          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--navy)', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>Items Purchased</h4>
                          <div style={{ marginBottom: '2.5rem' }}>
                            {order.items.map(item => (
                              <div key={`${item.id}-${item.sizeId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.25rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                                <div style={{ flex: 1, paddingRight: '1.5rem' }}>
                                  <div style={{ fontWeight: '600', color: 'var(--navy)', marginBottom: '0.35rem', fontSize: '1.05rem', lineHeight: '1.4' }}>{item.name}</div>
                                  <div style={{ fontSize: '0.9rem', color: 'var(--gray-600)' }}>Variant: {item.sizeLabel}</div>
                                </div>
                                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <div style={{ fontWeight: '700', color: 'var(--navy)', fontSize: '1.1rem', marginBottom: '0.35rem' }}>₹{item.lineTotal.toLocaleString('en-IN')}</div>
                                  <div style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>Qty: {item.qty}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--navy)', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>Shipping Address</h4>
                          <div style={{ color: 'var(--gray-600)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            <p style={{ margin: '0 0 0.25rem 0', fontWeight: '600', color: 'var(--navy)' }}>{order.shipping.name || profile?.name || 'Customer'}</p>
                            <p style={{ margin: '0 0 0.25rem 0' }}>{order.shipping.addressLine1}</p>
                            {order.shipping.addressLine2 && <p style={{ margin: '0 0 0.25rem 0' }}>{order.shipping.addressLine2}</p>}
                            <p style={{ margin: 0 }}>{order.shipping.city}, {order.shipping.state} - {order.shipping.pincode}</p>
                          </div>
                        </div>

                        {/* Right Column: Order Summary */}
                        <div style={{ flex: '1 1 30%', minWidth: '280px' }}>
                          <div style={{ background: 'white', padding: '1.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <h4 style={{ margin: '0 0 1.25rem 0', color: 'var(--navy)', fontSize: '1.1rem' }}>Order Summary</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--gray-600)', fontSize: '0.95rem' }}>
                              <span>Item(s) Subtotal:</span>
                              <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', color: 'var(--gray-600)', fontSize: '0.95rem' }}>
                              <span>Shipping:</span>
                              <span>{order.shippingFee === 0 ? 'Free' : `₹${order.shippingFee}`}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '1.25rem', color: 'var(--navy)', borderTop: '1px solid #cbd5e1', paddingTop: '1.25rem', marginBottom: '1.75rem' }}>
                              <span>Grand Total:</span>
                              <span>₹{order.total.toLocaleString('en-IN')}</span>
                            </div>

                            {order.status !== 'cancelled' && trackingId !== order.orderId && (
                              <button 
                                onClick={() => setTrackingId(order.orderId)}
                                style={{ width: '100%', padding: '0.85rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '100px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem', transition: 'background 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                                onMouseOver={e => e.target.style.background = '#0284c7'}
                                onMouseOut={e => e.target.style.background = 'var(--accent)'}
                              >
                                Track Package
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Tracking Timeline */}
                      {trackingId === order.orderId && order.status !== 'cancelled' && (
                        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--gray-200)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h4 style={{ margin: 0, color: 'var(--navy)' }}>Live Tracking Status</h4>
                            <button onClick={() => setTrackingId(null)} style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', fontSize: '0.85rem' }}>Hide Tracking</button>
                          </div>
                          
                          <div className="timeline" style={{ padding: '0 0 0 2rem' }}>
                            {STATUS_STAGES.map((stage, index) => {
                              const effectiveIndex = getEffectiveStageIndex(order);
                              const isCompleted = index <= effectiveIndex;
                              const isCurrent = index === effectiveIndex;
                              const isLast = index === STATUS_STAGES.length - 1;
                              const stageDate = order.statusTimestamps?.[`${stage.id}At`];

                              return (
                                <div key={stage.id} className={`timeline-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`} style={{ position: 'relative', paddingBottom: isLast ? '0' : '2.5rem' }}>
                                  {!isLast && (
                                    <div className="timeline-line" style={{
                                      position: 'absolute', left: '-23px', top: '24px', bottom: '-8px', width: '2px',
                                      background: isCompleted ? 'var(--green)' : 'var(--gray-200)', zIndex: 1
                                    }}></div>
                                  )}
                                  
                                  <div className="timeline-dot" style={{
                                    position: 'absolute', left: '-32px', top: '4px', width: '20px', height: '20px', borderRadius: '50%',
                                    background: isCompleted ? 'var(--green)' : 'var(--white)', border: `2px solid ${isCompleted ? 'var(--green)' : 'var(--gray-200)'}`,
                                    zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                                  }}>
                                    {isCompleted && (
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    )}
                                  </div>

                                  <div style={{ marginLeft: '1rem' }}>
                                    <h4 style={{ margin: '0 0 0.25rem 0', color: isCompleted ? 'var(--navy)' : 'var(--gray-400)' }}>{stage.label}</h4>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--gray-400)' }}>{stage.description}</p>
                                    {stageDate && isCompleted && (
                                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                                        {formatStatusDate(stageDate)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
