import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RevealOnScroll from '../components/RevealOnScroll';
import { DEFAULT_PREFS, acceptAllCookies, getCookiePrefs, rejectOptionalCookies, saveCookiePrefs } from '../utils/cookieConsent';

const CATEGORIES = [
  {
    key: 'essential',
    title: 'Essential',
    locked: true,
    desc: 'Required for the site to work — keeping you logged in, remembering your cart/checkout, and security. These can\u2019t be switched off.',
  },
  {
    key: 'analytics',
    title: 'Analytics',
    locked: false,
    desc: 'Helps us understand how visitors use the site (pages viewed, popular bats) so we can improve it. No data is sold.',
  },
  {
    key: 'marketing',
    title: 'Marketing',
    locked: false,
    desc: 'Used to show you more relevant offers for H2R Sports on other platforms (e.g. Instagram/Meta, Google). Off by default.',
  },
];

export default function CookiePreferences() {
  const [prefs, setPrefs] = useState(() => getCookiePrefs() || DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return undefined;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  const toggle = (key) => {
    if (key === 'essential') return;
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = () => {
    saveCookiePrefs(prefs);
    setSaved(true);
  };

  const handleAcceptAll = () => {
    setPrefs(acceptAllCookies());
    setSaved(true);
  };

  const handleRejectAll = () => {
    setPrefs(rejectOptionalCookies());
    setSaved(true);
  };

  return (
    <main className="policy-page">
      <div className="policy-hero">
        <RevealOnScroll className="container" variant="fast">
          <p className="home-banner__eyebrow">Policies</p>
          <h1>Cookie Preferences</h1>
        </RevealOnScroll>
      </div>

      <div className="container policy-layout">
        <nav className="policy-page__nav" aria-label="Policy pages">
          <Link to="/policies/terms">Terms &amp; Policies</Link>
          <Link to="/policies/returns">No Refund Policy</Link>
          <Link to="/policies/refund-cancellation">Refund &amp; Cancellation</Link>
          <Link to="/policies/shipping">Shipping Policy</Link>
          <Link to="/policies/privacy">Privacy Policy</Link>
          <Link to="/cookie-preferences" className="is-active">
            Cookie Preferences
          </Link>
        </nav>

        <RevealOnScroll as="article" className="policy-card cookie-prefs" variant="fast">
          <p>
            We use cookies and similar storage to run {`H2R Sports`}, remember your preferences, and
            (optionally) understand how the site is used. Manage what you&apos;re comfortable with
            below — you can change this anytime.
          </p>

          <div className="cookie-prefs__list">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="cookie-prefs__row">
                <div className="cookie-prefs__row-text">
                  <strong>{cat.title}</strong>
                  {cat.locked && <span className="cookie-prefs__badge">Always on</span>}
                  <p>{cat.desc}</p>
                </div>
                <label
                  className={`cookie-toggle${prefs[cat.key] ? ' is-on' : ''}${cat.locked ? ' is-locked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={!!prefs[cat.key]}
                    disabled={cat.locked}
                    onChange={() => toggle(cat.key)}
                  />
                  <span className="cookie-toggle__track">
                    <span className="cookie-toggle__thumb" />
                  </span>
                </label>
              </div>
            ))}
          </div>

          <div className="cookie-prefs__actions">
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              Save preferences
            </button>
            <button type="button" className="btn cookie-prefs__ghost" onClick={handleAcceptAll}>
              Accept all
            </button>
            <button type="button" className="btn cookie-prefs__ghost" onClick={handleRejectAll}>
              Reject optional
            </button>
          </div>

          {saved && <p className="cookie-prefs__saved">✓ Your cookie preferences were saved.</p>}
        </RevealOnScroll>
      </div>
    </main>
  );
}
