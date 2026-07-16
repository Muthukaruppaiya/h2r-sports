export const ORDER_STATUSES = ['confirmed', 'paid', 'shipped', 'delivered', 'cancelled'];

export const STATUS_LABELS = {
  confirmed: 'Confirmed',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const STATUS_STYLES = {
  confirmed: { bg: '#fef9c3', color: '#854d0e', border: '#fef08a' },
  paid: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  shipped: { bg: '#e0e7ff', color: '#3730a3', border: '#c7d2fe' },
  delivered: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
};

export const PAYMENT_STATUS_LABELS = {
  pending_cod: 'COD Pending',
  paid: 'Paid',
  refunded: 'Refunded',
};

export const ALLOWED_TRANSITIONS = {
  confirmed: ['paid', 'shipped', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export const STATUS_STAGES = [
  { id: 'confirmed', label: 'Order Placed', description: 'We have received your order.' },
  { id: 'paid', label: 'Payment Confirmed', description: 'Payment has been successfully processed.' },
  { id: 'shipped', label: 'Shipped', description: 'Your order is on the way.' },
  { id: 'delivered', label: 'Delivered', description: 'Your order has been delivered.' },
];

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export function getStatusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.confirmed;
}

export function getAllowedNextStatuses(currentStatus) {
  if (!ORDER_STATUSES.includes(currentStatus)) return ORDER_STATUSES;
  return [currentStatus, ...(ALLOWED_TRANSITIONS[currentStatus] || [])];
}

export function getStageIndex(status) {
  if (status === 'cancelled') return -1;
  return STATUS_STAGES.findIndex((s) => s.id === status);
}

export function formatStatusDate(date) {
  if (!date) return null;
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
