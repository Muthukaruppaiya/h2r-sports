import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';

const METHODS = [
  { id: 'cash', label: 'Cash', bg: '#dcfce7', color: '#166534' },
  { id: 'upi', label: 'UPI', bg: '#dbeafe', color: '#1e40af' },
  { id: 'card', label: 'Card', bg: '#f3e8ff', color: '#6b21a8' },
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

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function methodStyle(id) {
  return METHODS.find((m) => m.id === id) || METHODS[0];
}

function calcAmount(unitPrice, qty, discount) {
  const gross = Math.max(0, Number(unitPrice) || 0) * Math.max(1, Number(qty) || 1);
  const disc = Math.min(Math.max(0, Number(discount) || 0), gross);
  return Math.max(0, gross - disc);
}

export default function StoreBilling() {
  const [bills, setBills] = useState([]);
  const [products, setProducts] = useState([]);
  const [totals, setTotals] = useState({
    totalSales: 0,
    bills: 0,
    byMethod: { cash: 0, upi: 0, card: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [billsRes, productsRes] = await Promise.all([
        api.get('/admin/store-bills'),
        api.get('/products'),
      ]);
      setBills(billsRes.data.bills || []);
      setTotals(
        billsRes.data.totals || { totalSales: 0, bills: 0, byMethod: { cash: 0, upi: 0, card: 0 } }
      );
      setProducts(productsRes.data.products || []);
    } catch (err) {
      console.error(err);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bills.filter((b) => {
      if (method !== 'all' && b.paymentMethod !== method) return false;
      const t = new Date(b.soldAt || b.createdAt).getTime();
      if (fromDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        if (t < start.getTime()) return false;
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        if (t > end.getTime()) return false;
      }
      if (!q) return true;
      const hay = [b.billId, b.customerName, b.customerPhone, b.itemName, b.sizeLabel, b.weightLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [bills, query, method, fromDate, toDate]);

  const selectedProduct = useMemo(() => {
    if (!modal?.draft?.productId) return null;
    return products.find((p) => p.id === modal.draft.productId) || null;
  }, [modal, products]);

  const openCreate = () => setModal({ mode: 'create', draft: { ...EMPTY } });

  const openEdit = (bill) => {
    setModal({
      mode: 'edit',
      billId: bill.billId,
      draft: {
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
      },
    });
  };

  const setDraft = (patch) => {
    setModal((prev) => {
      if (!prev) return prev;
      const next = { ...prev.draft, ...patch };
      if (
        patch.unitPrice !== undefined ||
        patch.qty !== undefined ||
        patch.discount !== undefined
      ) {
        next.amount = String(calcAmount(next.unitPrice, next.qty, next.discount));
      }
      return { ...prev, draft: next };
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
    const qty = modal?.draft?.qty || '1';
    const discount = modal?.draft?.discount || '0';
    setDraft({
      productId: product.id,
      itemName: product.name,
      sizeId: size?.id || '',
      sizeLabel: size?.label || '',
      weightId: weight?.id || '',
      weightLabel:
        weight?.from && weight?.to
          ? `${weight.from}g – ${weight.to}g`
          : weight?.label || '',
      unitPrice: String(unitPrice),
      amount: String(calcAmount(unitPrice, qty, discount)),
    });
  };

  const onPickSize = (sizeId) => {
    const size = selectedProduct?.sizes?.find((s) => s.id === sizeId);
    if (!size) return;
    const qty = modal?.draft?.qty || '1';
    const discount = modal?.draft?.discount || '0';
    setDraft({
      sizeId: size.id,
      sizeLabel: size.label,
      unitPrice: String(size.price),
      amount: String(calcAmount(size.price, qty, discount)),
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
      weightLabel:
        weight.from && weight.to ? `${weight.from}g – ${weight.to}g` : weight.label || '',
    });
  };

  const saveBill = async (e) => {
    e.preventDefault();
    if (!modal) return;
    setSaving(true);
    try {
      const payload = {
        ...modal.draft,
        qty: Number(modal.draft.qty) || 1,
        unitPrice: Number(modal.draft.unitPrice) || 0,
        discount: Number(modal.draft.discount) || 0,
        amount: Number(modal.draft.amount),
      };
      if (modal.mode === 'create') {
        await api.post('/admin/store-bills', payload);
      } else {
        await api.put(`/admin/store-bills/${modal.billId}`, payload);
      }
      setModal(null);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  const deleteBill = async (billId) => {
    if (!window.confirm('Delete this shop sale bill?')) return;
    try {
      await api.delete(`/admin/store-bills/${billId}`);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to delete');
    }
  };

  if (loading) return <div className="adm-empty">Loading store billing…</div>;

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <h1>Store Billing</h1>
          <p>Walk-in counter sales — pick products from inventory, apply discount, then customer details.</p>
        </div>
        <div className="adm-page__actions">
          <button type="button" className="adm-btn adm-btn--primary" onClick={openCreate}>
            + New shop bill
          </button>
        </div>
      </div>

      <div className="adm-kpi-grid">
        <div className="adm-kpi" style={{ '--kpi-color': '#0f172a' }}>
          <div className="adm-kpi__label">Shop sales</div>
          <div className="adm-kpi__value">{money(totals.totalSales)}</div>
          <div className="adm-kpi__hint">{totals.bills || bills.length} counter bills</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#166534' }}>
          <div className="adm-kpi__label">Cash</div>
          <div className="adm-kpi__value">{money(totals.byMethod?.cash || 0)}</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#1e40af' }}>
          <div className="adm-kpi__label">UPI</div>
          <div className="adm-kpi__value">{money(totals.byMethod?.upi || 0)}</div>
        </div>
        <div className="adm-kpi" style={{ '--kpi-color': '#6b21a8' }}>
          <div className="adm-kpi__label">Card</div>
          <div className="adm-kpi__value">{money(totals.byMethod?.card || 0)}</div>
        </div>
      </div>

      <div className="adm-filters">
        <div className="adm-field">
          <label>Search</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Customer, bat, bill…" />
        </div>
        <div className="adm-field">
          <label>Payment</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="all">All methods</option>
            {METHODS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="adm-field">
          <label>From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="adm-field">
          <label>To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      <div className="adm-panel">
        <div className="adm-panel__head">
          <h2>Physical shop sales</h2>
        </div>
        {filtered.length === 0 ? (
          <div className="adm-empty">No shop bills yet.</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Discount</th>
                  <th>Date</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((bill) => {
                  const pill = methodStyle(bill.paymentMethod);
                  return (
                    <tr key={bill.billId}>
                      <td style={{ fontWeight: 700 }}>{bill.billId}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{bill.customerName || 'Walk-in'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{bill.customerPhone || '—'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{bill.itemName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          {[bill.sizeLabel, bill.weightLabel, bill.qty ? `Qty ${bill.qty}` : '']
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </td>
                      <td>{money(bill.discount || 0)}</td>
                      <td>{formatDate(bill.soldAt)}</td>
                      <td>
                        <span className="adm-pill" style={{ background: pill.bg, color: pill.color }}>
                          {pill.label}
                        </span>
                      </td>
                      <td style={{ fontWeight: 750 }}>{money(bill.amount)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => openEdit(bill)}>
                            Edit
                          </button>
                          <button type="button" className="adm-btn adm-btn--danger" onClick={() => deleteBill(bill.billId)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="adm-drawer-backdrop" onClick={() => setModal(null)}>
          <aside className="adm-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="adm-drawer__head">
              <strong>{modal.mode === 'create' ? 'New shop bill' : `Edit ${modal.billId}`}</strong>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setModal(null)}>
                Close
              </button>
            </div>
            <form className="adm-drawer__body" onSubmit={saveBill}>
              <div className="adm-form-grid">
                <div className="adm-field adm-field--full">
                  <label>Product (from inventory)</label>
                  <select
                    required
                    value={modal.draft.productId}
                    onChange={(e) => onPickProduct(e.target.value)}
                  >
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
                    value={modal.draft.sizeId}
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
                    value={modal.draft.weightId}
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
                    value={modal.draft.qty}
                    onChange={(e) => setDraft({ qty: e.target.value })}
                  />
                </div>

                <div className="adm-field">
                  <label>Unit price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={modal.draft.unitPrice}
                    onChange={(e) => setDraft({ unitPrice: e.target.value })}
                  />
                </div>

                <div className="adm-field">
                  <label>Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={modal.draft.discount}
                    onChange={(e) => setDraft({ discount: e.target.value })}
                  />
                </div>

                <div className="adm-field">
                  <label>Final amount (₹)</label>
                  <input type="number" min="0" value={modal.draft.amount} readOnly />
                </div>

                <div className="adm-field">
                  <label>Payment</label>
                  <select
                    value={modal.draft.paymentMethod}
                    onChange={(e) => setDraft({ paymentMethod: e.target.value })}
                  >
                    {METHODS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="adm-field">
                  <label>Sale date</label>
                  <input
                    type="date"
                    value={modal.draft.soldAt}
                    onChange={(e) => setDraft({ soldAt: e.target.value })}
                  />
                </div>

                <div className="adm-field adm-field--full">
                  <label>Notes</label>
                  <textarea
                    rows={2}
                    value={modal.draft.notes}
                    onChange={(e) => setDraft({ notes: e.target.value })}
                    placeholder="Optional counter notes"
                  />
                </div>

                <div className="adm-field">
                  <label>Customer name</label>
                  <input
                    value={modal.draft.customerName}
                    onChange={(e) => setDraft({ customerName: e.target.value })}
                    placeholder="Ask last — walk-in name"
                  />
                </div>

                <div className="adm-field">
                  <label>Phone</label>
                  <input
                    value={modal.draft.customerPhone}
                    onChange={(e) => setDraft({ customerPhone: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save shop bill'}
                </button>
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setModal(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
