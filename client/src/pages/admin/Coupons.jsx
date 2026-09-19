import { useEffect, useState } from 'react';
import api from '../../api/client';

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

const emptyForm = {
  code: '',
  type: 'percent',
  value: '',
  minOrder: '0',
  maxDiscount: '',
  usageLimit: '',
  expiresAt: '',
  note: '',
  active: true,
};

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const res = await api.get('/admin/coupons');
    setCoupons(res.data.coupons || []);
  };

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load coupons');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/coupons', {
        ...form,
        value: Number(form.value) || 0,
        minOrder: Number(form.minOrder) || 0,
        maxDiscount: Number(form.maxDiscount) || 0,
        usageLimit: Number(form.usageLimit) || 0,
      });
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (coupon) => {
    await api.patch(`/admin/coupons/${coupon._id}`, { active: !coupon.active });
    await load();
  };

  const remove = async (coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
    await api.delete(`/admin/coupons/${coupon._id}`);
    await load();
  };

  if (loading) return <div className="adm-empty">Loading coupons…</div>;

  return (
    <div className="adm-page">
      <p className="adm-page__lead" style={{ margin: '0 0 1rem', color: '#64748b' }}>
        Customers enter the code on checkout. Percent is on <strong>selling price</strong> only (example: sale ₹10, 50% coupon = ₹5 off, pay ₹5). MRP is never used.
      </p>
      {error ? <p className="adm-error">{error}</p> : null}

      <form className="adm-panel" style={{ padding: '1rem', marginBottom: '1rem' }} onSubmit={save}>
        <h2 style={{ marginTop: 0 }}>New coupon</h2>
        <div className="adm-form-grid">
          <label className="adm-field">
            Code
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="H2R100"
            />
          </label>
          <label className="adm-field">
            Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="percent">Percent %</option>
              <option value="fixed">Fixed ₹</option>
            </select>
          </label>
          <label className="adm-field">
            {form.type === 'percent' ? 'Percent' : 'Amount ₹'}
            <input
              required
              type="number"
              min="1"
              step="1"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={form.type === 'percent' ? '10' : '200'}
            />
          </label>
          <label className="adm-field">
            Min order ₹
            <input type="number" min="0" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} />
          </label>
          {form.type === 'percent' ? (
            <label className="adm-field">
              Max discount ₹ (optional)
              <input type="number" min="0" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
            </label>
          ) : null}
          <label className="adm-field">
            Usage limit (0 = unlimited)
            <input type="number" min="0" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
          </label>
          <label className="adm-field">
            Expires
            <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </label>
          <label className="adm-field">
            Note
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Festival offer" />
          </label>
        </div>
        <button type="submit" className="adm-btn adm-btn--primary" disabled={saving} style={{ marginTop: '0.75rem' }}>
          {saving ? 'Saving…' : 'Add coupon'}
        </button>
      </form>

      <div className="adm-panel">
        <div className="adm-panel__head">
          <h2>Coupons</h2>
        </div>
        {coupons.length === 0 ? (
          <div className="adm-empty">No coupons yet.</div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Offer</th>
                  <th>Min order</th>
                  <th>Used</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <strong>{c.code}</strong>
                      {c.note ? <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{c.note}</div> : null}
                    </td>
                    <td>{c.type === 'percent' ? `${c.value}% off` : `${money(c.value)} off`}</td>
                    <td>{c.minOrder ? money(c.minOrder) : '—'}</td>
                    <td>
                      {c.usedCount || 0}
                      {c.usageLimit ? ` / ${c.usageLimit}` : ''}
                    </td>
                    <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td>{c.active ? 'Active' : 'Off'}</td>
                    <td>
                      <button type="button" className="adm-btn adm-btn--ghost" onClick={() => toggle(c)}>
                        {c.active ? 'Disable' : 'Enable'}
                      </button>
                      <button type="button" className="adm-btn adm-btn--ghost" onClick={() => remove(c)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
