import { useEffect, useState } from 'react';
import api from '../../api/client';

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

  if (stats.loading) return <div>Loading dashboard...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: 'var(--navy)' }}>Dashboard Overview</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <StatCard title="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`} />
        <StatCard title="Total Orders" value={stats.totalOrders} />
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>Recent Orders</h2>
        {stats.recentOrders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '1rem 0.5rem', color: '#64748b' }}>Order ID</th>
                <th style={{ padding: '1rem 0.5rem', color: '#64748b' }}>Customer</th>
                <th style={{ padding: '1rem 0.5rem', color: '#64748b' }}>Amount</th>
                <th style={{ padding: '1rem 0.5rem', color: '#64748b' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map(order => (
                <tr key={order.orderId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>{order.orderId}</td>
                  <td style={{ padding: '1rem 0.5rem' }}>{order.customer.name}</td>
                  <td style={{ padding: '1rem 0.5rem' }}>₹{order.total.toLocaleString()}</td>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '999px', 
                      fontSize: '0.85rem',
                      background: order.status === 'delivered' ? '#dcfce7' : '#fef9c3',
                      color: order.status === 'delivered' ? '#166534' : '#854d0e'
                    }}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: 'var(--navy)' }}>{value}</p>
    </div>
  );
}
