export const ORDER_STATUSES = ['confirmed', 'paid', 'shipped', 'delivered', 'cancelled'];

export const STATUS_LABELS = {
  confirmed: 'Confirmed',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

/** Allowed forward transitions (Zoho-style fulfillment workflow) */
export const ALLOWED_TRANSITIONS = {
  confirmed: ['paid', 'shipped', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function isValidStatus(status) {
  return ORDER_STATUSES.includes(status);
}

export function canTransition(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to)) return false;
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAllowedNextStatuses(currentStatus) {
  if (!isValidStatus(currentStatus)) return ORDER_STATUSES;
  return [currentStatus, ...(ALLOWED_TRANSITIONS[currentStatus] || [])];
}

export function buildStatusUpdate(currentOrder, newStatus, adminName = 'Admin') {
  const from = currentOrder.status;
  if (!canTransition(from, newStatus)) {
    return {
      error: `Cannot change status from "${STATUS_LABELS[from]}" to "${STATUS_LABELS[newStatus]}"`,
    };
  }

  const now = new Date();
  const updates = { status: newStatus };
  const historyEntry = {
    from,
    to: newStatus,
    changedAt: now,
    changedBy: adminName,
  };

  const timestamps = { ...(currentOrder.statusTimestamps || {}) };
  if (newStatus === 'confirmed' && !timestamps.confirmedAt) timestamps.confirmedAt = now;
  if (newStatus === 'paid' && !timestamps.paidAt) timestamps.paidAt = now;
  if (newStatus === 'shipped' && !timestamps.shippedAt) timestamps.shippedAt = now;
  if (newStatus === 'delivered' && !timestamps.deliveredAt) timestamps.deliveredAt = now;
  if (newStatus === 'cancelled' && !timestamps.cancelledAt) timestamps.cancelledAt = now;

  updates.statusTimestamps = timestamps;

  // Sync payment status for COD orders
  if (newStatus === 'paid' && currentOrder.paymentStatus === 'pending_cod') {
    updates.paymentStatus = 'paid';
  }
  if (newStatus === 'delivered' && currentOrder.paymentMethod === 'cod' && currentOrder.paymentStatus === 'pending_cod') {
    updates.paymentStatus = 'paid';
    if (!timestamps.paidAt) timestamps.paidAt = now;
    updates.statusTimestamps = timestamps;
  }
  if (newStatus === 'cancelled' && currentOrder.paymentStatus === 'paid') {
    updates.paymentStatus = 'refunded';
  }

  return { updates, historyEntry };
}
