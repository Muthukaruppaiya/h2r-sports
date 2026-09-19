import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { INDIAN_STATES } from '../../utils/india';

const EMPTY_FORM = {
  name: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
};

const PAY = { upi: 'UPI', card: 'Card', razorpay: 'Online', cod: 'COD', netbanking: 'Netbanking' };

function formatAddress(customer) {
  return [
    customer.addressLine1,
    customer.addressLine2,
    [customer.city, customer.state].filter(Boolean).join(', '),
    customer.pincode,
  ]
    .filter((line) => String(line || '').trim() && line !== '—')
    .join(', ');
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadBlob(content, mime, filename) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function rowData(c, sno) {
  return {
    sno,
    name: c.name || '',
    email: c.email || '',
    phone: c.phone || '',
    addressLine1: c.addressLine1 || '',
    addressLine2: c.addressLine2 || '',
    city: c.city || '',
    state: c.state || '',
    pincode: c.pincode || '',
    fullAddress: formatAddress(c),
    totalOrders: c.totalOrders || 0,
    totalQty: c.totalQty || 0,
    totalSpent: Number(c.totalSpent || 0),
    products: Array.isArray(c.products) ? c.products.join(', ') : '',
    firstOrder: formatDate(c.firstOrderDate),
    lastOrder: formatDate(c.lastOrderDate),
    lastOrderId: c.lastOrderId || '',
    lastPayment: PAY[c.lastPaymentMethod] || c.lastPaymentMethod || '',
    lastStatus: c.lastOrderStatus || '',
    lastPayStatus: c.lastPaymentStatus || '',
    joined: formatDate(c.joinedAt),
    verified: c.emailVerified ? 'Yes' : 'No',
  };
}

function exportExcel(customers) {
  const headers = [
    'S.No',
    'Name',
    'Email',
    'Phone',
    'Address line 1',
    'Address line 2',
    'City',
    'State',
    'PIN',
    'Full address',
    'Total orders',
    'Total qty',
    'Total spent',
    'Products bought',
    'First order',
    'Last order',
    'Last order ID',
    'Last payment',
    'Last order status',
    'Last payment status',
    'Customer since',
    'Email verified',
  ];
  const rows = customers.map((c, i) => {
    const r = rowData(c, i + 1);
    return [
      r.sno,
      r.name,
      r.email,
      r.phone,
      r.addressLine1,
      r.addressLine2,
      r.city,
      r.state,
      r.pincode,
      r.fullAddress,
      r.totalOrders,
      r.totalQty,
      r.totalSpent,
      r.products,
      r.firstOrder,
      r.lastOrder,
      r.lastOrderId,
      r.lastPayment,
      r.lastStatus,
      r.lastPayStatus,
      r.joined,
      r.verified,
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  downloadBlob(`\uFEFF${csv}`, 'text/csv;charset=utf-8', `h2r-customers-${stamp()}.csv`);
}

function exportPdf(customers) {
  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) {
    alert('Allow pop-ups to export PDF');
    return;
  }
  const rows = customers
    .map((c, i) => {
      const r = rowData(c, i + 1);
      return `<tr>
        <td>${r.sno}</td>
        <td>${r.name}<br/><span>${r.email}</span><br/>${r.phone}</td>
        <td>${r.fullAddress || '—'}</td>
        <td>${r.totalOrders} / ${r.totalQty}<br/>₹${r.totalSpent.toLocaleString('en-IN')}</td>
        <td>${r.products || '—'}</td>
        <td>${r.lastOrderId}<br/>${r.lastOrder}<br/>${r.lastPayment}</td>
      </tr>`;
    })
    .join('');
  win.document.write(`<!DOCTYPE html><html><head><title>H2R customers</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: Arial, sans-serif; color: #111; padding: 12px; }
      h1 { font-size: 18px; margin: 0 0 6px; }
      p { margin: 0 0 12px; color: #555; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th, td { border: 1px solid #ccc; padding: 6px 7px; text-align: left; vertical-align: top; }
      th { background: #0a2540; color: #fff; }
      span { color: #555; }
    </style></head><body>
    <h1>H2R Sports — Customers</h1>
    <p>${customers.length} customers · exported ${new Date().toLocaleString('en-IN')}</p>
    <table>
      <thead><tr>
        <th>S.No</th><th>Customer</th><th>Address</th><th>Orders / Qty / Spent</th><th>Products</th><th>Last order</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minOrders, setMinOrders] = useState('');
  const [minSpend, setMinSpend] = useState('');

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

  const states = useMemo(() => {
    const set = new Set(customers.map((c) => c.state).filter(Boolean));
    return [...set].sort();
  }, [customers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (q) {
        const blob = [c.name, c.email, c.phone, c.city, c.state, c.pincode, c.lastOrderId, ...(c.products || [])]
          .join(' ')
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (stateFilter !== 'all' && c.state !== stateFilter) return false;
      if (minOrders && Number(c.totalOrders) < Number(minOrders)) return false;
      if (minSpend && Number(c.totalSpent) < Number(minSpend)) return false;
      if (fromDate) {
        const last = c.lastOrderDate ? new Date(c.lastOrderDate) : null;
        if (!last || last < new Date(`${fromDate}T00:00:00`)) return false;
      }
      if (toDate) {
        const last = c.lastOrderDate ? new Date(c.lastOrderDate) : null;
        if (!last || last > new Date(`${toDate}T23:59:59`)) return false;
      }
      return true;
    });
  }, [customers, query, stateFilter, fromDate, toDate, minOrders, minSpend]);

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      addressLine1: customer.addressLine1 || '',
      addressLine2: customer.addressLine2 || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
    });
  };

  const closeEdit = () => setEditingCustomer(null);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'pincode' || name === 'phone'
          ? value.replace(/\D/g, '').slice(0, name === 'pincode' ? 6 : 10)
          : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/customers/${encodeURIComponent(editingCustomer.email)}`, formData);
      closeEdit();
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update customer details');
    }
  };

  const resetFilters = () => {
    setQuery('');
    setStateFilter('all');
    setFromDate('');
    setToDate('');
    setMinOrders('');
    setMinSpend('');
  };

  if (loading) return <div className="adm-empty">Loading customers…</div>;

  const inputStyle = { padding: '0.5rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '8px', minWidth: '140px' };

  return (
    <div className="adm-page">
      <div style={{ display: 'flex', gap: '0.55rem', marginBottom: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone, city, PIN, product…"
          style={{ ...inputStyle, minWidth: '240px', flex: 1 }}
        />
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={inputStyle}>
          <option value="all">All states</option>
          {states.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} title="Last order from" />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} title="Last order to" />
        <input
          type="number"
          min="0"
          value={minOrders}
          onChange={(e) => setMinOrders(e.target.value)}
          placeholder="Min orders"
          style={{ ...inputStyle, width: '110px', minWidth: '110px' }}
        />
        <input
          type="number"
          min="0"
          value={minSpend}
          onChange={(e) => setMinSpend(e.target.value)}
          placeholder="Min spend ₹"
          style={{ ...inputStyle, width: '120px', minWidth: '120px' }}
        />
        <button type="button" className="adm-btn adm-btn--ghost" onClick={resetFilters}>
          Clear
        </button>
        <button type="button" className="adm-btn adm-btn--primary" disabled={!filtered.length} onClick={() => exportExcel(filtered)}>
          Export Excel
        </button>
        <button type="button" className="adm-btn adm-btn--ghost" disabled={!filtered.length} onClick={() => exportPdf(filtered)}>
          Export PDF
        </button>
      </div>
      <p style={{ margin: '0 0 0.75rem', color: '#64748b', fontSize: '0.85rem' }}>
        Showing {filtered.length} of {customers.length} customers
      </p>

      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1180px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '0.85rem 1rem', color: '#475569' }}>S.No</th>
              <th style={{ padding: '0.85rem 1rem', color: '#475569' }}>Customer</th>
              <th style={{ padding: '0.85rem 1rem', color: '#475569' }}>Address</th>
              <th style={{ padding: '0.85rem 1rem', color: '#475569' }}>Orders</th>
              <th style={{ padding: '0.85rem 1rem', color: '#475569' }}>Spent</th>
              <th style={{ padding: '0.85rem 1rem', color: '#475569' }}>Products</th>
              <th style={{ padding: '0.85rem 1rem', color: '#475569' }}>Last order</th>
              <th style={{ padding: '0.85rem 1rem', color: '#475569' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((customer, i) => (
              <tr key={customer.email} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontWeight: 700 }}>{i + 1}</td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{customer.name}</div>
                  <div style={{ color: '#475569', fontSize: '0.82rem' }}>{customer.email}</div>
                  <div style={{ color: '#475569', fontSize: '0.82rem' }}>{customer.phone}</div>
                </td>
                <td style={{ padding: '0.85rem 1rem', color: '#475569', maxWidth: '260px' }}>{formatAddress(customer) || '—'}</td>
                <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                  {customer.totalOrders} orders
                  <div style={{ fontSize: '0.78rem' }}>{customer.totalQty || 0} qty</div>
                </td>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>₹{Number(customer.totalSpent || 0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '0.85rem 1rem', color: '#475569', maxWidth: '220px', fontSize: '0.82rem' }}>
                  {(customer.products || []).join(', ') || '—'}
                </td>
                <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.82rem' }}>
                  <div>{customer.lastOrderId}</div>
                  <div>{formatDate(customer.lastOrderDate)}</div>
                  <div>{PAY[customer.lastPaymentMethod] || customer.lastPaymentMethod || ''}</div>
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <button
                    type="button"
                    onClick={() => openEdit(customer)}
                    style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  No customers match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '520px', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--navy)' }}>Edit Customer</h2>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Address line 1</label>
                <input name="addressLine1" value={formData.addressLine1} onChange={handleFormChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Address line 2</label>
                <input name="addressLine2" value={formData.addressLine2} onChange={handleFormChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>City</label>
                  <input name="city" value={formData.city} onChange={handleFormChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>PIN</label>
                  <input name="pincode" value={formData.pincode} onChange={handleFormChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>State</label>
                <select name="state" value={formData.state} onChange={handleFormChange} style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={closeEdit} style={{ padding: '0.75rem 1.5rem', border: '1px solid #ccc', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
