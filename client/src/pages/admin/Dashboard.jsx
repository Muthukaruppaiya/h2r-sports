import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { getStatusLabel, getStatusStyle } from '../../utils/orderStatus';

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    recentOrders: [],
    storeSales: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [ordersRes, billsRes] = await Promise.all([
          api.get('/admin/orders'),
          api.get('/admin/store-bills').catch(() => ({ data: { totals: {} } })),
        ]);
        const orders = ordersRes.data.orders || [];
        const totals = billsRes.data.totals || {};
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        setStats({
          totalOrders: orders.length,
          totalRevenue,
          recentOrders: orders.slice(0, 6),
          storeSales: totals.totalSales || 0,
          loading: false,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
        setStats((s) => ({ ...s, loading: false }));
      }
    };
    fetchStats();
  }, []);

  if (stats.loading) return <div className="adm-empty">Loading dashboard…</div>;

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Sales, payments, and store expenses at a glance.</p>
        </div>
        <div className="adm-page__actions">
          <Link to="/admin/inventory" className="adm-btn adm-btn--ghost">
            Inventory
          </Link>
          <Link to="/admin/orders" className="adm-btn adm-btn--primary">
            View orders
          </Link>
        </div>
      </div>

      <div className="adm-kpi-grid">
        <div className="adm-kpi" style={{ '--kpi-color': '#1e40af', '--kpi-glow': 'rgba(37,99,235,0.14)' }}>
          <div className="adm-kpi__label">Total revenue</div>
          <div className="adm-kpi__value">{money(stats.totalRevenue)}</div>
          <div className="adm-kpi__hint">All customer orders</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#166534', '--kpi-glow': 'rgba(22,163,74,0.14)' }}>
          <div className="adm-kpi__label">Total orders</div>
          <div className="adm-kpi__value">{stats.totalOrders}</div>
          <div className="adm-kpi__hint">Lifetime count</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#9f1239', '--kpi-glow': 'rgba(200,16,46,0.12)' }}>
          <div className="adm-kpi__label">Avg. order value</div>
          <div className="adm-kpi__value">
            {money(stats.totalOrders ? Math.round(stats.totalRevenue / stats.totalOrders) : 0)}
          </div>
          <div className="adm-kpi__hint">Revenue ÷ orders</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#854d0e', '--kpi-glow': 'rgba(234,179,8,0.16)' }}>
          <div className="adm-kpi__label">Shop sales (physical)</div>
          <div className="adm-kpi__value">{money(stats.storeSales)}</div>
          <div className="adm-kpi__hint">
            <Link to="/admin/store-billing" style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 700 }}>
              Open store billing →
            </Link>
          </div>
        </div>
      </div>

      <div className="adm-panel">
        <div className="adm-panel__head">
          <h2>Recent orders</h2>
          <Link to="/admin/orders" className="adm-btn adm-btn--ghost">
            View all
          </Link>
        </div>
        {stats.recentOrders.length === 0 ? (
          <div className="adm-empty">No orders found.</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => {
                  const style = getStatusStyle(order.status);
                  return (
                    <tr key={order.orderId}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        #{String(order.orderId).substring(0, 8).toUpperCase()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.customer?.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{order.customer?.email}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{money(order.total)}</td>
                      <td>
                        <span
                          className="adm-pill"
                          style={{
                            background: style.bg,
                            color: style.color,
                            border: `1px solid ${style.border}`,
                          }}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
