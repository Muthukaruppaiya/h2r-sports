import { useEffect, useState } from 'react';
import api from '../../api/client';
import { EMPTY_COMPANY, mergeCompany } from '../../utils/companyProfile';

const FIELDS = [
  { key: 'name', label: 'Brand / shop name', placeholder: 'H2R Sports' },
  { key: 'legalName', label: 'Legal name (invoice header)', placeholder: 'H2R Sports Private / Proprietor' },
  { key: 'tagline', label: 'Tagline', placeholder: 'Tamil Nadu Cricket Bats' },
  { key: 'phone', label: 'Phone', placeholder: '+91 93618 13878' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '+91 93618 13878' },
  { key: 'email', label: 'Email', placeholder: 'h2rsports7@gmail.com' },
  { key: 'website', label: 'Website', placeholder: 'https://h2rsports.in' },
  { key: 'gstin', label: 'GSTIN', placeholder: '33XXXXX0000X1Z5' },
  { key: 'pan', label: 'PAN', placeholder: 'ABCDE1234F' },
  { key: 'line1', label: 'Address line 1', placeholder: 'Shop / building, street', full: true },
  { key: 'line2', label: 'Address line 2', placeholder: 'Area / landmark', full: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pincode', label: 'PIN code' },
  { key: 'bankName', label: 'Bank name' },
  { key: 'accountName', label: 'Account holder' },
  { key: 'accountNumber', label: 'Account number' },
  { key: 'ifsc', label: 'IFSC' },
];

export default function CompanyDetails() {
  const [form, setForm] = useState(EMPTY_COMPANY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/admin/settings/store-address');
        if (!cancelled) setForm(mergeCompany(res.data?.storeAddress || {}));
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Could not load company details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await api.put('/admin/settings/store-address', form);
      setForm(mergeCompany(res.data?.storeAddress || form));
      setNotice('Saved. Invoices and courier stickers will use these company details.');
      window.setTimeout(() => setNotice(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="adm-empty">Loading company details…</div>;

  return (
    <div className="adm-page">
      <p className="adm-page__lead" style={{ margin: '0 0 1rem', color: '#64748b', maxWidth: '52rem' }}>
        Fill this once. Tax invoices and courier stickers pull brand name, GSTIN, address, phone, email
        and bank details from here.
      </p>

      <form className="co-form" onSubmit={save}>
        {notice ? <p className="pay-mode__notice">{notice}</p> : null}
        {error ? <p className="adm-error">{error}</p> : null}

        <section className="co-card">
          <h2>Company</h2>
          <div className="adm-form-grid">
            {FIELDS.filter((f) =>
              ['name', 'legalName', 'tagline', 'phone', 'whatsapp', 'email', 'website', 'gstin', 'pan'].includes(f.key)
            ).map((f) => (
              <label key={f.key} className={`adm-field${f.full ? ' adm-field--full' : ''}`}>
                {f.label}
                <input
                  value={form[f.key] || ''}
                  placeholder={f.placeholder}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (f.key === 'gstin' || f.key === 'pan' || f.key === 'ifsc') value = value.toUpperCase();
                    setForm((prev) => ({ ...prev, [f.key]: value }));
                  }}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="co-card">
          <h2>Registered address</h2>
          <div className="adm-form-grid">
            {FIELDS.filter((f) => ['line1', 'line2', 'city', 'state', 'pincode'].includes(f.key)).map((f) => (
              <label key={f.key} className={`adm-field${f.full ? ' adm-field--full' : ''}`}>
                {f.label}
                <input
                  value={form[f.key] || ''}
                  placeholder={f.placeholder}
                  maxLength={f.key === 'pincode' ? 6 : undefined}
                  onChange={(e) => {
                    const value =
                      f.key === 'pincode' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value;
                    setForm((prev) => ({ ...prev, [f.key]: value }));
                  }}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="co-card">
          <h2>Bank (shown on invoice)</h2>
          <div className="adm-form-grid">
            {FIELDS.filter((f) => ['bankName', 'accountName', 'accountNumber', 'ifsc'].includes(f.key)).map((f) => (
              <label key={f.key} className="adm-field">
                {f.label}
                <input
                  value={form[f.key] || ''}
                  onChange={(e) => {
                    let value = e.target.value;
                    if (f.key === 'ifsc') value = value.toUpperCase();
                    setForm((prev) => ({ ...prev, [f.key]: value }));
                  }}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="co-card">
          <h2>Invoice terms (3 points)</h2>
          <p className="adm-page__lead" style={{ margin: '0 0 0.75rem', color: '#64748b' }}>
            These three lines print on the shop bill. Leave a box empty to hide that point.
          </p>
          {[0, 1, 2].map((index) => (
            <label key={index} className="adm-field" style={{ marginBottom: '0.75rem' }}>
              Point {index + 1}
              <textarea
                rows={2}
                value={(form.invoiceTerms || [])[index] || ''}
                placeholder={['Prices shown on this bill are final.', 'Check the item before leaving the shop.', 'No return unless agreed at the counter.'][index]}
                onChange={(e) =>
                  setForm((prev) => {
                    const invoiceTerms = [0, 1, 2].map((i) =>
                      i === index ? e.target.value : (prev.invoiceTerms || [])[i] || ''
                    );
                    return { ...prev, invoiceTerms };
                  })
                }
              />
            </label>
          ))}
        </section>

        <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save company details'}
        </button>
      </form>
    </div>
  );
}
