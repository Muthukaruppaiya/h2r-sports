import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

export default function Integrations() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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

  useEffect(() => {
    load();
  }, []);

  const switchMode = async (mode) => {
    if (!settings || mode === settings.mode) return;
    const target = settings[mode];
    if (!target?.configured) {
      setError(
        `Cannot switch to ${mode.toUpperCase()} — the server is missing RAZORPAY_${mode.toUpperCase()}_KEY_ID / _KEY_SECRET.`
      );
      return;
    }
    if (mode === 'test') {
      setError('This store is live-only. Checkout always uses Razorpay LIVE keys.');
      return;
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
          Checkout is locked to <strong>Razorpay LIVE</strong> (real money). Test mode is disabled for this store.
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
                    disabled={switching || active || !info?.configured || mode === 'test'}
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
          <h2>Company details</h2>
        </div>
        <p className="pay-mode__lead">
          GSTIN, address, bank and invoice footer are managed in{' '}
          <Link to="/admin/company">Online Store → Company details</Link>. Invoices and courier
          stickers read from there.
        </p>
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
