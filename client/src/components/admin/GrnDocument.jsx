import { useEffect, useState } from 'react';
import { BRAND } from '../../utils/india';
import { amountInWords } from '../../utils/amountInWords';
import { companyAddressText, fetchCompany, mergeCompany } from '../../utils/companyProfile';

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
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

export default function GrnDocument({ grn, onClose }) {
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

  if (!grn) return null;

  const lines = grn.items || [];
  const totalQty = Number(grn.totalQty) || lines.reduce((n, line) => n + (Number(line.qty) || 0), 0);
  const totalValue = Number(grn.totalValue) || lines.reduce((n, line) => n + (Number(line.lineTotal) || 0), 0);
  const legal = company.legalName || company.name;
  const address = companyAddressText(company);

  return (
    <div className="adm-drawer-backdrop" onClick={onClose}>
      <aside className="adm-drawer sb-inv-doc" onClick={(e) => e.stopPropagation()}>
        <div className="adm-drawer__head no-print">
          <strong>GRN {grn.grnId}</strong>
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
                <span>Goods receipt note</span>
                <strong>{grn.grnId}</strong>
              </div>
            </div>

            <div className="sb-inv__meta-row">
              <div>
                <span>Received date</span>
                <b>{formatDate(grn.receivedAt || grn.createdAt)}</b>
              </div>
              <div>
                <span>Supplier invoice</span>
                <b>{grn.invoiceNumber || '—'}</b>
              </div>
              <div>
                <span>Invoice date</span>
                <b>{formatDate(grn.invoiceDate)}</b>
              </div>
              <div>
                <span>Inward value</span>
                <b>{money(totalValue)}</b>
              </div>
            </div>

            <div className="sb-inv__facts">
              <Fact label="GSTIN" value={company.gstin} />
              <Fact label="PAN" value={company.pan} />
              <Fact label="Mobile" value={company.phone} />
              <Fact label="WhatsApp" value={company.whatsapp} />
              <Fact label="Email" value={company.email} />
            </div>

            <div className="sb-inv__parties">
              <div>
                <span>Received at</span>
                <b>{legal}</b>
                {address ? <p>{address}</p> : null}
              </div>
              <div>
                <span>Supplier</span>
                <b>{grn.supplierName || '—'}</b>
                {grn.supplierPhone ? <p>Mobile: {grn.supplierPhone}</p> : <p>No phone on file</p>}
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
                  <th>Item</th>
                  <th>Qty in</th>
                  <th>Purchase ₹</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={`${line.productId}-${idx}`}>
                    <td className="sb-inv__c-no">{idx + 1}</td>
                    <td>
                      <b>{line.itemName || line.productId}</b>
                      {line.sizeLabel ? <div className="sb-inv__spec">{line.sizeLabel}</div> : null}
                    </td>
                    <td className="sb-inv__c-num">{line.qty}</td>
                    <td className="sb-inv__c-num">{money(line.purchasePrice)}</td>
                    <td className="sb-inv__c-num">{money(line.lineTotal || line.qty * line.purchasePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="sb-inv__summary">
              <div className="sb-inv__words">
                <span>Value in words</span>
                <b>{amountInWords(totalValue)}</b>
                {grn.notes ? (
                  <p style={{ marginTop: 10, fontSize: 12 }}>
                    Notes: {grn.notes}
                  </p>
                ) : null}
              </div>
              <div className="sb-inv__totals">
                <div>
                  <span>Total qty in</span>
                  <b>{totalQty}</b>
                </div>
                <div className="is-grand">
                  <span>Total purchase value</span>
                  <b>{money(totalValue)}</b>
                </div>
              </div>
            </div>

            <div className="sb-inv__bottom">
              <div>
                <div className="sb-inv__terms">
                  <span>Acknowledgement</span>
                  <ol>
                    <li>Goods listed above were received in good condition unless noted.</li>
                    <li>Quantities have been inwarded to shop stock.</li>
                    <li>Purchase rates update last cost for stock valuation.</li>
                  </ol>
                </div>
              </div>
              <div className="sb-inv__sign">
                <span>Received by</span>
                <em>Store / authorised signatory</em>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
