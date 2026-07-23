export const ORDER_STATUSES = [
  'ordered',
  'accepted',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
];

const LEGACY_STATUS_MAP = {
  confirmed: 'ordered',
  paid: 'accepted',
};

export const STATUS_LABELS = {
  ordered: 'Ordered',
  accepted: 'Accepted',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  confirmed: 'Ordered',
  paid: 'Accepted',
};

export const STATUS_STYLES = {
  ordered: { bg: '#fef9c3', color: '#854d0e', border: '#fef08a' },
  accepted: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
  packed: { bg: '#ffedd5', color: '#9a3412', border: '#fed7aa' },
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
  ordered: ['accepted', 'cancelled'],
  accepted: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export const STATUS_STAGES = [
  { id: 'ordered', label: 'Ordered', description: 'We have received your order.' },
  { id: 'accepted', label: 'Accepted', description: 'Your order has been accepted by the shop.' },
  { id: 'packed', label: 'Packed', description: 'Your order is packed and ready for courier.' },
  { id: 'shipped', label: 'Shipped', description: 'Your order is out for delivery.' },
  { id: 'delivered', label: 'Delivered', description: 'Your order has been delivered.' },
];

export function normalizeStatus(status) {
  if (!status) return 'ordered';
  return LEGACY_STATUS_MAP[status] || status;
}

export function getStatusLabel(status) {
  return STATUS_LABELS[normalizeStatus(status)] || status;
}

export function getStatusStyle(status) {
  return STATUS_STYLES[normalizeStatus(status)] || STATUS_STYLES.ordered;
}

export function getAllowedNextStatuses(currentStatus) {
  const from = normalizeStatus(currentStatus);
  if (!ORDER_STATUSES.includes(from)) return ORDER_STATUSES;
  return [from, ...(ALLOWED_TRANSITIONS[from] || [])];
}

export function getStageIndex(status) {
  const normalized = normalizeStatus(status);
  if (normalized === 'cancelled') return -1;
  return STATUS_STAGES.findIndex((s) => s.id === normalized);
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
