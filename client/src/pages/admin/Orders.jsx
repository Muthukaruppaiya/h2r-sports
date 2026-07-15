import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/admin/orders');
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      fetchOrders(); // refresh
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
  };

  const closeDetails = () => {
    setSelectedOrder(null);
  };

  if (loading) return <div>Loading orders...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: 'var(--navy)' }}>Manage Orders</h1>
      
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '1rem', color: '#475569' }}>Order ID / Date</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Customer</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Items</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Total</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Status</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.orderId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: '600', color: 'var(--navy)' }}>{order.orderId}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div>{order.customer.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{order.customer.phone}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.9rem' }}>
                    {order.items.map(item => (
                      <div key={`${item.id}-${item.sizeId}`}>
                        {item.qty}x {item.name} ({item.sizeLabel})
                      </div>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>₹{order.total.toLocaleString()}</td>
                <td style={{ padding: '1rem' }}>
                  <select 
                    value={order.status}
                    onChange={(e) => updateStatus(order.orderId, e.target.value)}
                    style={{ 
                      padding: '0.5rem', 
                      borderRadius: '6px', 
                      border: '1px solid #cbd5e1',
                      background: 'white',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="paid">Paid</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td style={{ padding: '1rem' }}>
                  <button 
                    onClick={() => openDetails(order)}
                    style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--navy)' }}>Order Details</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#64748b', marginBottom: '0.5rem' }}>Customer Info</h4>
              <p><strong>Name:</strong> {selectedOrder.customer.name}</p>
              <p><strong>Email:</strong> {selectedOrder.customer.email}</p>
              <p><strong>Phone:</strong> {selectedOrder.customer.phone}</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#64748b', marginBottom: '0.5rem' }}>Shipping Address</h4>
              <p>{selectedOrder.shipping.addressLine1}</p>
              {selectedOrder.shipping.addressLine2 && <p>{selectedOrder.shipping.addressLine2}</p>}
              <p>{selectedOrder.shipping.city}, {selectedOrder.shipping.state} - {selectedOrder.shipping.pincode}</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#64748b', marginBottom: '0.5rem' }}>Payment Info</h4>
              <p><strong>Method:</strong> {selectedOrder.paymentMethod.toUpperCase()}</p>
              <p><strong>Status:</strong> {selectedOrder.paymentStatus}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={closeDetails} style={{ padding: '0.75rem 1.5rem', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
