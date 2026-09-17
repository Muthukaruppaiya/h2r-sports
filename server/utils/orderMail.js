import { STORE_EMAIL, STORE_PHONE, isDeliverableEmail, isMailConfigured, escapeHtml, sendMail, brandLogoHtml } from './mailer.js';

export { isDeliverableEmail, isMailConfigured };

function rupees(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

function itemsText(order) {
  return (order.items || [])
    .map((item) => {
      const spec = [item.sizeLabel, item.weightLabel].filter(Boolean).join(' · ');
      return `- ${item.name}${spec ? ` (${spec})` : ''} x ${item.qty} · ${rupees(item.lineTotal)}`;
    })
    .join('\n');
}

function addressHtml(order) {
  const s = order.shipping || {};
  return [
    order.customer?.name,
    s.addressLine1,
    s.addressLine2,
    [s.city, s.state].filter(Boolean).join(', ') + (s.pincode ? ` — ${s.pincode}` : ''),
  ]
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join('<br/>');
}

function addressText(order) {
  const s = order.shipping || {};
  return [
    order.customer?.name,
    s.addressLine1,
    s.addressLine2,
    [s.city, s.state].filter(Boolean).join(', ') + (s.pincode ? ` — ${s.pincode}` : ''),
  ]
    .filter(Boolean)
    .join(', ');
}

function trackingUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function trackingHtml(order) {
  const courier = order.courier || {};
  const awb = String(courier.trackingId || '').trim();
  if (!awb) {
    return `<p style="margin:0 0 20px;line-height:1.5;color:#64748b;">Courier tracking will be shared if the partner provides a public AWB.</p>`;
  }
  const name = escapeHtml(courier.name || 'Courier');
  const url = trackingUrl(courier.trackingUrl);
  const notes = String(courier.notes || '').trim();
  const button = url
    ? `<p style="margin:16px 0 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#0a2540;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;font-size:14px;">Track shipment</a></p>`
    : '';
  return `<div style="margin:0 0 20px;padding:14px 16px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#4338ca;">Dispatch details</p>
    <p style="margin:0;font-size:16px;font-weight:700;">${name}</p>
    <p style="margin:6px 0 0;">Tracking / AWB: <strong>${escapeHtml(awb)}</strong></p>
    ${notes ? `<p style="margin:8px 0 0;color:#475569;font-size:13px;">${escapeHtml(notes)}</p>` : ''}
    ${button}
  </div>`;
}

function wrapEmail({ title, intro, order, extra = '', footerNote = '' }) {
  const name = escapeHtml(order.customer?.name || 'there');
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0a2540;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border:1px solid #e5e7eb;padding:28px;">
    ${brandLogoHtml()}
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#c8102e;">H2R Sports</p>
    <h1 style="margin:0 0 12px;font-size:22px;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 20px;line-height:1.5;">Hi ${name}, ${escapeHtml(intro)}</p>
    <p style="margin:0 0 4px;font-size:13px;color:#64748b;">Order ID</p>
    <p style="margin:0 0 16px;font-weight:700;font-size:16px;">${escapeHtml(order.orderId)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${itemsHtml(order)}</table>
    <p style="margin:16px 0 20px;text-align:right;font-size:16px;"><strong>Total ${rupees(order.total)}</strong></p>
    ${extra}
    <p style="margin:0 0 6px;font-size:13px;color:#64748b;">Deliver to</p>
    <p style="margin:0 0 8px;line-height:1.5;">${addressHtml(order)}</p>
    ${footerNote ? `<p style="margin:16px 0 0;font-size:13px;color:#64748b;line-height:1.5;">${escapeHtml(footerNote)}</p>` : ''}
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
      subject: `Your H2R Sports order is confirmed · ${order.orderId}`,
      title: 'Your order is confirmed',
      intro: 'thank you. We have received your payment and confirmed your order.',
      footerNote: 'We will email you again when your order is shipped, with courier and tracking details.',
    },
    packed: {
      subject: `Your order is packed · ${order.orderId}`,
      title: 'Your order is packed',
      intro: 'your order is packed and will be handed to the courier shortly.',
    },
    shipped: {
      subject: `Your order has been shipped · ${order.orderId}`,
      title: 'Your order has been sent',
      intro: 'good news — your H2R Sports order is on the way. Tracking details are below.',
      extra: trackingHtml(order),
    },
    delivered: {
      subject: `Your order was delivered · ${order.orderId}`,
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
    html: wrapEmail({
      title: t.title,
      intro: t.intro,
      order,
      extra: t.extra || '',
      footerNote: t.footerNote || '',
    }),
    text: [
      t.title,
      `Hi ${order.customer?.name || 'there'}, ${t.intro}`,
      `Order ${order.orderId}`,
      itemsText(order),
      `Total ${rupees(order.total)}`,
      trackingLine,
      `Deliver to: ${addressText(order)}`,
      t.footerNote,
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
  if (!isMailConfigured()) {
    console.warn('Order email skipped: set SMTP_USER and SMTP_PASS on the sending mailbox (not the client Gmail).');
    return { sent: false, reason: 'not-configured' };
  }

  const message = buildMessage(order, event);
  if (!message) return { sent: false, reason: 'unknown-event' };

  const customerEmail = String(order.customer?.email || '').trim();
  const toCustomer = isDeliverableEmail(customerEmail);
  const to = toCustomer ? customerEmail : STORE_EMAIL;
  const bcc = toCustomer && STORE_EMAIL.toLowerCase() !== customerEmail.toLowerCase() ? STORE_EMAIL : undefined;

  return sendMail({ to, bcc, subject: message.subject, text: message.text, html: message.html });
}
