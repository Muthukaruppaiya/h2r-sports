import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import {
  getStatusLabel,
  getStatusStyle,
  getAllowedNextStatuses,
  getStageIndex,
  normalizeStatus,
  ORDER_STATUSES,
  STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  STATUS_STAGES,
  formatStatusDate,
} from '../../utils/orderStatus';

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function StatusBadge({ status }) {
  const style = getStatusStyle(status);
  return (
    <span
      className="adm-pill"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function printAddressLabels(orders) {
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    alert('Allow pop-ups to print address labels');
    return;
  }
  const pages = orders
    .map((order, index) => {
      const s = order.shipping || {};
      const c = order.customer || {};
      return `
        <section class="page">
          <div class="label">
            <div class="brand">H2R Sports — Shipping Label</div>
            <div class="meta">Page ${index + 1} of ${orders.length}</div>
            <div class="oid">Order #${String(order.orderId || '').slice(0, 14).toUpperCase()}</div>
            <div class="to">Ship to</div>
            <div class="name">${c.name || ''}</div>
            <div class="addr">
              ${s.addressLine1 || ''}<br/>
              ${s.addressLine2 ? `${s.addressLine2}<br/>` : ''}
              ${s.city || ''}, ${s.state || ''} — ${s.pincode || ''}<br/>
              Phone: ${c.phone || ''}
            </div>
            <div class="items">
              ${(order.items || [])
                .map(
                  (i) =>
                    `${i.qty}× ${i.name}${i.sizeLabel ? ` (${i.sizeLabel})` : ''}${
                      i.weightLabel ? ` · ${i.weightLabel}` : ''
                    }`
                )
                .join('<br/>')}
            </div>
          </div>
        </section>
      `;
    })
    .join('');

  win.document.write(`<!doctype html><html><head><title>Address Labels</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0f172a; }
      .page {
        width: 100%;
        min-height: 100vh;
        page-break-after: always;
        break-after: page;
        display: flex;
        align-items: flex-start;
        padding-top: 8mm;
      }
      .page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      .label {
        width: 100%;
        border: 2px solid #0f172a;
        border-radius: 12px;
        padding: 22px 24px;
      }
      .brand { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; }
      .meta { font-size: 11px; color: #94a3b8; margin-top: 4px; }
      .oid { font-weight: 800; font-size: 22px; margin: 14px 0 18px; }
      .to { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
      .name { font-size: 26px; font-weight: 800; margin: 6px 0 10px; }
      .addr { font-size: 16px; line-height: 1.6; }
      .items { margin-top: 22px; padding-top: 14px; border-top: 1px dashed #cbd5e1; font-size: 13px; color: #475569; }
      @media print {
        .page {
          min-height: auto;
          height: 100vh;
          page-break-after: always;
          break-after: page;
        }
        .page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
      }
    </style></head><body>${pages}
    <script>window.onload = () => { setTimeout(() => window.print(), 250); }</script>
    </body></html>`);
  win.document.close();
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [courierModal, setCourierModal] = useState(null);
  const [courierForm, setCourierForm] = useState({
    name: '',
    trackingId: '',
    trackingUrl: '',
    notes: '',
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/admin/orders');
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Failed to load orders' });
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => setToast({ type, message });

  const applyStatus = async (order, newStatus, courier = null) => {
    setUpdatingId(order.orderId);
    try {
      const res = await api.put(`/admin/orders/${order.orderId}/status`, {
        status: newStatus,
        courier,
      });
      const updated = res.data.order;
      setOrders((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
      if (selectedOrder?.orderId === updated.orderId) setSelectedOrder(updated);
      showToast('success', `Order updated to ${STATUS_LABELS[normalizeStatus(newStatus)]}`);
      setCourierModal(null);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update status';
      showToast('error', message);
      fetchOrders();
    } finally {
      setUpdatingId(null);
    }
  };

  const requestStatusChange = async (order, newStatus) => {
    const current = normalizeStatus(order.status);
    const next = normalizeStatus(newStatus);
    if (current === next) return;

    if (next === 'cancelled') {
      const confirmed = window.confirm(`Cancel order ${order.orderId}? This cannot be undone.`);
      if (!confirmed) return;
    }

    if (next === 'shipped') {
      setCourierForm({
        name: order.courier?.name || '',
        trackingId: order.courier?.trackingId || '',
        trackingUrl: order.courier?.trackingUrl || '',
        notes: order.courier?.notes || '',
      });
      setCourierModal({ order, status: next });
      return;
    }

    await applyStatus(order, next);
  };

  const statusCounts = useMemo(() => {
    const counts = { all: orders.length };
    ORDER_STATUSES.forEach((status) => {
      counts[status] = orders.filter((o) => normalizeStatus(o.status) === status).length;
    });
    return counts;
  }, [orders]);

  const filteredOrders = orders.filter((order) => {
    const status = normalizeStatus(order.status);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending_courier' ? status === 'packed' : status === statusFilter);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesStatus;
    const haystack = [
      order.orderId,
      order.customer?.name,
      order.customer?.email,
      order.customer?.phone,
      order.courier?.trackingId,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return matchesStatus && haystack.includes(q);
  });

  const pendingCourier = useMemo(
    () => orders.filter((o) => normalizeStatus(o.status) === 'packed'),
    [orders]
  );

  // Only Packed orders can stay selected for courier address print
  useEffect(() => {
    const packedIds = new Set(pendingCourier.map((o) => o.orderId));
    setSelectedIds((prev) => prev.filter((id) => packedIds.has(id)));
  }, [pendingCourier]);

  const allPendingSelected =
    pendingCourier.length > 0 && pendingCourier.every((o) => selectedIds.includes(o.orderId));

  const toggleSelect = (order) => {
    if (normalizeStatus(order.status) !== 'packed') return;
    const orderId = order.orderId;
    setSelectedIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingCourier.map((o) => o.orderId));
    }
  };

  const printSelected = () => {
    const toPrint = pendingCourier.filter((o) => selectedIds.includes(o.orderId));
    if (!toPrint.length) {
      showToast('error', 'Select Packed (pending courier) orders only');
      return;
    }
    printAddressLabels(toPrint);
  };

  if (loading) return <div className="adm-empty">Loading orders…</div>;

  return (
    <div className="adm-page">
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 2000,
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            background: toast.type === 'success' ? '#166534' : '#991b1b',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          }}
        >
          {toast.message}
        </div>
      )}

      <div className="adm-page__head">
        <div>
          <h1>Online Orders</h1>
          <p>Ordered → Accepted → Packed → Shipped (courier) → Delivered</p>
        </div>
        <div className="adm-page__actions">
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            onClick={() => setStatusFilter('pending_courier')}
          >
            Pending courier ({statusCounts.packed || 0})
          </button>
          <button type="button" className="adm-btn adm-btn--primary" onClick={printSelected}>
            Print addresses ({selectedIds.length})
          </button>
        </div>
      </div>

      <div className="adm-filters" style={{ gridTemplateColumns: '1.4fr repeat(auto-fit, minmax(120px, 1fr))' }}>
        <div className="adm-field">
          <label>Search</label>
          <input
            type="search"
            placeholder="Order ID, name, email, tracking…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="adm-tabs" style={{ display: 'flex', width: '100%', marginBottom: '1rem' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'pending_courier', label: 'Pending courier' },
          ...ORDER_STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s] })),
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`adm-tabs__btn${statusFilter === key ? ' is-active' : ''}`}
            onClick={() => setStatusFilter(key)}
          >
            {label}
            <span style={{ marginLeft: 6, opacity: 0.85 }}>
              (
              {key === 'all'
                ? statusCounts.all
                : key === 'pending_courier'
                  ? statusCounts.packed || 0
                  : statusCounts[key] || 0}
              )
            </span>
          </button>
        ))}
      </div>

      <div className="adm-panel">
        <div className="adm-panel__head">
          <h2>Fulfillment queue</h2>
          {statusFilter === 'pending_courier' || pendingCourier.length > 0 ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#64748b' }}>
              <input type="checkbox" checked={allPendingSelected} onChange={toggleSelectAllPending} />
              Select all pending courier
            </label>
          ) : null}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="adm-empty">No orders match this filter.</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: 42 }} />
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const status = normalizeStatus(order.status);
                  const isPendingCourier = status === 'packed';
                  return (
                    <tr key={order.orderId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isPendingCourier && selectedIds.includes(order.orderId)}
                          disabled={!isPendingCourier}
                          onChange={() => toggleSelect(order)}
                          title={
                            isPendingCourier
                              ? 'Select for address print'
                              : 'Only Packed (pending courier) orders can be selected'
                          }
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 750, color: '#0f172a' }}>
                          #{String(order.orderId).substring(0, 12)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(order.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.customer.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{order.customer.email}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{order.customer.phone}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem', maxWidth: 220 }}>
                        {order.items.map((item) => (
                          <div key={`${item.id}-${item.sizeId}`} style={{ marginBottom: 4 }}>
                            {item.qty}× {item.name}
                            <span style={{ color: '#94a3b8' }}>
                              {' '}
                              ({item.sizeLabel}
                              {item.weightLabel ? ` · ${item.weightLabel}` : ''})
                            </span>
                          </div>
                        ))}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.82rem' }}>
                          {order.paymentMethod}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                        </div>
                      </td>
                      <td style={{ fontWeight: 750 }}>{money(order.total)}</td>
                      <td>
                        <div style={{ display: 'grid', gap: 8 }}>
                          <StatusBadge status={order.status} />
                          <select
                            className="adm-field"
                            value={status}
                            disabled={
                              status === 'delivered' ||
                              status === 'cancelled' ||
                              updatingId === order.orderId
                            }
                            onChange={(e) => requestStatusChange(order, e.target.value)}
                            style={{
                              padding: '0.45rem 0.55rem',
                              borderRadius: 8,
                              border: '1px solid #cbd5e1',
                              fontWeight: 600,
                              fontSize: '0.82rem',
                            }}
                          >
                            {getAllowedNextStatuses(order.status).map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                          {order.courier?.trackingId && (
                            <div style={{ fontSize: '0.75rem', color: '#4338ca' }}>
                              {order.courier.name}: {order.courier.trackingId}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="adm-btn adm-btn--ghost"
                          onClick={() => setSelectedOrder(order)}
                        >
                          View
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

      {courierModal && (
        <div className="adm-drawer-backdrop" onClick={() => setCourierModal(null)}>
          <aside className="adm-drawer" onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 100%)' }}>
            <div className="adm-drawer__head">
              <strong>Courier details</strong>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setCourierModal(null)}>
                Close
              </button>
            </div>
            <form
              className="adm-drawer__body"
              onSubmit={(e) => {
                e.preventDefault();
                applyStatus(courierModal.order, courierModal.status, courierForm);
              }}
            >
              <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.9rem' }}>
                Enter courier info for #{String(courierModal.order.orderId).slice(0, 12)}. Customers will see
                this for tracking.
              </p>
              <div className="adm-form-grid">
                <div className="adm-field adm-field--full">
                  <label>Courier name *</label>
                  <input
                    required
                    value={courierForm.name}
                    onChange={(e) => setCourierForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. DTDC / Delhivery / India Post"
                  />
                </div>
                <div className="adm-field adm-field--full">
                  <label>Tracking ID *</label>
                  <input
                    required
                    value={courierForm.trackingId}
                    onChange={(e) => setCourierForm((p) => ({ ...p, trackingId: e.target.value }))}
                    placeholder="AWB / tracking number"
                  />
                </div>
                <div className="adm-field adm-field--full">
                  <label>Tracking URL</label>
                  <input
                    value={courierForm.trackingUrl}
                    onChange={(e) => setCourierForm((p) => ({ ...p, trackingUrl: e.target.value }))}
                    placeholder="https://…"
                  />
                </div>
                <div className="adm-field adm-field--full">
                  <label>Notes</label>
                  <textarea
                    rows={3}
                    value={courierForm.notes}
                    onChange={(e) => setCourierForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="adm-btn adm-btn--primary">
                  Mark shipped
                </button>
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setCourierModal(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={requestStatusChange}
          updating={updatingId === selectedOrder.orderId}
        />
      )}
    </div>
  );
}

function OrderDetailDrawer({ order, onClose, onStatusChange, updating }) {
  const status = normalizeStatus(order.status);
  const stageIndex = getStageIndex(order.status);

  return (
    <div className="adm-drawer-backdrop" onClick={onClose}>
      <aside className="adm-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="adm-drawer__head">
          <strong>Order #{String(order.orderId).slice(0, 12)}</strong>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="adm-drawer__body">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
            <StatusBadge status={order.status} />
            <select
              value={status}
              disabled={status === 'delivered' || status === 'cancelled' || updating}
              onChange={(e) => onStatusChange(order, e.target.value)}
              style={{ padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 600 }}
            >
              {getAllowedNextStatuses(order.status).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {status !== 'cancelled' && (
            <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
              {STATUS_STAGES.map((stage, idx) => {
                const done = stageIndex >= idx;
                const at =
                  order.statusTimestamps?.[`${stage.id}At`] ||
                  (stage.id === 'ordered' ? order.statusTimestamps?.confirmedAt : null) ||
                  (stage.id === 'accepted' ? order.statusTimestamps?.paidAt : null);
                return (
                  <div key={stage.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        marginTop: 5,
                        borderRadius: '50%',
                        background: done ? '#16a34a' : '#cbd5e1',
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: done ? '#0f172a' : '#94a3b8' }}>{stage.label}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{stage.description}</div>
                      {at && done && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatStatusDate(at)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {order.courier?.trackingId && (
            <section style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: '#eef2ff' }}>
              <div style={{ fontWeight: 800, color: '#3730a3', marginBottom: 6 }}>Courier tracking</div>
              <div><strong>{order.courier.name}</strong></div>
              <div>AWB: {order.courier.trackingId}</div>
              {order.courier.trackingUrl && (
                <a href={order.courier.trackingUrl} target="_blank" rel="noreferrer">
                  Open tracking link
                </a>
              )}
              {order.courier.notes && <div style={{ marginTop: 6 }}>{order.courier.notes}</div>}
            </section>
          )}

          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Customer
            </div>
            <div style={{ fontWeight: 700 }}>{order.customer.name}</div>
            <div style={{ color: '#64748b' }}>{order.customer.email}</div>
            <div style={{ color: '#64748b' }}>{order.customer.phone}</div>
          </section>

          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Shipping address
            </div>
            <div style={{ lineHeight: 1.55 }}>
              {order.shipping.addressLine1}
              {order.shipping.addressLine2 ? <><br />{order.shipping.addressLine2}</> : null}
              <br />
              {order.shipping.city}, {order.shipping.state} — {order.shipping.pincode}
            </div>
          </section>

          <section style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Items
            </div>
            {(order.items || []).map((item) => (
              <div key={`${item.id}-${item.sizeId}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span>
                  {item.qty}× {item.name} ({item.sizeLabel}
                  {item.weightLabel ? ` · ${item.weightLabel}` : ''})
                </span>
                <strong>{money(item.lineTotal)}</strong>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontWeight: 800 }}>
              <span>Total</span>
              <span>{money(order.total)}</span>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
