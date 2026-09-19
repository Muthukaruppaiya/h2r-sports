import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { mediaUrl } from '../../config/api.js';
import GrnDocument from '../../components/admin/GrnDocument';

function emptyLine() {
  return {
    productId: '',
    itemName: '',
    sizeId: '',
    sizeLabel: '',
    qty: '1',
    purchasePrice: '',
  };
}

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function lineAmount(line) {
  return Math.max(0, Number(line.qty) || 0) * Math.max(0, Number(line.purchasePrice) || 0);
}

export default function GrnForm() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [lines, setLines] = useState([emptyLine()]);
  const [productQuery, setProductQuery] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [printGrn, setPrintGrn] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/products');
        setProducts(res.data.products || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load products');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.id, p.category, p.collection].join(' ').toLowerCase().includes(q)
    );
  }, [products, productQuery]);

  const totalQty = useMemo(
    () => lines.reduce((n, line) => n + (line.productId ? Math.max(0, Number(line.qty) || 0) : 0), 0),
    [lines]
  );
  const totalValue = useMemo(() => lines.reduce((n, line) => n + lineAmount(line), 0), [lines]);

  const setLine = (index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const pickProduct = (index, productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      setLine(index, emptyLine());
      return;
    }
    const size = product.sizes?.[0];
    setLine(index, {
      productId: product.id,
      itemName: product.name,
      sizeId: size?.id || '',
      sizeLabel: size?.label || '',
      qty: lines[index]?.qty || '1',
      purchasePrice: String(size?.price ?? product.price ?? ''),
    });
  };

  const bumpQty = (index, delta) => {
    const current = Math.max(1, Number(lines[index].qty) || 1);
    setLine(index, { qty: String(Math.max(1, current + delta)) });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const items = lines
        .filter((line) => line.productId)
        .map((line) => ({
          ...line,
          qty: Number(line.qty) || 1,
          purchasePrice: Number(line.purchasePrice) || 0,
        }));
      if (!items.length) throw new Error('Select at least one product');
      const res = await api.post('/admin/grn', {
        items,
        invoiceNumber,
        invoiceDate,
        supplierName,
        supplierPhone,
        receivedAt,
        notes,
      });
      setPrintGrn(res.data.grn);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save GRN');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="adm-empty">Loading…</div>;

  return (
    <div className="adm-page">
      <div className="adm-page__head store-bill-head">
        <div>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => navigate('/admin/grn')}>
            ← GRN list
          </button>
          <h1>New GRN</h1>
          <p>Optional invoice details. Qty in + purchase price add stock as soon as you save.</p>
        </div>
      </div>

      <form className="store-bill-layout grn-form" onSubmit={save}>
        {error ? <p className="adm-error store-bill-layout__error">{error}</p> : null}

        <section className="grn-invoice">
          <h2>Supplier invoice</h2>
          <p>All fields optional</p>
          <div className="adm-form-grid">
            <label className="adm-field">
              Invoice number
              <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-1024" />
            </label>
            <label className="adm-field">
              Invoice date
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </label>
            <label className="adm-field">
              Received date
              <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
            </label>
            <label className="adm-field">
              Supplier name
              <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Willow mill / trader" />
            </label>
            <label className="adm-field">
              Supplier phone
              <input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" />
            </label>
            <label className="adm-field adm-field--full">
              Notes
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Lot / remarks" />
            </label>
          </div>
        </section>

        <section className="store-bill-items">
          <header className="store-bill-items__head">
            <h2>Inward items</h2>
            <span>
              {totalQty} qty · {money(totalValue)}
            </span>
          </header>

          <label className="adm-field" style={{ marginBottom: '0.85rem' }}>
            Search catalogue
            <input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Filter bats by name…"
            />
          </label>

          <div className="pos-lines">
            {lines.map((line, index) => {
              const product = products.find((p) => p.id === line.productId);
              const size = product?.sizes?.find((s) => s.id === line.sizeId) || product?.sizes?.[0];
              const stock = Math.max(0, Math.floor(Number(size?.stock) || 0));
              const after = stock + Math.max(0, Number(line.qty) || 0);
              const thumb = mediaUrl(product?.image || product?.images?.[0] || '');
              const options = product && !filteredProducts.some((p) => p.id === product.id)
                ? [product, ...filteredProducts]
                : filteredProducts;
              return (
                <article key={`grn-${index}`} className={`pos-line${!line.productId ? ' is-empty' : ''}`}>
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
                      onChange={(e) => pickProduct(index, e.target.value)}
                    >
                      <option value="">Choose a bat…</option>
                      {options.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <div className="pos-line__meta">
                      <select
                        value={line.sizeId}
                        disabled={!product?.sizes?.length}
                        onChange={(e) => {
                          const next = product.sizes.find((s) => s.id === e.target.value);
                          setLine(index, { sizeId: next?.id || '', sizeLabel: next?.label || '' });
                        }}
                      >
                        <option value="">Size</option>
                        {(product?.sizes || []).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label} · now {Math.floor(Number(s.stock) || 0)}
                          </option>
                        ))}
                      </select>
                      {line.productId ? (
                        <span className="pos-stock">
                          Now {stock} → after GRN {after}
                        </span>
                      ) : (
                        <span className="pos-stock">Pick a bat to inward</span>
                      )}
                    </div>
                  </div>
                  <div className="pos-line__qty" aria-label="Quantity in">
                    <button type="button" onClick={() => bumpQty(index, -1)} disabled={Number(line.qty) <= 1}>
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={line.qty}
                      onChange={(e) => setLine(index, { qty: e.target.value })}
                    />
                    <button type="button" onClick={() => bumpQty(index, 1)}>
                      +
                    </button>
                  </div>
                  <div className="pos-line__money">
                    <label>
                      Purchase ₹
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.purchasePrice}
                        onChange={(e) => setLine(index, { purchasePrice: e.target.value })}
                      />
                    </label>
                    <strong>{money(lineAmount(line))}</strong>
                  </div>
                  {lines.length > 1 ? (
                    <button
                      type="button"
                      className="pos-line__remove"
                      aria-label="Remove line"
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
          <h2>Stock inward</h2>
          <p className="pos-label">This GRN</p>
          <dl className="pos-totals">
            <div>
              <dt>Lines</dt>
              <dd>{lines.filter((l) => l.productId).length}</dd>
            </div>
            <div>
              <dt>Qty in</dt>
              <dd>{totalQty}</dd>
            </div>
            <div>
              <dt>Purchase value</dt>
              <dd>{money(totalValue)}</dd>
            </div>
          </dl>
          <p className="pos-label">Saving will add qty to each selected size immediately.</p>
          <div className="store-bill-actions">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save GRN & inward stock'}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => navigate('/admin/grn')}>
              Cancel
            </button>
          </div>
        </aside>
      </form>
      {printGrn ? (
        <GrnDocument
          grn={printGrn}
          onClose={() => {
            setPrintGrn(null);
            navigate('/admin/grn');
          }}
        />
      ) : null}
    </div>
  );
}
