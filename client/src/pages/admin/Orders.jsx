import { useEffect, useState } from 'react';
import api from '../../api/client';
import {
  getStatusLabel,
  getStatusStyle,
  getAllowedNextStatuses,
  getStageIndex,
  ORDER_STATUSES,
  STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  STATUS_STAGES,
  formatStatusDate,
} from '../../utils/orderStatus';

function StatusBadge({ status, size = 'md' }) {
  const style = getStatusStyle(status);
  const padding = size === 'sm' ? '0.25rem 0.6rem' : '0.35rem 0.8rem';
  const fontSize = size === 'sm' ? '0.7rem' : '0.75rem';

  return (
    <span
      style={{
        display: 'inline-block',
        padding,
        borderRadius: '999px',
        fontSize,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function StatusSelect({ order, onChange, disabled, updating }) {
  const options = getAllowedNextStatuses(order.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '140px' }}>
      <select
        value={order.status}
        disabled={disabled || updating}
        onChange={(e) => onChange(order, e.target.value)}
        style={{
          padding: '0.5rem 0.65rem',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          background: updating ? '#f8fafc' : 'white',
          outline: 'none',
          cursor: disabled || updating ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#0f172a',
          opacity: updating ? 0.7 : 1,
        }}
      >
        {options.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      {updating && (
        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Updating...</span>
      )}
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState(null);

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

  const updateStatus = async (order, newStatus) => {
    if (order.status === newStatus) return;

    if (newStatus === 'cancelled') {
      const confirmed = window.confirm(
        `Cancel order ${order.orderId}? This cannot be undone.`
      );
      if (!confirmed) return;
    }

    setUpdatingId(order.orderId);
    try {
      const res = await api.put(`/admin/orders/${order.orderId}/status`, { status: newStatus });
      const updated = res.data.order;
      setOrders((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
      if (selectedOrder?.orderId === updated.orderId) setSelectedOrder(updated);
      showToast('success', `Order updated to ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update status';
      showToast('error', message);
      fetchOrders();
    } finally {
      setUpdatingId(null);
    }
  };

  const statusCounts = ORDER_STATUSES.reduce((acc, status) => {
    acc[status] = orders.filter((o) => o.status === status).length;
    return acc;
  }, { all: orders.length });

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return matchesStatus;
    const haystack = [
      order.orderId,
      order.customer?.name,
      order.customer?.email,
      order.customer?.phone,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return matchesStatus && haystack.includes(q);
  });

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading orders...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
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
            fontWeight: '600',
            fontSize: '0.9rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          }}
        >
          {toast.message}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: '1.875rem', fontWeight: '800' }}>
            Orders
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Manage fulfillment workflow — Confirmed → Paid → Shipped → Delivered
          </p>
        </div>
        <input
          type="search"
          placeholder="Search order ID, name, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            minWidth: '280px',
            fontSize: '0.9rem',
            outline: 'none',
          }}
        />
      </div>

      {/* Status filter tabs — Zoho-style */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        {[
          { key: 'all', label: 'All Orders' },
          ...ORDER_STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s] })),
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '999px',
              border: statusFilter === key ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: statusFilter === key ? '#eff6ff' : 'white',
              color: statusFilter === key ? '#1d4ed8' : '#475569',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {label}
            <span
              style={{
                marginLeft: '0.4rem',
                opacity: 0.8,
                fontWeight: '700',
              }}
            >
              ({statusCounts[key] ?? 0})
            </span>
          </button>
        ))}
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          border: '1px solid #f1f5f9',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Order', 'Customer', 'Items', 'Payment', 'Total', 'Status', 'Actions'].map((col) => (
                  <th
                    key={col}
                    style={{
                      padding: '1rem',
                      color: '#475569',
                      fontWeight: '700',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.orderId}
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                >
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                      #{order.orderId.substring(0, 12)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                      {new Date(order.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600', color: '#334155' }}>{order.customer.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{order.customer.email}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{order.customer.phone}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#475569', maxWidth: '220px' }}>
                    {order.items.map((item) => (
                      <div key={`${item.id}-${item.sizeId}`} style={{ marginBottom: '0.25rem' }}>
                        {item.qty}× {item.name}
                        <span style={{ color: '#94a3b8' }}> ({item.sizeLabel})</span>
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', color: '#334155' }}>
                      {order.paymentMethod}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: '700', color: '#0f172a' }}>
                    ₹{order.total.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <StatusBadge status={order.status} />
                      <StatusSelect
                        order={order}
                        onChange={updateStatus}
                        disabled={order.status === 'delivered' || order.status === 'cancelled'}
                        updating={updatingId === order.orderId}
                      />
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        color: '#0f172a',
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    {orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={updateStatus}
          updating={updatingId === selectedOrder.orderId}
        />
      )}
    </div>
  );
}

function OrderDetailsModal({ order, onClose, onStatusChange, updating }) {
  const currentStageIndex = getEffectiveStageIndex(order);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1.5rem 1.75rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>
              Order #{order.orderId}
            </h2>
            <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              Placed {formatStatusDate(order.createdAt)}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div style={{ padding: '1.5rem 1.75rem' }}>
          <section style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Update Status
            </h3>
            <StatusSelect
              order={order}
              onChange={onStatusChange}
              disabled={order.status === 'delivered' || order.status === 'cancelled'}
              updating={updating}
            />
          </section>

          {order.status !== 'cancelled' && (
            <section style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fulfillment Timeline
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {STATUS_STAGES.map((stage, stageIdx) => {
                  const isDone = currentStageIndex >= 0 && stageIdx <= currentStageIndex;
                  const at = order.statusTimestamps?.[`${stage.id}At`];
                  return (
                    <div
                      key={stage.id}
                      style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                        opacity: isDone ? 1 : 0.45,
                      }}
                    >
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          marginTop: '0.35rem',
                          background: isDone ? '#16a34a' : '#e2e8f0',
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>
                          {stage.label}
                        </div>
                        {at && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {formatStatusDate(at)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Customer
            </h3>
            <p style={{ margin: '0.25rem 0', color: '#334155' }}>{order.customer.name}</p>
            <p style={{ margin: '0.25rem 0', color: '#64748b', fontSize: '0.9rem' }}>{order.customer.email}</p>
            <p style={{ margin: '0.25rem 0', color: '#64748b', fontSize: '0.9rem' }}>{order.customer.phone}</p>
          </section>

          <section style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Shipping
            </h3>
            <p style={{ margin: 0, color: '#334155', lineHeight: 1.6 }}>
              {order.shipping.addressLine1}
              {order.shipping.addressLine2 && <><br />{order.shipping.addressLine2}</>}
              <br />
              {order.shipping.city}, {order.shipping.state} — {order.shipping.pincode}
            </p>
          </section>

          <section style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Payment
            </h3>
            <p style={{ margin: '0.25rem 0', color: '#334155' }}>
              Method: <strong>{order.paymentMethod.toUpperCase()}</strong>
            </p>
            <p style={{ margin: '0.25rem 0', color: '#334155' }}>
              Status: <strong>{PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}</strong>
            </p>
          </section>

          {(order.statusHistory?.length > 0) && (
            <section style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Activity Log
              </h3>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.75rem 1rem', maxHeight: '160px', overflowY: 'auto' }}>
                {[...(order.statusHistory || [])].reverse().map((entry, i) => (
                  <div
                    key={`${entry.changedAt}-${i}`}
                    style={{
                      fontSize: '0.85rem',
                      color: '#475569',
                      padding: '0.35rem 0',
                      borderBottom: i < order.statusHistory.length - 1 ? '1px solid #e2e8f0' : 'none',
                    }}
                  >
                    <strong>{entry.changedBy}</strong>
                    {' '}
                    {entry.from
                      ? `changed status from ${STATUS_LABELS[entry.from]} to ${STATUS_LABELS[entry.to]}`
                      : `set status to ${STATUS_LABELS[entry.to]}`}
                    {entry.note && <span style={{ color: '#94a3b8' }}> — {entry.note}</span>}
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {formatStatusDate(entry.changedAt)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.65rem 1.5rem',
              background: '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function getEffectiveStageIndex(order) {
  if (order.status === 'cancelled') return -1;
  if (
    order.paymentMethod === 'cod' &&
    order.status === 'confirmed' &&
    order.paymentStatus === 'pending_cod'
  ) {
    return 1;
  }
  return getStageIndex(order.status);
}
