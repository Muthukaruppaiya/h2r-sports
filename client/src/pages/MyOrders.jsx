import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const STATUS_STAGES = [
  { id: 'confirmed', label: 'Order Placed', description: 'We have received your order.' },
  { id: 'paid', label: 'Payment Confirmed', description: 'Payment has been successfully processed.' },
  { id: 'shipped', label: 'Shipped', description: 'Your order is on the way.' },
  { id: 'delivered', label: 'Delivered', description: 'Your order has been delivered.' },
];

export default function MyOrders() {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
        if (err.message.includes('401')) {
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

  const getStageIndex = (status) => {
    if (status === 'cancelled') return -1;
    return STATUS_STAGES.findIndex(s => s.id === status);
  };

  if (loading) return <div style={{ padding: 'var(--header-offset) 1rem 4rem', textAlign: 'center' }}>Loading your account...</div>;

  return (
    <div className="container" style={{ paddingTop: 'var(--header-offset)', paddingBottom: '4rem', maxWidth: '900px', margin: '0 auto', minHeight: '60vh' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, color: 'var(--navy)' }}>My Account</h1>
        <button onClick={handleLogout} className="btn btn-primary" style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
          Log Out
        </button>
      </div>

      {/* Profile Section */}
      <div style={{ background: 'var(--white)', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--navy)' }}>Profile Information</h2>
          {!isEditingProfile && (
            <button onClick={() => setIsEditingProfile(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}>
              Edit Profile
            </button>
          )}
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Full Name</label>
              <input required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Phone Number</label>
              <input value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder="e.g. 9876543210" style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#94a3b8' }}>Email (Cannot be changed)</label>
              <input value={profile.email} disabled style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', color: '#94a3b8' }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: '0.75rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={profileUpdating} style={{ flex: 1, padding: '0.75rem', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                {profileUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: 'var(--gray-400)' }}>Full Name</p>
              <p style={{ margin: 0, fontWeight: '500', color: 'var(--navy)' }}>{profile?.name}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: 'var(--gray-400)' }}>Email Address</p>
              <p style={{ margin: 0, fontWeight: '500', color: 'var(--navy)' }}>{profile?.email}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem', color: 'var(--gray-400)' }}>Phone Number</p>
              <p style={{ margin: 0, fontWeight: '500', color: 'var(--navy)' }}>{profile?.phone || 'Not provided'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Orders Section */}
      <h2 style={{ fontSize: '1.5rem', color: 'var(--navy)', marginBottom: '1.5rem' }}>Order History</h2>
      
      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--white)', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1.5rem' }}>You haven't placed any orders yet.</p>
          <button onClick={() => navigate('/shop')} className="btn btn-primary">Start Shopping</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {orders.map(order => (
            <div key={order.orderId} style={{ background: 'var(--white)', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div 
                style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: expandedId === order.orderId ? '1px solid var(--gray-200)' : 'none' }}
                onClick={() => {
                  setExpandedId(expandedId === order.orderId ? null : order.orderId);
                  setTrackingId(null); // reset tracking view when toggling order
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--navy)' }}>Order {order.orderId}</h3>
                  <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '0.9rem' }}>
                    Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>₹{order.total}</p>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '100px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      background: order.status === 'cancelled' ? '#ffebee' : '#e8f5e9',
                      color: order.status === 'cancelled' ? '#c62828' : '#2e7d32'
                    }}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedId === order.orderId ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>

              {expandedId === order.orderId && (
                <div style={{ padding: '2rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    {/* Order Summary */}
                    <div>
                      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--navy)' }}>Items Purchased</h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
                        {order.items.map(item => (
                          <li key={`${item.id}-${item.sizeId}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                            <span style={{ color: 'var(--gray-600)' }}>{item.qty}x {item.name} <span style={{ fontSize: '0.85rem' }}>({item.sizeLabel})</span></span>
                            <span style={{ fontWeight: '500' }}>₹{item.lineTotal}</span>
                          </li>
                        ))}
                      </ul>

                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--navy)' }}>Shipping Details</h4>
                      <p style={{ margin: '0 0 0.25rem 0', color: 'var(--gray-600)', fontSize: '0.9rem' }}>{order.shipping.addressLine1}</p>
                      {order.shipping.addressLine2 && <p style={{ margin: '0 0 0.25rem 0', color: 'var(--gray-600)', fontSize: '0.9rem' }}>{order.shipping.addressLine2}</p>}
                      <p style={{ margin: 0, color: 'var(--gray-600)', fontSize: '0.9rem' }}>{order.shipping.city}, {order.shipping.state} - {order.shipping.pincode}</p>
                    </div>

                    {/* Actions Panel */}
                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', height: 'fit-content' }}>
                      <p style={{ margin: '0 0 0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--gray-400)' }}>Subtotal</span>
                        <span>₹{order.subtotal}</span>
                      </p>
                      <p style={{ margin: '0 0 1rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--gray-400)' }}>Shipping</span>
                        <span>{order.shippingFee === 0 ? 'Free' : `₹${order.shippingFee}`}</span>
                      </p>
                      <p style={{ margin: '0 0 1.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--navy)', borderTop: '1px solid #cbd5e1', paddingTop: '1rem' }}>
                        <span>Total</span>
                        <span>₹{order.total}</span>
                      </p>

                      {order.status !== 'cancelled' && trackingId !== order.orderId && (
                        <button 
                          onClick={() => setTrackingId(order.orderId)}
                          style={{ width: '100%', padding: '0.75rem', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Track Order
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tracking Timeline (Shows when "Track Order" is clicked) */}
                  {trackingId === order.orderId && order.status !== 'cancelled' && (
                    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--gray-200)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--navy)' }}>Live Tracking Status</h4>
                        <button onClick={() => setTrackingId(null)} style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', fontSize: '0.85rem' }}>Hide Tracking</button>
                      </div>
                      
                      <div className="timeline" style={{ padding: '0 0 0 2rem' }}>
                        {STATUS_STAGES.map((stage, index) => {
                          const currentIndex = getStageIndex(order.status);
                          const effectiveIndex = (order.paymentMethod === 'cod' && order.status === 'confirmed' && order.paymentStatus === 'pending_cod') 
                            ? 1 
                            : currentIndex;
                            
                          const isCompleted = index <= effectiveIndex;
                          const isCurrent = index === effectiveIndex;
                          const isLast = index === STATUS_STAGES.length - 1;

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
  );
}
