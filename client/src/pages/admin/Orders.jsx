import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import InvoiceDrawer from '../../components/admin/InvoiceDrawer';
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

/** Friendlier phrasing for the one-click "move it forward" button, keyed by the target status. */
const ADVANCE_LABELS = {
  accepted: 'Accept order',
  packed: 'Mark packed',
  shipped: 'Ship order',
  delivered: 'Mark delivered',
};

/** The single forward step for a status (e.g. ordered → accepted), ignoring the cancel branch. */
function getForwardStatus(status) {
  const current = normalizeStatus(status);
  return getAllowedNextStatuses(status).find((s) => s !== current && s !== 'cancelled') || null;
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function formatOrderDate(date) {
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

/** Escapes text dropped into the label's HTML template. */
function escLabel(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

async function printAddressLabels(orders) {
  // Open the window synchronously (before any await) or popup blockers will kill it once
  // the store-address fetch below yields control back to the event loop.
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) {
    alert('Allow pop-ups to print address labels');
    return;
  }

  let storeAddress = null;
  try {
    const res = await api.get('/admin/settings/store-address');
    storeAddress = res.data?.storeAddress || null;
  } catch {
    storeAddress = null;
  }
  const hasFrom = Boolean(storeAddress?.line1 || storeAddress?.city || storeAddress?.pincode);

  const pages = orders
    .map((order, index) => {
      const s = order.shipping || {};
      const c = order.customer || {};
      const isCod = order.paymentMethod === 'cod' || order.paymentStatus === 'pending_cod';
      const itemCount = (order.items || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

      return `
        <section class="page">
          <div class="label">
            <div class="label__top">
              <div class="brand">H2R Sports</div>
              <div class="meta">Label ${index + 1} of ${orders.length}</div>
            </div>

            <div class="cod ${isCod ? 'cod--due' : 'cod--paid'}">
              ${isCod ? `COD — COLLECT ${money(order.total)}` : 'PREPAID — DO NOT COLLECT'}
            </div>

            ${
              hasFrom
                ? `<div class="block block--from">
                    <div class="block__tag">Ship From</div>
                    <div class="block__name">${escLabel(storeAddress.name || 'H2R Sports')}</div>
                    <div class="block__addr">
                      ${escLabel(storeAddress.line1)}${storeAddress.line2 ? `, ${escLabel(storeAddress.line2)}` : ''}<br/>
                      ${escLabel([storeAddress.city, storeAddress.state].filter(Boolean).join(', '))}${
                        storeAddress.pincode ? ` — ${escLabel(storeAddress.pincode)}` : ''
                      }
                      ${storeAddress.phone ? `<br/>Ph: ${escLabel(storeAddress.phone)}` : ''}
                      ${storeAddress.gstin ? `<br/>GSTIN: ${escLabel(storeAddress.gstin)}` : ''}
                    </div>
                  </div>`
                : ''
            }

            <div class="block block--to">
              <div class="block__tag">Ship To</div>
              <div class="block__name block__name--lg">${escLabel(c.name)}</div>
              <div class="block__addr block__addr--lg">
                ${escLabel(s.addressLine1)}<br/>
                ${s.addressLine2 ? `${escLabel(s.addressLine2)}<br/>` : ''}
                ${escLabel(s.city)}, ${escLabel(s.state)} — ${escLabel(s.pincode)}<br/>
                Phone: ${escLabel(c.phone)}
              </div>
            </div>

            <div class="oid-box">
              <div class="oid-box__label">Order No.</div>
              <div class="oid-box__num">${escLabel(String(order.orderId || '').toUpperCase())}</div>
            </div>

            <div class="items">
              <div class="items__head">${itemCount} item${itemCount === 1 ? '' : 's'}</div>
              ${(order.items || [])
                .map(
                  (i) =>
                    `${i.qty}× ${escLabel(i.name)}${i.sizeLabel ? ` (${escLabel(i.sizeLabel)})` : ''}${
                      i.weightLabel ? ` · ${escLabel(i.weightLabel)}` : ''
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
      .page:last-child { page-break-after: auto; break-after: auto; }
      .label {
        width: 100%;
        border: 2px solid #0f172a;
        border-radius: 12px;
        padding: 20px 24px 24px;
      }
      .label__top { display: flex; justify-content: space-between; align-items: baseline; }
      .brand { font-size: 13px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #0f172a; }
      .meta { font-size: 11px; color: #94a3b8; }
      .cod {
        margin: 12px 0 14px;
        padding: 8px 12px;
        border-radius: 8px;
        font-weight: 800;
        font-size: 15px;
        letter-spacing: 0.03em;
        text-align: center;
      }
      .cod--due { background: #fee2e2; color: #991b1b; border: 1.5px solid #fca5a5; }
      .cod--paid { background: #dcfce7; color: #166534; border: 1.5px solid #86efac; }
      .block { margin-bottom: 12px; }
      .block--from { padding-bottom: 10px; border-bottom: 1px dashed #cbd5e1; }
      .block__tag { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.04em; }
      .block__name { font-size: 14px; font-weight: 700; margin: 2px 0 4px; }
      .block__name--lg { font-size: 24px; font-weight: 800; margin: 4px 0 8px; }
      .block__addr { font-size: 12.5px; line-height: 1.55; color: #334155; }
      .block__addr--lg { font-size: 15.5px; line-height: 1.6; color: #0f172a; }
      .oid-box {
        margin: 14px 0;
        padding: 8px 12px;
        border: 1.5px solid #0f172a;
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .oid-box__label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
      .oid-box__num { font-family: 'Consolas', monospace; font-size: 18px; font-weight: 800; letter-spacing: 0.06em; }
      .items { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 13px; color: #475569; }
      .items__head { font-weight: 700; color: #0f172a; margin-bottom: 4px; }
      @media print {
        .page { min-height: auto; height: 100vh; page-break-after: always; break-after: page; }
        .page:last-child { page-break-after: auto; break-after: auto; }
      }
    </style></head><body>${pages}
    <script>window.onload = () => { setTimeout(() => window.print(), 250); }</script>
    </body></html>`);
  win.document.close();
}

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
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

  // Deep-link from notification bell: /admin/orders?highlight=<orderId>
  useEffect(() => {
    const highlight = searchParams.get('highlight');
    if (!highlight || orders.length === 0) return;
    const match = orders.find((o) => o.orderId === highlight);
    if (match) {
      setSelectedOrder(match);
      const next = new URLSearchParams(searchParams);
      next.delete('highlight');
      setSearchParams(next, { replace: true });
    }
  }, [orders, searchParams]);

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

      // Packed = ready to hand off to courier — auto-generate the shipping address
      // label right away instead of requiring a separate manual "select + print" step.
      if (normalizeStatus(newStatus) === 'packed') {
        printAddressLabels([updated]);
      }
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

  const revenuePaid = useMemo(
    () => orders.filter((o) => o.paymentStatus === 'paid').reduce((sum, o) => sum + Number(o.total || 0), 0),
    [orders]
  );

  const needsAction = (statusCounts.ordered || 0) + (statusCounts.accepted || 0);

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
      {toast && <div className={`ord-toast ord-toast--${toast.type}`}>{toast.message}</div>}

      <div className="adm-page__head">
        <div>
          <h1>Online Orders</h1>
          <p>Ordered → Accepted → Packed → Shipped (courier) → Delivered</p>
        </div>
        <div className="adm-page__actions">
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            onClick={printSelected}
            title="Select Packed orders below, then print shipping labels"
          >
            🖨️ Print addresses ({selectedIds.length})
          </button>
        </div>
      </div>

      <div className="adm-kpi-grid">
        <div className="adm-kpi" style={{ '--kpi-color': '#1e40af', '--kpi-glow': 'rgba(37,99,235,0.14)' }}>
          <div className="adm-kpi__label">Total orders</div>
          <div className="adm-kpi__value">{statusCounts.all}</div>
          <div className="adm-kpi__hint">All time</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#854d0e', '--kpi-glow': 'rgba(234,179,8,0.16)' }}>
          <div className="adm-kpi__label">Needs action</div>
          <div className="adm-kpi__value">{needsAction}</div>
          <div className="adm-kpi__hint">Ordered + Accepted</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#9a3412', '--kpi-glow': 'rgba(249,115,22,0.16)' }}>
          <div className="adm-kpi__label">Awaiting courier</div>
          <div className="adm-kpi__value">{statusCounts.packed || 0}</div>
          <div className="adm-kpi__hint">Packed &amp; ready to ship</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#166534', '--kpi-glow': 'rgba(22,163,74,0.14)' }}>
          <div className="adm-kpi__label">Revenue collected</div>
          <div className="adm-kpi__value">{money(revenuePaid)}</div>
          <div className="adm-kpi__hint">Paid orders</div>
        </div>
      </div>

      <div className="adm-filters">
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

      <div className="adm-tabs">
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
            {label}{' '}
            <span style={{ opacity: 0.85 }}>
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
        {statusFilter !== 'pending_courier' && pendingCourier.length > 0 && (
          <div className="ord-alert">
            <span>
              📦 <strong>{pendingCourier.length}</strong> order{pendingCourier.length > 1 ? 's' : ''} packed
              and waiting for courier pickup.
            </span>
            <button
              type="button"
              className="ord-alert__link"
              onClick={() => setStatusFilter('pending_courier')}
            >
              Review &amp; ship →
            </button>
          </div>
        )}

        <div className="adm-panel__head">
          <h2>Fulfillment queue</h2>
          {statusFilter === 'pending_courier' || pendingCourier.length > 0 ? (
            <label className="ord-select-hint">
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
                  const isUpdating = updatingId === order.orderId;
                  const forward = getForwardStatus(status);
                  const canCancel = status !== 'delivered' && status !== 'cancelled';
                  const items = order.items || [];
                  const extraItems = items.length - 1;

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
                        <div className="ord-order-id">#{String(order.orderId).substring(0, 12)}</div>
                        <div className="ord-order-date">{formatOrderDate(order.createdAt)}</div>
                      </td>
                      <td>
                        <div className="ord-customer">
                          <span className="ord-avatar" aria-hidden="true">
                            {initials(order.customer.name)}
                          </span>
                          <div>
                            <div className="ord-customer__name">{order.customer.name}</div>
                            <div className="ord-customer__meta">{order.customer.email}</div>
                            <div className="ord-customer__meta">{order.customer.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="ord-items">
                        {items.slice(0, 1).map((item) => (
                          <div key={`${item.id}-${item.sizeId}`} className="ord-items__line">
                            {item.qty}× {item.name}
                            <span className="ord-items__spec">
                              {' '}
                              ({item.sizeLabel}
                              {item.weightLabel ? ` · ${item.weightLabel}` : ''})
                            </span>
                          </div>
                        ))}
                        {extraItems > 0 && (
                          <span
                            className="ord-items__more"
                            title={items
                              .slice(1)
                              .map((i) => `${i.qty}× ${i.name}`)
                              .join(', ')}
                          >
                            +{extraItems} more item{extraItems > 1 ? 's' : ''}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="ord-pay">
                          <span className="ord-pay__method">{order.paymentMethod}</span>
                          <span
                            className={`adm-pill ${
                              order.paymentStatus === 'paid'
                                ? 'adm-pill--ok'
                                : order.paymentStatus === 'refunded'
                                  ? 'adm-pill--info'
                                  : 'adm-pill--warn'
                            }`}
                          >
                            {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                          </span>
                        </div>
                      </td>
                      <td className="ord-total">{money(order.total)}</td>
                      <td>
                        <div className="ord-status-cell">
                          <StatusBadge status={order.status} />
                          {forward && (
                            <button
                              type="button"
                              className="ord-advance-btn"
                              disabled={isUpdating}
                              onClick={() => requestStatusChange(order, forward)}
                            >
                              {isUpdating ? 'Updating…' : ADVANCE_LABELS[forward] || `Mark ${STATUS_LABELS[forward]}`}
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              className="ord-cancel-link"
                              disabled={isUpdating}
                              onClick={() => requestStatusChange(order, 'cancelled')}
                            >
                              Cancel order
                            </button>
                          )}
                          {!forward && !canCancel && <span className="ord-done-note">No further action</span>}
                          {order.courier?.trackingId && (
                            <div className="ord-courier-note">
                              {order.courier.name}: {order.courier.trackingId}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="ord-row-actions">
                          <button
                            type="button"
                            className="adm-btn adm-btn--ghost"
                            onClick={() => setSelectedOrder(order)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="adm-btn adm-btn--ghost"
                            onClick={() => setInvoiceOrder(order)}
                            title="Print invoice"
                          >
                            🧾 Invoice
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
              <p className="ord-modal-copy">
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
              <div className="ord-modal-actions">
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
          onPrintInvoice={() => setInvoiceOrder(selectedOrder)}
          updating={updatingId === selectedOrder.orderId}
        />
      )}

      {invoiceOrder && <InvoiceDrawer order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
    </div>
  );
}

function OrderDetailDrawer({ order, onClose, onStatusChange, onPrintInvoice, updating }) {
  const status = normalizeStatus(order.status);
  const stageIndex = getStageIndex(order.status);

  return (
    <div className="adm-drawer-backdrop" onClick={onClose}>
      <aside className="adm-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="adm-drawer__head">
          <strong>Order #{String(order.orderId).slice(0, 12)}</strong>
          <div className="inv-doc__head-actions">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onPrintInvoice}>
              🧾 Print invoice
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="adm-drawer__body">
          <div className="ord-detail__top">
            <StatusBadge status={order.status} />
            <select
              className="ord-detail__select"
              value={status}
              disabled={status === 'delivered' || status === 'cancelled' || updating}
              onChange={(e) => onStatusChange(order, e.target.value)}
            >
              {getAllowedNextStatuses(order.status).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {status !== 'cancelled' && (
            <div className="ord-timeline">
              {STATUS_STAGES.map((stage, idx) => {
                const done = stageIndex >= idx;
                const at =
                  order.statusTimestamps?.[`${stage.id}At`] ||
                  (stage.id === 'ordered' ? order.statusTimestamps?.confirmedAt : null) ||
                  (stage.id === 'accepted' ? order.statusTimestamps?.paidAt : null);
                return (
                  <div key={stage.id} className="ord-timeline__row">
                    <span className={`ord-timeline__dot${done ? ' ord-timeline__dot--done' : ''}`} />
                    <div>
                      <div className={`ord-timeline__label${done ? ' ord-timeline__label--done' : ''}`}>
                        {stage.label}
                      </div>
                      <div className="ord-timeline__desc">{stage.description}</div>
                      {at && done && <div className="ord-timeline__at">{formatStatusDate(at)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {order.courier?.trackingId && (
            <section className="ord-courier-box">
              <div className="ord-courier-box__title">Courier tracking</div>
              <div>
                <strong>{order.courier.name}</strong>
              </div>
              <div>AWB: {order.courier.trackingId}</div>
              {order.courier.trackingUrl && (
                <a href={order.courier.trackingUrl} target="_blank" rel="noreferrer">
                  Open tracking link
                </a>
              )}
              {order.courier.notes && <div style={{ marginTop: 6 }}>{order.courier.notes}</div>}
            </section>
          )}

          <section className="ord-detail-section">
            <div className="ord-detail-section__label">Customer</div>
            <div className="ord-detail-section__name">{order.customer.name}</div>
            <div className="ord-detail-section__line">{order.customer.email}</div>
            <div className="ord-detail-section__line">{order.customer.phone}</div>
          </section>

          <section className="ord-detail-section">
            <div className="ord-detail-section__label">Shipping address</div>
            <div className="ord-detail-address">
              {order.shipping.addressLine1}
              {order.shipping.addressLine2 ? (
                <>
                  <br />
                  {order.shipping.addressLine2}
                </>
              ) : null}
              <br />
              {order.shipping.city}, {order.shipping.state} — {order.shipping.pincode}
            </div>
          </section>

          <section className="ord-detail-section">
            <div className="ord-detail-section__label">Items</div>
            {(order.items || []).map((item) => (
              <div key={`${item.id}-${item.sizeId}`} className="ord-detail-item">
                <span>
                  {item.qty}× {item.name} ({item.sizeLabel}
                  {item.weightLabel ? ` · ${item.weightLabel}` : ''})
                </span>
                <strong>{money(item.lineTotal)}</strong>
              </div>
            ))}
            <div className="ord-detail-total">
              <span>Total</span>
              <span>{money(order.total)}</span>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
