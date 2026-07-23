import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { BRAND } from '../../utils/india';
import { PAYMENT_STATUS_LABELS } from '../../utils/orderStatus';

const METHOD_LABELS = { upi: 'UPI', card: 'Card', cod: 'COD' };

const PAYMENT_PILL = {
  paid: { bg: '#dcfce7', color: '#166534' },
  refunded: { bg: '#fee2e2', color: '#991b1b' },
  pending_cod: { bg: '#fef9c3', color: '#854d0e' },
};

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function shortId(orderId = '') {
  return `#${String(orderId).slice(0, 8).toUpperCase()}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function paymentMetaLine(order) {
  const meta = order.paymentMeta || {};
  if (order.paymentMethod === 'upi' && meta.upiId) return meta.upiId;
  if (order.paymentMethod === 'card') {
    const last4 = meta.cardLast4 ? `•••• ${meta.cardLast4}` : '';
    return [meta.cardName, last4].filter(Boolean).join(' · ') || 'Card';
  }
  return METHOD_LABELS[order.paymentMethod] || order.paymentMethod || '—';
}

function inDateRange(order, from, to) {
  const t = new Date(order.createdAt).getTime();
  if (from) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    if (t < start.getTime()) return false;
  }
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (t > end.getTime()) return false;
  }
  return true;
}

export default function Billing() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState('all');
  const [payStatus, setPayStatus] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/admin/orders');
        setOrders(res.data.orders || []);
      } catch (err) {
        console.error(err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (method !== 'all' && order.paymentMethod !== method) return false;
      if (payStatus !== 'all' && order.paymentStatus !== payStatus) return false;
      if (!inDateRange(order, fromDate, toDate)) return false;
      if (!q) return true;
      const hay = [
        order.orderId,
        order.customer?.name,
        order.customer?.email,
        order.customer?.phone,
        order.paymentMethod,
        order.paymentStatus,
        paymentMetaLine(order),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [orders, query, method, payStatus, fromDate, toDate]);

  const kpis = useMemo(() => {
    const paid = filtered.filter((o) => o.paymentStatus === 'paid');
    const refunded = filtered.filter((o) => o.paymentStatus === 'refunded');
    const pending = filtered.filter((o) => o.paymentStatus === 'pending_cod');
    const collected = paid.reduce((s, o) => s + (o.total || 0), 0);
    const refundedAmt = refunded.reduce((s, o) => s + (o.total || 0), 0);
    const pendingAmt = pending.reduce((s, o) => s + (o.total || 0), 0);
    const upi = paid.filter((o) => o.paymentMethod === 'upi').reduce((s, o) => s + (o.total || 0), 0);
    const card = paid.filter((o) => o.paymentMethod === 'card').reduce((s, o) => s + (o.total || 0), 0);
    return {
      collected,
      refundedAmt,
      pendingAmt,
      paidCount: paid.length,
      refundedCount: refunded.length,
      pendingCount: pending.length,
      upi,
      card,
      billCount: filtered.length,
    };
  }, [filtered]);

  if (loading) return <div className="adm-empty">Loading billing…</div>;

  return (
    <div className="adm-page">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .billing-invoice, .billing-invoice * { visibility: visible !important; }
          .billing-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="adm-page__head no-print">
        <div>
          <h1>Customer Billing</h1>
          <p>Track prepaid collections, refunds, and printable customer invoices.</p>
        </div>
        <div className="adm-page__actions">
          <Link to="/admin/store-billing" className="adm-btn adm-btn--ghost">
            Store billing
          </Link>
          <Link to="/admin/orders" className="adm-btn adm-btn--primary">
            Manage orders
          </Link>
        </div>
      </div>

      <div className="adm-kpi-grid no-print">
        <div className="adm-kpi" style={{ '--kpi-color': '#166534', '--kpi-glow': 'rgba(22,163,74,0.14)' }}>
          <div className="adm-kpi__label">Collected</div>
          <div className="adm-kpi__value">{money(kpis.collected)}</div>
          <div className="adm-kpi__hint">{kpis.paidCount} paid bills</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#991b1b', '--kpi-glow': 'rgba(239,68,68,0.14)' }}>
          <div className="adm-kpi__label">Refunded</div>
          <div className="adm-kpi__value">{money(kpis.refundedAmt)}</div>
          <div className="adm-kpi__hint">{kpis.refundedCount} refunds</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#854d0e', '--kpi-glow': 'rgba(234,179,8,0.16)' }}>
          <div className="adm-kpi__label">Pending</div>
          <div className="adm-kpi__value">{money(kpis.pendingAmt)}</div>
          <div className="adm-kpi__hint">{kpis.pendingCount} pending</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#1e40af', '--kpi-glow': 'rgba(37,99,235,0.14)' }}>
          <div className="adm-kpi__label">UPI / Card</div>
          <div className="adm-kpi__value" style={{ fontSize: '1.05rem' }}>
            {money(kpis.upi)} / {money(kpis.card)}
          </div>
          <div className="adm-kpi__hint">{kpis.billCount} invoices in view</div>
        </div>
      </div>

      <div className="adm-filters no-print">
        <div className="adm-field">
          <label>Search</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Order, customer, UPI…" />
        </div>
        <div className="adm-field">
          <label>Payment status</label>
          <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
            <option value="pending_cod">Pending</option>
          </select>
        </div>
        <div className="adm-field">
          <label>Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="all">All methods</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="cod">COD</option>
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

      <div className="adm-panel no-print">
        <div className="adm-panel__head">
          <h2>Invoices / Transactions</h2>
        </div>
        {filtered.length === 0 ? (
          <div className="adm-empty">No billing records match these filters.</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Method</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const pill = PAYMENT_PILL[order.paymentStatus] || PAYMENT_PILL.paid;
                  return (
                    <tr key={order.orderId}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{shortId(order.orderId)}</td>
                      <td style={{ color: '#64748b', fontSize: '0.9rem' }}>{formatDate(order.createdAt)}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.customer?.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{order.customer?.email}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.85rem' }}>
                          {METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{paymentMetaLine(order)}</div>
                      </td>
                      <td>
                        <span className="adm-pill" style={{ background: pill.bg, color: pill.color }}>
                          {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{money(order.total)}</td>
                      <td>
                        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setSelected(order)}>
                          View bill
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="adm-drawer-backdrop no-print" onClick={() => setSelected(null)}>
          <aside className="adm-drawer billing-invoice" onClick={(e) => e.stopPropagation()}>
            <div className="adm-drawer__head no-print">
              <strong>Invoice {shortId(selected.orderId)}</strong>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="adm-btn adm-btn--primary" onClick={() => window.print()}>
                  Print / PDF
                </button>
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
            </div>
            <div className="adm-drawer__body">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <img src={BRAND.logo} alt="" width={44} height={44} />
                  <div>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{BRAND.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Tax invoice / payment receipt</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#64748b' }}>
                  <div>{formatDate(selected.createdAt)}</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{shortId(selected.orderId)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
                    Billed to
                  </div>
                  <div style={{ fontWeight: 700 }}>{selected.customer?.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{selected.customer?.email}</div>
                  <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{selected.customer?.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
                    Ship to
                  </div>
                  <div style={{ color: '#334155', lineHeight: 1.5, fontSize: '0.9rem' }}>
                    {selected.shipping?.addressLine1}
                    {selected.shipping?.addressLine2 ? <><br />{selected.shipping.addressLine2}</> : null}
                    <br />
                    {selected.shipping?.city}, {selected.shipping?.state} — {selected.shipping?.pincode}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
                  Payment
                </div>
                <div>
                  {METHOD_LABELS[selected.paymentMethod] || selected.paymentMethod} ·{' '}
                  {PAYMENT_STATUS_LABELS[selected.paymentStatus] || selected.paymentStatus}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{paymentMetaLine(selected)}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0', fontSize: '0.72rem', color: '#94a3b8' }}>Item</th>
                    <th style={{ textAlign: 'center', padding: '0.5rem 0', fontSize: '0.72rem', color: '#94a3b8' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0', fontSize: '0.72rem', color: '#94a3b8' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(selected.items || []).map((item, idx) => (
                    <tr key={`${item.id}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 0' }}>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          {[item.sizeLabel, item.weightLabel].filter(Boolean).join(' · ')}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{item.qty}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {money(item.lineTotal ?? item.price * item.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: '#475569' }}>
                  <span>Subtotal</span>
                  <span>{money(selected.subtotal ?? selected.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: '#475569' }}>
                  <span>Shipping</span>
                  <span>{money(selected.shippingFee || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', fontWeight: 800, fontSize: '1.05rem' }}>
                  <span>Total</span>
                  <span>{money(selected.total)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
