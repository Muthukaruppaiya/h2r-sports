import { BRAND } from '../../utils/india';
import { PAYMENT_STATUS_LABELS } from '../../utils/orderStatus';

const METHOD_LABELS = { upi: 'UPI', card: 'Card', cod: 'COD' };

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function shortId(orderId = '') {
  return `#${String(orderId).slice(0, 8).toUpperCase()}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function paymentMetaLine(order) {
  const meta = order.paymentMeta || {};
  if (order.paymentMethod === 'upi' && meta.upiId) return meta.upiId;
  if (order.paymentMethod === 'card') {
    const last4 = meta.cardLast4 ? `•••• ${meta.cardLast4}` : '';
    return [meta.cardName, last4].filter(Boolean).join(' · ') || 'Card';
  }
  return METHOD_LABELS[order.paymentMethod] || order.paymentMethod || '—';
}

/**
 * Printable tax invoice / payment receipt for a single order.
 * Reused by Admin → Billing ("View bill") and Admin → Orders ("Invoice").
 * Print CSS (`.invoice-doc` @media print rules) lives in index.css so it
 * applies no matter which page renders this drawer.
 */
export default function InvoiceDrawer({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="adm-drawer-backdrop" onClick={onClose}>
      <aside className="adm-drawer invoice-doc" onClick={(e) => e.stopPropagation()}>
        <div className="adm-drawer__head no-print">
          <strong>Invoice {shortId(order.orderId)}</strong>
          <div className="inv-doc__head-actions">
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => window.print()}>
              🖨️ Print / PDF
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="adm-drawer__body">
          <div className="inv-doc__top">
            <div className="inv-doc__brand">
              <img src={BRAND.logo} alt="" width={44} height={44} />
              <div>
                <div className="inv-doc__brand-name">{BRAND.name}</div>
                <div className="inv-doc__brand-sub">Tax invoice / payment receipt</div>
                <div className="inv-doc__brand-sub">
                  {BRAND.phone} · {BRAND.email}
                </div>
              </div>
            </div>
            <div className="inv-doc__meta">
              <div>{formatDate(order.createdAt)}</div>
              <div className="inv-doc__meta-id">{shortId(order.orderId)}</div>
            </div>
          </div>

          <div className="inv-doc__parties">
            <div>
              <div className="inv-doc__label">Billed to</div>
              <div className="inv-doc__name">{order.customer?.name}</div>
              <div className="inv-doc__line">{order.customer?.email}</div>
              <div className="inv-doc__line">{order.customer?.phone}</div>
            </div>
            <div>
              <div className="inv-doc__label">Ship to</div>
              <div className="inv-doc__line">
                {order.shipping?.addressLine1}
                {order.shipping?.addressLine2 ? (
                  <>
                    <br />
                    {order.shipping.addressLine2}
                  </>
                ) : null}
                <br />
                {order.shipping?.city}, {order.shipping?.state} — {order.shipping?.pincode}
              </div>
            </div>
          </div>

          <div className="inv-doc__section">
            <div className="inv-doc__label">Payment</div>
            <div className="inv-doc__name">
              {METHOD_LABELS[order.paymentMethod] || order.paymentMethod} ·{' '}
              {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
            </div>
            <div className="inv-doc__line">{paymentMetaLine(order)}</div>
          </div>

          <table className="inv-doc__table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="inv-doc__col-qty">Qty</th>
                <th className="inv-doc__col-amt">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, idx) => (
                <tr key={`${item.id}-${idx}`}>
                  <td>
                    <div className="inv-doc__item-name">{item.name}</div>
                    <div className="inv-doc__item-spec">
                      {[item.sizeLabel, item.weightLabel].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td className="inv-doc__col-qty">{item.qty}</td>
                  <td className="inv-doc__col-amt">{money(item.lineTotal ?? item.price * item.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="inv-doc__totals">
            <div className="inv-doc__totals-row">
              <span>Subtotal</span>
              <span>{money(order.subtotal ?? order.total)}</span>
            </div>
            <div className="inv-doc__totals-row">
              <span>Shipping</span>
              <span>{money(order.shippingFee || 0)}</span>
            </div>
            <div className="inv-doc__totals-row inv-doc__totals-row--grand">
              <span>Total</span>
              <span>{money(order.total)}</span>
            </div>
          </div>

          <p className="inv-doc__footnote">
            Prices are inclusive of GST. All sales final — see our No Refund &amp; Cancellation policy.
          </p>
        </div>
      </aside>
    </div>
  );
}
