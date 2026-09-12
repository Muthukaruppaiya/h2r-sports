import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { acceptAllCookies, hasDecidedCookiePrefs, rejectOptionalCookies } from '../utils/cookieConsent';

/** Bottom consent banner shown until the visitor makes a choice (stored in localStorage). */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!hasDecidedCookiePrefs()) setVisible(true);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const dismiss = () => setVisible(false);

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <div className="cookie-banner__inner">
        <p className="cookie-banner__text">
          We use cookies to run the site and, with your consent, to understand usage and show
          relevant offers. See our{' '}
          <Link to="/policies/privacy">Privacy Policy</Link> or manage choices in{' '}
          <Link to="/cookie-preferences">Cookie Preferences</Link>.
        </p>
        <div className="cookie-banner__actions">
          <button
            type="button"
            className="cookie-banner__btn cookie-banner__btn--ghost"
            onClick={() => {
              rejectOptionalCookies();
              dismiss();
            }}
          >
            Reject optional
          </button>
          <button
            type="button"
            className="cookie-banner__btn cookie-banner__btn--primary"
            onClick={() => {
              acceptAllCookies();
              dismiss();
            }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
