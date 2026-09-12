import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/store';
import { BRAND } from '../utils/india';

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('h2r_user') || 'null');
  } catch {
    return null;
  }
}

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('checking'); // checking | ok | error
  const [error, setError] = useState('');
  const user = getStoredUser();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await api.verifyEmail(token);
        if (!active) return;
        setStatus('ok');
        // Keep the local session's verified flag fresh so the account UI updates immediately.
        if (user) {
          localStorage.setItem('h2r_user', JSON.stringify({ ...user, emailVerified: true }));
        }
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.error || 'This verification link is invalid or has expired.');
        setStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const continueTo = user?.role === 'admin' ? '/admin' : '/my-orders';

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__brand">
          <img
            src={BRAND.logo}
            alt={`${BRAND.name} logo`}
            width="56"
            height="56"
            className="auth-page__logo"
          />
          <div>
            <p className="auth-page__eyebrow">Account access</p>
            <h1 className="auth-page__title">Email verification</h1>
          </div>
        </div>

        {status === 'checking' && (
          <div className="auth-page__notice auth-page__notice--info">Verifying your email…</div>
        )}

        {status === 'ok' && (
          <>
            <div className="auth-page__notice auth-page__notice--info">
              ✅ Your email is verified. You&apos;re all set.
            </div>
            <Link to={continueTo} className="btn btn-primary auth-page__submit">
              Continue
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="auth-page__error">{error}</div>
            <p className="auth-page__lead">
              Verification links expire after 24 hours. Log in and resend a new one from your
              account.
            </p>
            <Link to="/login" className="btn btn-primary auth-page__submit">
              Log in
            </Link>
          </>
        )}

        <p className="auth-page__footer">
          <Link to="/">← Back home</Link>
        </p>
      </div>
    </div>
  );
}
