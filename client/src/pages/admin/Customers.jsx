import { useEffect, useState } from 'react';
import api from '../../api/client';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/admin/customers');
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({ name: customer.name, phone: customer.phone });
  };

  const closeEdit = () => {
    setEditingCustomer(null);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/customers/${editingCustomer.email}`, formData);
      closeEdit();
      fetchCustomers();
    } catch (err) {
      alert('Failed to update customer details');
    }
  };

  if (loading) return <div>Loading customers...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', color: 'var(--navy)' }}>Customers</h1>
      
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '1rem', color: '#475569' }}>Name</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Email</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Phone</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Total Orders</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Total Spent</th>
              <th style={{ padding: '1rem', color: '#475569' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem', fontWeight: '500', color: 'var(--navy)' }}>{customer.name}</td>
                <td style={{ padding: '1rem', color: '#475569' }}>{customer.email}</td>
                <td style={{ padding: '1rem', color: '#475569' }}>{customer.phone}</td>
                <td style={{ padding: '1rem', color: '#475569' }}>{customer.totalOrders}</td>
                <td style={{ padding: '1rem', fontWeight: '600' }}>₹{customer.totalSpent.toLocaleString()}</td>
                <td style={{ padding: '1rem' }}>
                  <button 
                    onClick={() => openEdit(customer)}
                    style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--navy)' }}>Edit Customer</h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Email</label>
                <input value={editingCustomer.email} disabled style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', background: '#f1f5f9' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Name *</label>
                <input required name="name" value={formData.name} onChange={handleFormChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Phone *</label>
                <input required name="phone" value={formData.phone} onChange={handleFormChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={closeEdit} style={{ padding: '0.75rem 1.5rem', border: '1px solid #ccc', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
