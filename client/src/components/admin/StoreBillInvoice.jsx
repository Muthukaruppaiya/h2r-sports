import { useEffect, useState } from 'react';
import { BRAND } from '../../utils/india';
import { amountInWords } from '../../utils/amountInWords';
import { companyAddressText, fetchCompany, mergeCompany } from '../../utils/companyProfile';
import { money } from '../../pages/admin/StoreBilling';

function billLines(bill) {
  if (Array.isArray(bill.items) && bill.items.length) {
    return bill.items.map((line) => ({
      name: line.itemName || line.name || 'Item',
      spec: [line.sizeLabel, line.weightLabel].filter(Boolean).join(' · '),
      qty: Math.max(1, Number(line.qty) || 1),
      rate: Number(line.unitPrice ?? line.price) || 0,
    }));
  }
  return [
    {
      name: bill.itemName || 'Item',
      spec: [bill.sizeLabel, bill.weightLabel].filter(Boolean).join(' · '),
      qty: Math.max(1, Number(bill.qty) || 1),
      rate: Number(bill.unitPrice) || 0,
    },
  ];
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function Fact({ label, value }) {
  if (!value) return null;
  return (
    <div className="sb-inv__fact">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

const PAY = { cash: 'Cash', upi: 'UPI', card: 'Card' };


export default function StoreBillInvoice({ bill, onClose }) {
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

  if (!bill) return null;

  const lines = billLines(bill);
  const gross = lines.reduce((sum, line) => sum + line.rate * line.qty, 0);
  const discount = Math.min(Math.max(0, Number(bill.discount) || 0), gross);
  const total = Number(bill.amount) || Math.max(0, gross - discount);
  const legal = company.legalName || company.name;
  const address = companyAddressText(company);
  const buyer = bill.customerName || 'Walk-in customer';
  const qtyTotal = lines.reduce((n, line) => n + line.qty, 0);

  return (
    <div className="adm-drawer-backdrop" onClick={onClose}>
      <aside className="adm-drawer sb-inv-doc" onClick={(e) => e.stopPropagation()}>
        <div className="adm-drawer__head no-print">
          <strong>Shop bill {bill.billId}</strong>
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
          <div className="sb-inv">
            <div className="sb-inv__banner">
              <div className="sb-inv__brand">
                <img src={BRAND.logo} alt="" />
                <div>
                  <h1>{legal}</h1>
                  {company.name && company.legalName && company.name !== company.legalName ? (
                    <p className="sb-inv__trade">{company.name}</p>
                  ) : null}
                  {company.tagline ? <p className="sb-inv__tag">{company.tagline}</p> : null}
                  {address ? <p className="sb-inv__addr">{address}</p> : null}
                </div>
              </div>
              <div className="sb-inv__title">
                <span>Invoice no.</span>
                <strong>{bill.billId}</strong>
              </div>
            </div>

            <div className="sb-inv__meta-row">
              <div>
                <span>Invoice date</span>
                <b>{formatDate(bill.soldAt || bill.createdAt)}</b>
              </div>
              <div>
                <span>Payment mode</span>
                <b>{PAY[bill.paymentMethod] || bill.paymentMethod || 'Cash'}</b>
              </div>
              <div>
                <span>Items</span>
                <b>
                  {lines.length} line{lines.length === 1 ? '' : 's'} · {qtyTotal} qty
                </b>
              </div>
              <div>
                <span>Bill amount</span>
                <b>{money(total)}</b>
              </div>
            </div>

            <div className="sb-inv__facts">
              <Fact label="GSTIN" value={company.gstin} />
              <Fact label="PAN" value={company.pan} />
              <Fact label="Mobile" value={company.phone} />
              <Fact label="WhatsApp" value={company.whatsapp} />
              <Fact label="Email" value={company.email} />
              <Fact label="Website" value={company.website} />
            </div>

            <div className="sb-inv__parties">
              <div>
                <span>Bill to</span>
                <b>{buyer}</b>
                {bill.customerPhone ? <p>Mobile: {bill.customerPhone}</p> : <p>Walk-in counter sale</p>}
              </div>
              <div>
                <span>Ship to</span>
                <b>{buyer}</b>
                {bill.customerPhone ? <p>Mobile: {bill.customerPhone}</p> : <p>Collected at shop</p>}
              </div>
            </div>

            <table className="sb-inv__items">
              <colgroup>
                <col className="sb-inv__col-no" />
                <col />
                <col className="sb-inv__col-num" />
                <col className="sb-inv__col-num" />
                <col className="sb-inv__col-num" />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={`${line.name}-${idx}`}>
                    <td className="sb-inv__c-no">{idx + 1}</td>
                    <td>
                      <b>{line.name}</b>
                      {line.spec ? <div className="sb-inv__spec">{line.spec}</div> : null}
                    </td>
                    <td className="sb-inv__c-num">{line.qty}</td>
                    <td className="sb-inv__c-num">{money(line.rate)}</td>
                    <td className="sb-inv__c-num">{money(line.rate * line.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="sb-inv__summary">
              <div className="sb-inv__words">
                <span>Amount in words</span>
                <b>{amountInWords(total)}</b>
              </div>
              <div className="sb-inv__totals">
                <div>
                  <span>Subtotal</span>
                  <b>{money(gross)}</b>
                </div>
                <div>
                  <span>Discount</span>
                  <b>{discount ? `− ${money(discount)}` : '—'}</b>
                </div>
                <div className="is-grand">
                  <span>Total payable</span>
                  <b>{money(total)}</b>
                </div>
              </div>
            </div>

            <div className="sb-inv__bottom">
              <div>
                {company.bankName || company.accountNumber || company.ifsc || company.accountName ? (
                  <div className="sb-inv__bank">
                    <span>Bank details</span>
                    <dl>
                      {company.bankName ? (
                        <>
                          <dt>Bank</dt>
                          <dd>{company.bankName}</dd>
                        </>
                      ) : null}
                      {company.accountName ? (
                        <>
                          <dt>A/c name</dt>
                          <dd>{company.accountName}</dd>
                        </>
                      ) : null}
                      {company.accountNumber ? (
                        <>
                          <dt>A/c no.</dt>
                          <dd>{company.accountNumber}</dd>
                        </>
                      ) : null}
                      {company.ifsc ? (
                        <>
                          <dt>IFSC</dt>
                          <dd>{company.ifsc}</dd>
                        </>
                      ) : null}
                    </dl>
                  </div>
                ) : null}
                <div className="sb-inv__terms">
                  <span>Terms &amp; conditions</span>
                  <ol>
                    {(company.invoiceTerms || []).filter(Boolean).slice(0, 3).map((term) => (
                      <li key={term}>{term}</li>
                    ))}
                  </ol>
                </div>
              </div>
              <div className="sb-inv__sign">
                <span>For {legal}</span>
                <em>Authorised signatory</em>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
