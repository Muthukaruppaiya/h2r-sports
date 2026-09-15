import { useEffect, useState } from 'react';
import api from '../../api/client';

const EMPTY_ADDRESS = {
  name: 'H2R Sports',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  gstin: '',
};

export default function Integrations() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressNotice, setAddressNotice] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/admin/settings/payment');
      setSettings(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  const loadAddress = async () => {
    try {
      const res = await api.get('/admin/settings/store-address');
      setAddress({ ...EMPTY_ADDRESS, ...(res.data.storeAddress || {}) });
    } catch {
      /* leave defaults — form still usable */
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadAddress();
  }, []);

  const saveAddress = async (e) => {
    e.preventDefault();
    setAddressSaving(true);
    setAddressNotice('');
    try {
      const res = await api.put('/admin/settings/store-address', address);
      setAddress({ ...EMPTY_ADDRESS, ...(res.data.storeAddress || {}) });
      setAddressNotice('Saved — shipping labels will now show this as the "Ship From" address.');
      window.setTimeout(() => setAddressNotice(''), 5000);
    } catch (err) {
      setAddressNotice(err.response?.data?.error || 'Failed to save address');
    } finally {
      setAddressSaving(false);
    }
  };

  const switchMode = async (mode) => {
    if (!settings || mode === settings.mode) return;
    const target = settings[mode];
    if (!target?.configured) {
      setError(
        `Cannot switch to ${mode.toUpperCase()} — the server is missing RAZORPAY_${mode.toUpperCase()}_KEY_ID / _KEY_SECRET.`
      );
      return;
    }
    if (mode === 'live') {
      const ok = window.confirm(
        'Switch to LIVE payments? Every checkout from now on will charge real money through your live Razorpay account. Make sure you have tested checkout fully in Test mode first.'
      );
      if (!ok) return;
    }
    setSwitching(true);
    setError('');
    setNotice('');
    try {
      const res = await api.put('/admin/settings/payment', { mode });
      setSettings(res.data);
      setNotice(`Payments are now running in ${mode.toUpperCase()} mode.`);
      window.setTimeout(() => setNotice(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to switch payment mode');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="admin-stub">
      {/* Title/subtitle already shown in the topbar above. */}
      <section className="pay-mode">
        <div className="pay-mode__head">
          <h2>Razorpay payment mode</h2>
          {settings && (
            <span className={`pay-mode__badge pay-mode__badge--${settings.mode}`}>
              {settings.mode === 'live' ? '🔴 LIVE' : '🧪 TEST'}
            </span>
          )}
        </div>
        <p className="pay-mode__lead">
          Controls whether checkout charges customers through your <strong>Test</strong> Razorpay account
          (fake money, safe to click through) or your <strong>Live</strong> account (real money). Switching
          here takes effect immediately for every new checkout — in-flight payments started before the
          switch still complete correctly under whichever mode they began in.
        </p>

        {loading ? (
          <p className="adm-muted">Loading…</p>
        ) : (
          <>
            {error ? <p className="adm-error">{error}</p> : null}
            {notice ? <p className="pay-mode__notice">{notice}</p> : null}

            <div className="pay-mode__options">
              {['test', 'live'].map((mode) => {
                const info = settings?.[mode];
                const active = settings?.mode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    className={`pay-mode__option${active ? ' is-active' : ''}${
                      !info?.configured ? ' is-disabled' : ''
                    }`}
                    onClick={() => switchMode(mode)}
                    disabled={switching || active || !info?.configured}
                  >
                    <span className="pay-mode__option-title">
                      {mode === 'live' ? 'Live' : 'Test'}
                      {active ? ' — active' : ''}
                    </span>
                    <span className="pay-mode__option-key">
                      {info?.configured ? info.keyId : 'Not configured on server'}
                    </span>
                    <span className="pay-mode__option-webhook">
                      Webhook: {info?.webhookConfigured ? 'configured' : 'not set'}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="pay-mode">
        <div className="pay-mode__head">
          <h2>Return / pickup address</h2>
        </div>
        <p className="pay-mode__lead">
          Printed as the <strong>"Ship From"</strong> block on every shipping address label (Admin →
          Online Orders → Print addresses). Leave blank and the label will simply omit this section.
        </p>

        {addressLoading ? (
          <p className="adm-muted">Loading…</p>
        ) : (
          <form className="adm-form-grid" onSubmit={saveAddress}>
            {addressNotice ? (
              <p
                className={addressNotice.startsWith('Saved') ? 'pay-mode__notice' : 'adm-error'}
                style={{ gridColumn: '1 / -1' }}
              >
                {addressNotice}
              </p>
            ) : null}
            <div className="adm-field">
              <label>Shop / sender name</label>
              <input
                value={address.name}
                onChange={(e) => setAddress((a) => ({ ...a, name: e.target.value }))}
                placeholder="H2R Sports"
              />
            </div>
            <div className="adm-field">
              <label>Phone</label>
              <input
                value={address.phone}
                onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
                placeholder="+91 99949 78963"
              />
            </div>
            <div className="adm-field adm-field--full">
              <label>Address line 1</label>
              <input
                value={address.line1}
                onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                placeholder="Shop / building, street"
              />
            </div>
            <div className="adm-field adm-field--full">
              <label>Address line 2</label>
              <input
                value={address.line2}
                onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
                placeholder="Area / landmark (optional)"
              />
            </div>
            <div className="adm-field">
              <label>City</label>
              <input
                value={address.city}
                onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
              />
            </div>
            <div className="adm-field">
              <label>State</label>
              <input
                value={address.state}
                onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
              />
            </div>
            <div className="adm-field">
              <label>PIN code</label>
              <input
                inputMode="numeric"
                maxLength={6}
                value={address.pincode}
                onChange={(e) =>
                  setAddress((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))
                }
              />
            </div>
            <div className="adm-field">
              <label>GSTIN (optional)</label>
              <input
                value={address.gstin}
                onChange={(e) => setAddress((a) => ({ ...a, gstin: e.target.value.toUpperCase() }))}
                placeholder="33XXXXX0000X1Z5"
              />
            </div>
            <div className="adm-field adm-field--full">
              <button type="submit" className="adm-btn adm-btn--primary" disabled={addressSaving}>
                {addressSaving ? 'Saving…' : 'Save address'}
              </button>
            </div>
          </form>
        )}
      </section>

      <ul>
        <li>
          <strong>Razorpay</strong> — checkout uses whichever key pair is active above. Set both
          <code>RAZORPAY_TEST_KEY_ID</code>/<code>RAZORPAY_TEST_KEY_SECRET</code> and{' '}
          <code>RAZORPAY_LIVE_KEY_ID</code>/<code>RAZORPAY_LIVE_KEY_SECRET</code> on Render so both
          options above work. Add webhook URL <code>/api/payments/razorpay/webhook</code> with{' '}
          <code>RAZORPAY_TEST_WEBHOOK_SECRET</code> / <code>RAZORPAY_LIVE_WEBHOOK_SECRET</code> for
          payment.captured.
        </li>
        <li>
          <strong>Order email</strong> — send from <code>SMTP_USER</code> (your mailbox). Client Gmail is{' '}
          <code>STORE_EMAIL</code> only (copy + reply-to). No client App Password needed.
        </li>
        <li>Shiprocket — planned</li>
        <li>WhatsApp Business API — planned</li>
      </ul>
    </div>
  );
}
