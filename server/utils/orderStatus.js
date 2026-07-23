export const ORDER_STATUSES = [
  'ordered',
  'accepted',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
];

/** Legacy statuses still present on older documents */
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
  // legacy labels for history display
  confirmed: 'Ordered',
  paid: 'Accepted',
};

export const ALLOWED_TRANSITIONS = {
  ordered: ['accepted', 'cancelled'],
  accepted: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function normalizeStatus(status) {
  if (!status) return 'ordered';
  return LEGACY_STATUS_MAP[status] || status;
}

export function isValidStatus(status) {
  const normalized = normalizeStatus(status);
  return ORDER_STATUSES.includes(normalized);
}

export function canTransition(from, to) {
  const fromN = normalizeStatus(from);
  const toN = normalizeStatus(to);
  if (!ORDER_STATUSES.includes(fromN) || !ORDER_STATUSES.includes(toN)) return false;
  if (fromN === toN) return true;
  return ALLOWED_TRANSITIONS[fromN]?.includes(toN) ?? false;
}

export function getAllowedNextStatuses(currentStatus) {
  const fromN = normalizeStatus(currentStatus);
  if (!ORDER_STATUSES.includes(fromN)) return ORDER_STATUSES;
  return [fromN, ...(ALLOWED_TRANSITIONS[fromN] || [])];
}

export function buildStatusUpdate(currentOrder, newStatus, adminName = 'Admin', courier = null) {
  const from = normalizeStatus(currentOrder.status);
  const to = normalizeStatus(newStatus);

  if (!canTransition(from, to)) {
    return {
      error: `Cannot change status from "${STATUS_LABELS[from]}" to "${STATUS_LABELS[to]}"`,
    };
  }

  if (to === 'shipped') {
    const name = String(courier?.name || '').trim();
    const trackingId = String(courier?.trackingId || '').trim();
    if (!name || !trackingId) {
      return {
        error: 'Courier name and tracking ID are required when marking as Shipped',
      };
    }
  }

  const now = new Date();
  const updates = { status: to };
  const historyEntry = {
    from: currentOrder.status,
    to,
    changedAt: now,
    changedBy: adminName,
  };

  const timestamps = { ...(currentOrder.statusTimestamps || {}) };
  if (to === 'ordered' && !timestamps.orderedAt) {
    timestamps.orderedAt = timestamps.confirmedAt || now;
  }
  if (to === 'accepted' && !timestamps.acceptedAt) {
    timestamps.acceptedAt = timestamps.paidAt || now;
  }
  if (to === 'packed' && !timestamps.packedAt) timestamps.packedAt = now;
  if (to === 'shipped' && !timestamps.shippedAt) timestamps.shippedAt = now;
  if (to === 'delivered' && !timestamps.deliveredAt) timestamps.deliveredAt = now;
  if (to === 'cancelled' && !timestamps.cancelledAt) timestamps.cancelledAt = now;

  updates.statusTimestamps = timestamps;

  if (to === 'shipped') {
    updates.courier = {
      name: String(courier.name).trim(),
      trackingId: String(courier.trackingId).trim(),
      trackingUrl: String(courier.trackingUrl || '').trim(),
      notes: String(courier.notes || '').trim(),
    };
  }

  if (to === 'cancelled' && currentOrder.paymentStatus === 'paid') {
    updates.paymentStatus = 'refunded';
  }

  return { updates, historyEntry };
}
