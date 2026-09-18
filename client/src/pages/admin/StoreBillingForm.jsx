import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { mediaUrl } from '../../config/api.js';
import { money } from './StoreBilling';

const METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'upi', label: 'UPI' },
  { id: 'card', label: 'Card' },
];

function emptyLine() {
  return {
    productId: '',
    itemName: '',
    sizeId: '',
    sizeLabel: '',
    weightId: '',
    weightLabel: '',
    qty: '1',
    unitPrice: '',
  };
}

function lineFromBill(bill) {
  return {
    productId: bill.productId || '',
    itemName: bill.itemName || bill.title || '',
    sizeId: bill.sizeId || '',
    sizeLabel: bill.sizeLabel || '',
    weightId: bill.weightId || '',
    weightLabel: bill.weightLabel || '',
    qty: String(bill.qty || 1),
    unitPrice: String(bill.unitPrice ?? bill.amount ?? ''),
  };
}

function firstSellableSize(product) {
  return (
    product?.sizes?.find((s) => Math.floor(Number(s.stock) || 0) > 0) ||
    product?.sizes?.[0] ||
    null
  );
}

function fillFromProduct(product, qty = '1') {
  const size = firstSellableSize(product);
  const weight = product?.weights?.[0];
  const unitPrice = size?.price ?? product?.price ?? 0;
  return {
    productId: product.id,
    itemName: product.name,
    sizeId: size?.id || '',
    sizeLabel: size?.label || '',
    weightId: weight?.id || '',
    weightLabel: weight?.from && weight?.to ? `${weight.from}g – ${weight.to}g` : weight?.label || '',
    qty: String(qty || '1'),
    unitPrice: String(unitPrice),
  };
}

function lineTotal(line) {
  return Math.max(0, Number(line.unitPrice) || 0) * Math.max(1, Number(line.qty) || 1);
}

export default function StoreBillingForm() {
  const navigate = useNavigate();
  const { billId } = useParams();
  const isEdit = Boolean(billId);

  const [products, setProducts] = useState([]);
  const [lines, setLines] = useState([emptyLine()]);
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [soldAt, setSoldAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const requests = [api.get('/products')];
        if (isEdit) requests.push(api.get(`/admin/store-bills/${billId}`));
        const [productsRes, billRes] = await Promise.all(requests);
        if (cancelled) return;
        setProducts(productsRes.data.products || []);
        if (isEdit && billRes) {
          const bill = billRes.data.bill;
          if (!bill) {
            setError('This shop bill could not be found.');
          } else {
            const savedLines =
              Array.isArray(bill.items) && bill.items.length
                ? bill.items.map(lineFromBill)
                : [lineFromBill(bill)];
            setLines(savedLines.length ? savedLines : [emptyLine()]);
            setDiscount(String(bill.discount ?? 0));
            setPaymentMethod(bill.paymentMethod || 'cash');
            setSoldAt(
              bill.soldAt
                ? new Date(bill.soldAt).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10)
            );
            setNotes(bill.notes || '');
            setCustomerName(bill.customerName || '');
            setCustomerPhone(bill.customerPhone || '');
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || err.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [billId, isEdit]);

  const gross = useMemo(() => lines.reduce((sum, line) => sum + lineTotal(line), 0), [lines]);
  const disc = Math.min(Math.max(0, Number(discount) || 0), gross);
  const amount = Math.max(0, gross - disc);
  const batCount = lines.filter((l) => l.productId).length;

  const patchLine = (index, patch) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const onPickProduct = (index, productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      patchLine(index, emptyLine());
      return;
    }
    patchLine(index, fillFromProduct(product, lines[index]?.qty));
  };

  const onPickSize = (index, sizeId) => {
    const product = products.find((p) => p.id === lines[index].productId);
    const size = product?.sizes?.find((s) => s.id === sizeId);
    if (!size) return;
    patchLine(index, {
      sizeId: size.id,
      sizeLabel: size.label,
      unitPrice: String(size.price),
    });
  };

  const onPickWeight = (index, weightId) => {
    const product = products.find((p) => p.id === lines[index].productId);
    const weight = product?.weights?.find((w) => w.id === weightId);
    if (!weight) {
      patchLine(index, { weightId: '', weightLabel: '' });
      return;
    }
    patchLine(index, {
      weightId: weight.id,
      weightLabel: weight.from && weight.to ? `${weight.from}g – ${weight.to}g` : weight.label || '',
    });
  };

  const bumpQty = (index, delta, maxStock) => {
    const current = Math.max(1, Number(lines[index].qty) || 1);
    const next = Math.max(1, current + delta);
    const capped = maxStock > 0 ? Math.min(next, maxStock) : next;
    patchLine(index, { qty: String(capped) });
  };

  const saveBill = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const items = lines
        .filter((line) => line.productId && line.itemName)
        .map((line) => ({
          ...line,
          qty: Number(line.qty) || 1,
          unitPrice: Number(line.unitPrice) || 0,
        }));
      if (!items.length) throw new Error('Select at least one product');
      const payload = {
        items,
        discount: disc,
        amount,
        paymentMethod,
        soldAt,
        notes,
        customerName,
        customerPhone,
      };
      if (isEdit) {
        await api.put(`/admin/store-bills/${billId}`, payload);
      } else {
        await api.post('/admin/store-bills', payload);
      }
      navigate('/admin/store-billing');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="adm-empty">Loading…</div>;

  return (
    <div className="adm-page">
      <div className="adm-page__head store-bill-head">
        <div>
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            onClick={() => navigate('/admin/store-billing')}
          >
            ← Bills
          </button>
          <h1>{isEdit ? `Edit ${billId}` : 'New shop bill'}</h1>
          <p>
            {batCount ? `${batCount} bat${batCount === 1 ? '' : 's'} on this bill` : 'Add bats from inventory'}
          </p>
        </div>
      </div>

      <form className="store-bill-layout" onSubmit={saveBill}>
        {error ? <p className="adm-error store-bill-layout__error">{error}</p> : null}

        <section className="store-bill-items">
          <header className="store-bill-items__head">
            <h2>Items</h2>
            <span>{lines.length} line{lines.length === 1 ? '' : 's'}</span>
          </header>

          <div className="pos-lines">
            {lines.map((line, index) => {
              const product = products.find((p) => p.id === line.productId);
              const size = product?.sizes?.find((s) => s.id === line.sizeId) || product?.sizes?.[0];
              const stock = Math.max(0, Math.floor(Number(size?.stock) || 0));
              const thumb = mediaUrl(product?.image || product?.images?.[0] || '');
              return (
                <article key={`line-${index}`} className={`pos-line${!line.productId ? ' is-empty' : ''}`}>
                  <div className="pos-line__index">{index + 1}</div>
                  <div className="pos-line__thumb">
                    {product ? (
                      <img
                        src={thumb || '/products/placeholders/front.svg'}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.src = '/products/placeholders/front.svg';
                        }}
                      />
                    ) : (
                      <span>+</span>
                    )}
                  </div>
                  <div className="pos-line__main">
                    <select
                      required
                      className="pos-line__product"
                      value={line.productId}
                      onChange={(e) => onPickProduct(index, e.target.value)}
                    >
                      <option value="">Choose a bat…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <div className="pos-line__meta">
                      <select
                        required
                        value={line.sizeId}
                        onChange={(e) => onPickSize(index, e.target.value)}
                        disabled={!product?.sizes?.length}
                      >
                        <option value="">Size</option>
                        {(product?.sizes || []).map((s) => {
                          const left = Math.max(0, Math.floor(Number(s.stock) || 0));
                          return (
                            <option key={s.id} value={s.id}>
                              {s.label}
                              {s.stock !== undefined ? ` · ${left} left` : ''}
                            </option>
                          );
                        })}
                      </select>
                      <select
                        value={line.weightId}
                        onChange={(e) => onPickWeight(index, e.target.value)}
                        disabled={!product?.weights?.length}
                      >
                        <option value="">Weight</option>
                        {(product?.weights || []).map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.from && w.to ? `${w.from}–${w.to}g` : w.label}
                          </option>
                        ))}
                      </select>
                      {line.productId ? (
                        <span className={`pos-stock${stock > 0 ? '' : ' is-out'}`}>
                          {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="pos-line__qty" aria-label="Quantity">
                    <button type="button" onClick={() => bumpQty(index, -1, stock)} disabled={Number(line.qty) <= 1}>
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={stock || undefined}
                      value={line.qty}
                      onChange={(e) => patchLine(index, { qty: e.target.value })}
                    />
                    <button type="button" onClick={() => bumpQty(index, 1, stock)}>
                      +
                    </button>
                  </div>
                  <div className="pos-line__money">
                    <label>
                      Price
                      <input
                        type="number"
                        min="0"
                        value={line.unitPrice}
                        onChange={(e) => patchLine(index, { unitPrice: e.target.value })}
                      />
                    </label>
                    <strong>{money(lineTotal(line))}</strong>
                  </div>
                  {lines.length > 1 ? (
                    <button
                      type="button"
                      className="pos-line__remove"
                      aria-label={`Remove bat ${index + 1}`}
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  ) : (
                    <span className="pos-line__remove pos-line__remove--spacer" />
                  )}
                </article>
              );
            })}
          </div>

          <button type="button" className="pos-add" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
            + Add another bat
          </button>
        </section>

        <aside className="store-bill-summary">
          <h2>Bill summary</h2>
          <dl className="pos-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{money(gross)}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  aria-label="Bill discount"
                />
              </dd>
            </div>
            <div className="pos-totals__grand">
              <dt>To collect</dt>
              <dd>{money(amount)}</dd>
            </div>
          </dl>

          <p className="pos-label">Payment</p>
          <div className="pos-pay">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={paymentMethod === m.id ? 'is-on' : ''}
                onClick={() => setPaymentMethod(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <label className="adm-field">
            Sale date
            <input type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} />
          </label>
          <label className="adm-field">
            Customer name
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in name"
            />
          </label>
          <label className="adm-field">
            Phone
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="adm-field">
            Notes
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Counter notes"
            />
          </label>

          <div className="store-bill-actions">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : `Collect ${money(amount)}`}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => navigate('/admin/store-billing')}>
              Cancel
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
