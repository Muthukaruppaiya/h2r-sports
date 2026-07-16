import { useEffect, useState } from 'react';
import api from '../../api/client';
import { Link } from 'react-router-dom';
import { getStatusLabel, getStatusStyle } from '../../utils/orderStatus';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    recentOrders: [],
    loading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/orders');
        const orders = res.data.orders || [];
        
        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        
        setStats({
          totalOrders: orders.length,
          totalRevenue,
          recentOrders: orders.slice(0, 5),
          loading: false
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
        setStats(s => ({ ...s, loading: false }));
      }
    };
    fetchStats();
  }, []);

  if (stats.loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Loading dashboard...</div>;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#334155' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: '1.875rem', fontWeight: '800', letterSpacing: '-0.02em' }}>Dashboard Overview</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>Here is what's happening with your store today.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/admin/inventory" style={{ padding: '0.65rem 1.25rem', backgroundColor: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'background-color 0.2s' }} onMouseOver={e => e.target.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.target.style.backgroundColor = '#fff'}>
            Manage Inventory
          </Link>
          <Link to="/admin/orders" style={{ padding: '0.65rem 1.25rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -1px rgba(37, 99, 235, 0.1)', transition: 'background-color 0.2s' }} onMouseOver={e => e.target.style.backgroundColor = '#1d4ed8'} onMouseOut={e => e.target.style.backgroundColor = '#2563eb'}>
            View Orders
          </Link>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard 
          title="Total Revenue" 
          value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`} 
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          gradient="linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"
          color="#1e40af"
        />
        <StatCard 
          title="Total Orders" 
          value={stats.totalOrders} 
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>}
          gradient="linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
          color="#166534"
        />
        <StatCard 
          title="Avg. Order Value" 
          value={`₹${stats.totalOrders ? Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString('en-IN') : 0}`} 
          icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>}
          gradient="linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)"
          color="#991b1b"
        />
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: '700' }}>Recent Orders</h2>
          <Link to="/admin/orders" style={{ fontSize: '0.9rem', color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>View all →</Link>
        </div>
        
        {stats.recentOrders.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px' }}>
            <svg style={{ margin: '0 auto 1rem', display: 'block', color: '#cbd5e1' }} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            No orders found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '1rem', color: '#475569', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order ID</th>
                  <th style={{ padding: '1rem', color: '#475569', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                  <th style={{ padding: '1rem', color: '#475569', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                  <th style={{ padding: '1rem', color: '#475569', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order, i) => (
                  <tr key={order.orderId} style={{ borderBottom: i === stats.recentOrders.length - 1 ? 'none' : '1px solid #f1f5f9', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1rem', fontWeight: '600', color: '#0f172a' }}>#{order.orderId.substring(0,8).toUpperCase()}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '600', color: '#334155' }}>{order.customer.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{order.customer.email}</div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '600', color: '#0f172a' }}>₹{order.total.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '1rem' }}>
                      {(() => {
                        const style = getStatusStyle(order.status);
                        return (
                          <span style={{ 
                            padding: '0.35rem 0.8rem', 
                            borderRadius: '999px', 
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            background: style.bg,
                            color: style.color,
                            border: `1px solid ${style.border}`
                          }}>
                            {getStatusLabel(order.status)}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, gradient, color }) {
  return (
    <div style={{ background: 'white', padding: '1.75rem', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1.5rem', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }} onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }} onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: gradient, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <h3 style={{ margin: '0 0 0.35rem 0', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: '2rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>{value}</p>
      </div>
    </div>
  );
}
