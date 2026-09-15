import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/client';
import { money } from './StoreBilling';

const METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'upi', label: 'UPI' },
  { id: 'card', label: 'Card' },
];

const EMPTY = {
  productId: '',
  itemName: '',
  sizeId: '',
  sizeLabel: '',
  weightId: '',
  weightLabel: '',
  qty: '1',
  unitPrice: '',
  discount: '0',
  amount: '',
  paymentMethod: 'cash',
  soldAt: new Date().toISOString().slice(0, 10),
  notes: '',
  customerName: '',
  customerPhone: '',
};

function calcAmount(unitPrice, qty, discount) {
  const gross = Math.max(0, Number(unitPrice) || 0) * Math.max(1, Number(qty) || 1);
  const disc = Math.min(Math.max(0, Number(discount) || 0), gross);
  return Math.max(0, gross - disc);
}

export default function StoreBillingForm() {
  const navigate = useNavigate();
  const { billId } = useParams();
  const isEdit = Boolean(billId);

  const [products, setProducts] = useState([]);
  const [draft, setDraftState] = useState({ ...EMPTY });
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
            setDraftState({
              productId: bill.productId || '',
              itemName: bill.itemName || bill.title || '',
              sizeId: bill.sizeId || '',
              sizeLabel: bill.sizeLabel || '',
              weightId: bill.weightId || '',
              weightLabel: bill.weightLabel || '',
              qty: String(bill.qty || 1),
              unitPrice: String(bill.unitPrice ?? bill.amount ?? ''),
              discount: String(bill.discount ?? 0),
              amount: String(bill.amount ?? ''),
              paymentMethod: bill.paymentMethod || 'cash',
              soldAt: bill.soldAt
                ? new Date(bill.soldAt).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10),
              notes: bill.notes || '',
              customerName: bill.customerName || '',
              customerPhone: bill.customerPhone || '',
            });
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

  const selectedProduct = useMemo(() => {
    if (!draft.productId) return null;
    return products.find((p) => p.id === draft.productId) || null;
  }, [draft.productId, products]);

  const setDraft = (patch) => {
    setDraftState((prev) => {
      const next = { ...prev, ...patch };
      if (patch.unitPrice !== undefined || patch.qty !== undefined || patch.discount !== undefined) {
        next.amount = String(calcAmount(next.unitPrice, next.qty, next.discount));
      }
      return next;
    });
  };

  const onPickProduct = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      setDraft({
        productId: '',
        itemName: '',
        sizeId: '',
        sizeLabel: '',
        weightId: '',
        weightLabel: '',
        unitPrice: '',
        amount: '',
      });
      return;
    }
    const size = product.sizes?.[0];
    const weight = product.weights?.[0];
    const unitPrice = size?.price ?? product.price ?? 0;
    setDraft({
      productId: product.id,
      itemName: product.name,
      sizeId: size?.id || '',
      sizeLabel: size?.label || '',
      weightId: weight?.id || '',
      weightLabel: weight?.from && weight?.to ? `${weight.from}g – ${weight.to}g` : weight?.label || '',
      unitPrice: String(unitPrice),
      amount: String(calcAmount(unitPrice, draft.qty, draft.discount)),
    });
  };

  const onPickSize = (sizeId) => {
    const size = selectedProduct?.sizes?.find((s) => s.id === sizeId);
    if (!size) return;
    setDraft({
      sizeId: size.id,
      sizeLabel: size.label,
      unitPrice: String(size.price),
      amount: String(calcAmount(size.price, draft.qty, draft.discount)),
    });
  };

  const onPickWeight = (weightId) => {
    const weight = selectedProduct?.weights?.find((w) => w.id === weightId);
    if (!weight) {
      setDraft({ weightId: '', weightLabel: '' });
      return;
    }
    setDraft({
      weightId: weight.id,
      weightLabel: weight.from && weight.to ? `${weight.from}g – ${weight.to}g` : weight.label || '',
    });
  };

  const saveBill = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...draft,
        qty: Number(draft.qty) || 1,
        unitPrice: Number(draft.unitPrice) || 0,
        discount: Number(draft.discount) || 0,
        amount: Number(draft.amount),
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
      <div className="adm-page__head">
        <div>
          <button
            type="button"
            className="adm-btn adm-btn--ghost"
            onClick={() => navigate('/admin/store-billing')}
            style={{ marginBottom: 10 }}
          >
            ← Back to Store Billing
          </button>
          <h1>{isEdit ? `Edit shop bill — ${billId}` : 'New shop bill'}</h1>
        </div>
      </div>

      <div className="adm-panel">
        {error ? <p className="adm-error" style={{ margin: '0 0 14px' }}>{error}</p> : null}
        <form onSubmit={saveBill}>
          <div className="adm-form-grid">
            <div className="adm-field adm-field--full">
              <label>Product (from inventory)</label>
              <select required value={draft.productId} onChange={(e) => onPickProduct(e.target.value)}>
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{(p.sizes?.[0]?.price ?? p.price)?.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <div className="adm-field">
              <label>Size</label>
              <select
                required
                value={draft.sizeId}
                onChange={(e) => onPickSize(e.target.value)}
                disabled={!selectedProduct?.sizes?.length}
              >
                <option value="">Select size…</option>
                {(selectedProduct?.sizes || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — ₹{Number(s.price).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <div className="adm-field">
              <label>Weight range</label>
              <select
                value={draft.weightId}
                onChange={(e) => onPickWeight(e.target.value)}
                disabled={!selectedProduct?.weights?.length}
              >
                <option value="">No weight / optional</option>
                {(selectedProduct?.weights || []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.from && w.to ? `${w.from}g – ${w.to}g` : w.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adm-field">
              <label>Qty</label>
              <input
                type="number"
                min="1"
                value={draft.qty}
                onChange={(e) => setDraft({ qty: e.target.value })}
              />
            </div>

            <div className="adm-field">
              <label>Unit price (₹)</label>
              <input
                type="number"
                min="0"
                value={draft.unitPrice}
                onChange={(e) => setDraft({ unitPrice: e.target.value })}
              />
            </div>

            <div className="adm-field">
              <label>Discount (₹)</label>
              <input
                type="number"
                min="0"
                value={draft.discount}
                onChange={(e) => setDraft({ discount: e.target.value })}
              />
            </div>

            <div className="adm-field">
              <label>Final amount (₹)</label>
              <input type="number" min="0" value={draft.amount} readOnly />
            </div>

            <div className="adm-field">
              <label>Payment</label>
              <select value={draft.paymentMethod} onChange={(e) => setDraft({ paymentMethod: e.target.value })}>
                {METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="adm-field">
              <label>Sale date</label>
              <input type="date" value={draft.soldAt} onChange={(e) => setDraft({ soldAt: e.target.value })} />
            </div>

            <div className="adm-field adm-field--full">
              <label>Notes</label>
              <textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft({ notes: e.target.value })}
                placeholder="Optional counter notes"
              />
            </div>

            <div className="adm-field">
              <label>Customer name</label>
              <input
                value={draft.customerName}
                onChange={(e) => setDraft({ customerName: e.target.value })}
                placeholder="Ask last — walk-in name"
              />
            </div>

            <div className="adm-field">
              <label>Phone</label>
              <input
                value={draft.customerPhone}
                onChange={(e) => setDraft({ customerPhone: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : `Save shop bill${draft.amount ? ` — ${money(draft.amount)}` : ''}`}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => navigate('/admin/store-billing')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
