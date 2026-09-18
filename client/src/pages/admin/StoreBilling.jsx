import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const METHODS = [
  { id: 'cash', label: 'Cash', bg: '#dcfce7', color: '#166534' },
  { id: 'upi', label: 'UPI', bg: '#dbeafe', color: '#1e40af' },
  { id: 'card', label: 'Card', bg: '#f3e8ff', color: '#6b21a8' },
];

export function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function methodStyle(id) {
  return METHODS.find((m) => m.id === id) || METHODS[0];
}

export default function StoreBilling() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [totals, setTotals] = useState({
    totalSales: 0,
    bills: 0,
    byMethod: { cash: 0, upi: 0, card: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchAll = async () => {
    try {
      const billsRes = await api.get('/admin/store-bills');
      setBills(billsRes.data.bills || []);
      setTotals(
        billsRes.data.totals || { totalSales: 0, bills: 0, byMethod: { cash: 0, upi: 0, card: 0 } }
      );
    } catch (err) {
      console.error(err);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bills.filter((b) => {
      if (method !== 'all' && b.paymentMethod !== method) return false;
      const t = new Date(b.soldAt || b.createdAt).getTime();
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        if (t < start.getTime()) return false;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (t > end.getTime()) return false;
      }
      if (!q) return true;
      const hay = [
        b.billId,
        b.customerName,
        b.customerPhone,
        b.itemName,
        b.sizeLabel,
        b.weightLabel,
        ...(b.items || []).map((line) => line.itemName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [bills, query, method, fromDate, toDate]);

  const deleteBill = async (billId) => {
    if (!window.confirm('Delete this shop sale bill?')) return;
    try {
      await api.delete(`/admin/store-bills/${billId}`);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to delete');
    }
  };

  if (loading) return <div className="adm-empty">Loading store billing…</div>;

  return (
    <div className="adm-page">
      {/* Title/subtitle already shown in the topbar above — no need to repeat it here. */}
      <div className="adm-page__head adm-page__head--slim">
        <div className="adm-page__actions">
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            onClick={() => navigate('/admin/store-billing/new')}
          >
            + New shop bill
          </button>
        </div>
      </div>

      <div className="adm-kpi-grid">
        <div className="adm-kpi" style={{ '--kpi-color': '#0f172a' }}>
          <div className="adm-kpi__label">Shop sales</div>
          <div className="adm-kpi__value">{money(totals.totalSales)}</div>
          <div className="adm-kpi__hint">{totals.bills || bills.length} counter bills</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#166534' }}>
          <div className="adm-kpi__label">Cash</div>
          <div className="adm-kpi__value">{money(totals.byMethod?.cash || 0)}</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#1e40af' }}>
          <div className="adm-kpi__label">UPI</div>
          <div className="adm-kpi__value">{money(totals.byMethod?.upi || 0)}</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#6b21a8' }}>
          <div className="adm-kpi__label">Card</div>
          <div className="adm-kpi__value">{money(totals.byMethod?.card || 0)}</div>
        </div>
      </div>

      <div className="adm-filters">
        <div className="adm-field">
          <label>Search</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Customer, bat, bill…" />
        </div>
        <div className="adm-field">
          <label>Payment</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="all">All methods</option>
            {METHODS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="adm-field">
          <label>From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="adm-field">
          <label>To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      <div className="adm-panel">
        <div className="adm-panel__head">
          <h2>Physical shop sales</h2>
        </div>
        {filtered.length === 0 ? (
          <div className="adm-empty">No shop bills yet.</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Discount</th>
                  <th>Date</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((bill) => {
                  const pill = methodStyle(bill.paymentMethod);
                  return (
                    <tr key={bill.billId}>
                      <td style={{ fontWeight: 700 }}>{bill.billId}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{bill.customerName || 'Walk-in'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{bill.customerPhone || '—'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{bill.itemName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          {Array.isArray(bill.items) && bill.items.length > 1
                            ? bill.items.map((line) => `${line.qty}× ${line.itemName}`).join(', ')
                            : [bill.sizeLabel, bill.weightLabel, bill.qty ? `Qty ${bill.qty}` : '']
                                .filter(Boolean)
                                .join(' · ')}
                        </div>
                      </td>
                      <td>{money(bill.discount || 0)}</td>
                      <td>{formatDate(bill.soldAt)}</td>
                      <td>
                        <span className="adm-pill" style={{ background: pill.bg, color: pill.color }}>
                          {pill.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: 750 }}>{money(bill.amount)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="adm-btn adm-btn--ghost"
                            onClick={() => navigate(`/admin/store-billing/${bill.billId}/edit`)}
                          >
                            Edit
                          </button>
                          <button type="button" className="adm-btn adm-btn--danger" onClick={() => deleteBill(bill.billId)}>
                            Delete
                          </button>
                        </div>
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
