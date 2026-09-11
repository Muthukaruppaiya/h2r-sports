import Order from '../models/Order.js';
import PendingCheckout from '../models/PendingCheckout.js';
import Notification from '../models/Notification.js';
import { getRazorpayClient, mapRazorpayMethod } from './razorpay.js';
import { sendOrderEmail } from './orderMail.js';

function publicOrder(orderDoc) {
  const order = orderDoc?.toObject ? orderDoc.toObject() : orderDoc;
  if (!order) return null;
  return {
    ...order,
    id: order.orderId,
  };
}

async function findExistingPaid({ orderId, razorpayOrderId, razorpayPaymentId }) {
  const clauses = [];
  if (orderId) clauses.push({ orderId, paymentStatus: 'paid' });
  if (razorpayPaymentId) clauses.push({ razorpayPaymentId, paymentStatus: 'paid' });
  if (razorpayOrderId) clauses.push({ razorpayOrderId, paymentStatus: 'paid' });
  if (!clauses.length) return null;
  return Order.findOne({ $or: clauses });
}

async function notifyNewOrder(order, draft) {
  try {
    const place = [draft.shipping?.city, draft.shipping?.state].filter(Boolean).join(', ');
    await Notification.create({
      type: 'order',
      title: 'New order placed',
      message: `${draft.customer?.name || 'A customer'} placed an order${
        place ? ` from ${place}` : ''
      } — ${order.currency || 'INR'} ${Number(order.total || 0).toLocaleString('en-IN')}`,
      orderId: order.orderId,
      meta: {
        customerName: draft.customer?.name || '',
        customerPhone: draft.customer?.phone || '',
        city: draft.shipping?.city || '',
        state: draft.shipping?.state || '',
        total: order.total,
        paymentMethod: order.paymentMethod,
      },
    });
  } catch (notifyErr) {
    console.warn('Order notification skipped:', notifyErr.message);
  }
}

export { publicOrder };

/**
 * Create a paid Order from a PendingCheckout after Razorpay success.
 * Safe to call twice (browser verify + webhook).
 */
export async function fulfillPaidCheckout({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature = '',
  changedBy = 'System',
  note,
}) {
  if (!razorpayOrderId || !razorpayPaymentId) {
    throw Object.assign(new Error('Missing Razorpay payment fields'), { status: 400 });
  }

  const existingPaid = await findExistingPaid({ orderId, razorpayOrderId, razorpayPaymentId });
  if (existingPaid) {
    return { created: false, order: existingPaid };
  }

  const draftQuery = orderId
    ? { orderId, razorpayOrderId }
    : { razorpayOrderId };
  const draft = await PendingCheckout.findOne(draftQuery);
  if (!draft) {
    throw Object.assign(
      new Error(
        'Checkout session expired or not found. If money was deducted, contact support with your payment ID.'
      ),
      { status: 404 }
    );
  }

  let method = 'razorpay';
  let paymentDetails = {};
  try {
    const payment = await getRazorpayClient().payments.fetch(razorpayPaymentId);
    if (payment.status && !['authorized', 'captured'].includes(payment.status)) {
      throw Object.assign(new Error(`Payment not successful (${payment.status})`), { status: 400 });
    }
    method = mapRazorpayMethod(payment.method);
    paymentDetails = {
      method: payment.method,
      bank: payment.bank || '',
      wallet: payment.wallet || '',
      vpa: payment.vpa || '',
      cardLast4: payment.card?.last4 || '',
      cardNetwork: payment.card?.network || '',
      email: payment.email || '',
      contact: payment.contact || '',
    };
  } catch (fetchErr) {
    if (fetchErr.status) throw fetchErr;
    console.warn('Razorpay payment fetch skipped:', fetchErr.message);
  }

  const now = new Date();
  const order = await Order.create({
    orderId: draft.orderId,
    status: 'ordered',
    paymentStatus: 'paid',
    paymentMethod: method,
    razorpayOrderId,
    razorpayPaymentId,
    paymentMeta: {
      gateway: 'razorpay',
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      ...paymentDetails,
      paidAt: now.toISOString(),
    },
    statusTimestamps: {
      orderedAt: now,
      paidAt: now,
      confirmedAt: now,
    },
    statusHistory: [
      {
        to: 'ordered',
        changedAt: now,
        changedBy,
        note: note || `Order placed after Razorpay payment (${razorpayPaymentId})`,
      },
    ],
    customer: draft.customer,
    shipping: draft.shipping,
    items: draft.items,
    currency: draft.currency || 'INR',
    subtotal: draft.subtotal,
    shippingFee: draft.shippingFee || 0,
    total: draft.total,
  });

  await PendingCheckout.deleteOne({ _id: draft._id });
  await notifyNewOrder(order, draft);
  sendOrderEmail(order, 'confirmed').catch(() => {});

  return { created: true, order };
}
