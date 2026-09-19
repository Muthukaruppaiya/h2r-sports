import { useEffect, useState } from 'react';
import { BRAND } from '../../utils/india';
import { amountInWords } from '../../utils/amountInWords';
import { companyAddressText, fetchCompany, mergeCompany } from '../../utils/companyProfile';

const METHOD_LABELS = { upi: 'UPI', card: 'Card', cod: 'COD', netbanking: 'Netbanking', razorpay: 'Online' };

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function invoiceNo(orderId = '') {
  return String(orderId || '').toUpperCase();
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function addressBlock(parts) {
  return parts.filter(Boolean).join('\n');
}

export default function InvoiceDrawer({ order, onClose }) {
  const [company, setCompany] = useState(() => mergeCompany());

  useEffect(() => {
    let cancelled = false;
    fetchCompany().then((data) => {
      if (!cancelled) setCompany(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!order) return null;

  const legal = company.legalName || company.name;
  const sellerAddress = addressBlock([
    legal,
    companyAddressText(company),
    company.phone ? `Phone: ${company.phone}` : '',
    company.whatsapp ? `WhatsApp: ${company.whatsapp}` : '',
    company.email ? `Email: ${company.email}` : '',
    company.website || '',
  ]);
  const ship = order.shipping || {};
  const buyer = order.customer || {};
  const billAddress = addressBlock([
    buyer.name,
    ship.addressLine1,
    ship.addressLine2,
    [ship.city, ship.state].filter(Boolean).join(', '),
    ship.pincode ? `PIN: ${ship.pincode}` : '',
    buyer.phone ? `Phone: ${buyer.phone}` : '',
    buyer.email ? `Email: ${buyer.email}` : '',
  ]);
  const items = order.items || [];
  const shippingFee = Number(order.shippingFee) || 0;
  const rows = items.map((item) => {
    const qty = Math.max(1, Number(item.qty) || 1);
    const unit = Number(item.price) || 0;
    const line = Number(item.lineTotal ?? unit * qty);
    return {
      name: item.name,
      spec: [item.sizeLabel, item.weightLabel].filter(Boolean).join(' · '),
      qty,
      unit,
      line,
    };
  });
  if (shippingFee > 0) {
    rows.push({ name: 'Shipping charges', spec: '', qty: 1, unit: shippingFee, line: shippingFee });
  }
  const subtotal = Number(order.subtotal) || items.reduce((sum, item) => sum + Number(item.lineTotal ?? item.price * item.qty), 0);
  const total = Number(order.total) || subtotal + shippingFee;
  const terms = (company.invoiceTerms || []).filter(Boolean).slice(0, 3);
  const invoiceDetails = order.razorpayPaymentId || order.razorpayOrderId || '—';

  return (
    <div className="adm-drawer-backdrop" onClick={onClose}>
      <aside className="adm-drawer invoice-doc" onClick={(e) => e.stopPropagation()}>
        <div className="adm-drawer__head no-print">
          <strong>Invoice {invoiceNo(order.orderId)}</strong>
          <div className="inv-doc__head-actions">
            <button type="button" className="adm-btn adm-btn--primary" onClick={() => window.print()}>
              Print / PDF
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="adm-drawer__body">
          <div className="amz-inv">
            <div className="amz-inv__banner">
              <div className="amz-inv__brand">
                <img src={BRAND.logo} alt="" />
                <div>
                  <h1>{legal}</h1>
                  {company.tagline ? <p>{company.tagline}</p> : null}
                  {company.website ? <p>{company.website}</p> : null}
                </div>
              </div>
              <div className="amz-inv__kind">
                <span>Invoice</span>
                <strong>{invoiceNo(order.orderId)}</strong>
                <em>(Original for recipient)</em>
              </div>
            </div>

            <div className="amz-inv__grid">
              <div>
                <strong>Sold by</strong>
                <p>{sellerAddress}</p>
                {company.pan ? <p>PAN: {company.pan}</p> : null}
              </div>
              <div>
                <strong>Billing address</strong>
                <p>{billAddress}</p>
              </div>
              <div className="amz-inv__ship">
                <strong>Shipping address</strong>
                <p>{billAddress}</p>
              </div>
            </div>

            <div className="amz-inv__ids">
              <div>
                Order number: <b>{order.orderId}</b>
                <br />
                Order date: <b>{formatDate(order.createdAt)}</b>
              </div>
              <div>
                Invoice date: <b>{formatDate(order.createdAt)}</b>
                <br />
                Payment: <b>{METHOD_LABELS[order.paymentMethod] || order.paymentMethod || 'Online'}</b>
                <br />
                Ref: <b>{invoiceDetails}</b>
              </div>
            </div>

            <table className="amz-inv__table">
              <colgroup>
                <col className="amz-inv__col-no" />
                <col />
                <col className="amz-inv__col-num" />
                <col className="amz-inv__col-qty" />
                <col className="amz-inv__col-num" />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item description</th>
                  <th>Unit price</th>
                  <th>Qty</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${row.name}-${idx}`}>
                    <td className="amz-inv__no">{idx + 1}</td>
                    <td>
                      <b>{row.name}</b>
                      {row.spec ? <div className="amz-inv__spec">{row.spec}</div> : null}
                    </td>
                    <td className="amz-inv__num">{money(row.unit)}</td>
                    <td className="amz-inv__qty">
                      <span>{row.qty}</span>
                    </td>
                    <td className="amz-inv__amt">{money(row.line)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="amz-inv__summary">
              <div className="amz-inv__words">
                <span>Amount in words</span>
                <b>{amountInWords(total)}</b>
              </div>
              <div className="amz-inv__totals">
                <div>
                  <span>Subtotal</span>
                  <b>{money(subtotal)}</b>
                </div>
                <div>
                  <span>Shipping</span>
                  <b>{shippingFee ? money(shippingFee) : 'FREE'}</b>
                </div>
                <div className="is-grand">
                  <span>Total payable</span>
                  <b>{money(total)}</b>
                </div>
              </div>
            </div>

            <div className="amz-inv__foot">
              <div>
                {company.bankName || company.accountNumber || company.ifsc ? (
                  <div className="amz-inv__bank">
                    <strong>Bank details</strong>
                    <p>
                      {[
                        company.bankName,
                        company.accountName ? `A/c name: ${company.accountName}` : '',
                        company.accountNumber ? `A/c no: ${company.accountNumber}` : '',
                        company.ifsc ? `IFSC: ${company.ifsc}` : '',
                      ]
                        .filter(Boolean)
                        .join('\n')}
                    </p>
                  </div>
                ) : null}
                {terms.length ? (
                  <div className="amz-inv__terms">
                    <strong>Terms &amp; conditions</strong>
                    <ol>
                      {terms.map((term) => (
                        <li key={term}>{term}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}
              </div>
              <div className="amz-inv__sign">
                For {legal}
                <span>Authorised signatory</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
