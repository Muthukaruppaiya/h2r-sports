import nodemailer from 'nodemailer';

const STORE_EMAIL = process.env.STORE_EMAIL || 'h2rsports7@gmail.com';
const STORE_PHONE = process.env.STORE_PHONE || '+91 99949 78963';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);

const PLACEHOLDER_EMAIL = /@phone\.h2rsports\.in$/i;

let transporter = null;

export function isDeliverableEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  if (PLACEHOLDER_EMAIL.test(value)) return false;
  return true;
}

export function isMailConfigured() {
  return Boolean(SMTP_USER && SMTP_PASS);
}

function getTransporter() {
  if (!isMailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

function rupees(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function itemsHtml(order) {
  return (order.items || [])
    .map((item) => {
      const spec = [item.sizeLabel, item.weightLabel].filter(Boolean).join(' · ');
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
          ${escapeHtml(item.name)}${spec ? `<br/><span style="color:#64748b;font-size:13px;">${escapeHtml(spec)}</span>` : ''}
          <br/><span style="color:#64748b;font-size:13px;">Qty ${escapeHtml(item.qty)}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;">${rupees(item.lineTotal)}</td>
      </tr>`;
    })
    .join('');
}

function addressHtml(order) {
  const s = order.shipping || {};
  return [
    s.addressLine1,
    s.addressLine2,
    [s.city, s.state].filter(Boolean).join(', ') + (s.pincode ? ` — ${s.pincode}` : ''),
  ]
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join('<br/>');
}

function wrapEmail({ title, intro, order, extra = '' }) {
  const name = escapeHtml(order.customer?.name || 'there');
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0a2540;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #e5e7eb;padding:28px;">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#c8102e;">H2R Sports</p>
    <h1 style="margin:0 0 16px;font-size:22px;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 20px;line-height:1.5;">Hi ${name}, ${escapeHtml(intro)}</p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Order ID</p>
    <p style="margin:0 0 20px;font-weight:700;">${escapeHtml(order.orderId)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${itemsHtml(order)}</table>
    <p style="margin:16px 0 24px;text-align:right;font-size:16px;"><strong>Total ${rupees(order.total)}</strong></p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Deliver to</p>
    <p style="margin:0 0 20px;line-height:1.5;">${addressHtml(order)}</p>
    ${extra}
    <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;">
      Questions? WhatsApp / call ${escapeHtml(STORE_PHONE)} or reply to this email (${escapeHtml(STORE_EMAIL)}).
    </p>
  </div>
</body></html>`;
}

function buildMessage(order, event) {
  const courier = order.courier || {};
  const trackingLine = courier.trackingId
    ? `${courier.name || 'Courier'} · ${courier.trackingId}${courier.trackingUrl ? ` · ${courier.trackingUrl}` : ''}`
    : '';

  const templates = {
    confirmed: {
      subject: `Order confirmed · ${order.orderId}`,
      title: 'Order confirmed',
      intro: 'your payment is received and your H2R Sports order is confirmed.',
    },
    packed: {
      subject: `Order packed · ${order.orderId}`,
      title: 'Your bat is packed',
      intro: 'your order is packed and will be handed to the courier shortly.',
    },
    shipped: {
      subject: `Order dispatched · ${order.orderId}`,
      title: 'Your order is dispatched',
      intro: 'your order is on the way. Tracking details are below.',
      extra: trackingLine
        ? `<p style="margin:0 0 8px;font-size:13px;color:#64748b;">Dispatch / tracking</p>
           <p style="margin:0 0 20px;line-height:1.5;">${escapeHtml(trackingLine)}${
             courier.notes ? `<br/>${escapeHtml(courier.notes)}` : ''
           }</p>`
        : '',
    },
    delivered: {
      subject: `Delivered · ${order.orderId}`,
      title: 'Your order was delivered',
      intro: 'your H2R Sports order has been marked as delivered. Thank you for shopping with us.',
    },
    cancelled: {
      subject: `Order cancelled · ${order.orderId}`,
      title: 'Order cancelled',
      intro: 'this order has been cancelled. If money was paid, our team will process the refund.',
    },
  };

  const t = templates[event];
  if (!t) return null;
  return {
    subject: t.subject,
    html: wrapEmail({ title: t.title, intro: t.intro, order, extra: t.extra || '' }),
    text: [
      t.title,
      `Order ${order.orderId}`,
      t.intro,
      trackingLine,
      `Total ${rupees(order.total)}`,
      `Support: ${STORE_PHONE} · ${STORE_EMAIL}`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

/**
 * Best-effort transactional email. Never throws to the order flow.
 * Always copies the store inbox. Customer is To: only when they gave a real email.
 */
export async function sendOrderEmail(orderDoc, event) {
  const order = orderDoc?.toObject ? orderDoc.toObject() : orderDoc;
  if (!order) return { sent: false, reason: 'no-order' };

  const mailer = getTransporter();
  if (!mailer) {
    console.warn('Order email skipped: set SMTP_USER and SMTP_PASS on the sending mailbox (not the client Gmail).');
    return { sent: false, reason: 'not-configured' };
  }

  const message = buildMessage(order, event);
  if (!message) return { sent: false, reason: 'unknown-event' };

  const customerEmail = String(order.customer?.email || '').trim();
  const toCustomer = isDeliverableEmail(customerEmail);
  const to = toCustomer ? customerEmail : STORE_EMAIL;
  const bcc = toCustomer && STORE_EMAIL.toLowerCase() !== customerEmail.toLowerCase() ? STORE_EMAIL : undefined;

  try {
    await mailer.sendMail({
      from: `H2R Sports <${SMTP_FROM}>`,
      to,
      bcc,
      replyTo: STORE_EMAIL,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { sent: true, to, bcc: bcc || null };
  } catch (err) {
    console.warn('Order email failed:', err.message);
    return { sent: false, reason: err.message };
  }
}
