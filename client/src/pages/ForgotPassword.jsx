import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/store';
import { BRAND } from '../utils/india';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="auth-page__title">Forgot password</h1>
          </div>
        </div>

        {sent ? (
          <>
            <div className="auth-page__notice auth-page__notice--info">
              If an account exists for <strong>{email.trim()}</strong>, we&apos;ve sent a password
              reset link. Check your inbox (and spam folder) — the link expires in 1 hour.
            </div>
            <p className="auth-page__footer">
              <Link to="/login">← Back to log in</Link>
            </p>
          </>
        ) : (
          <>
            <p className="auth-page__lead">
              Enter the email address on your account and we&apos;ll send you a link to reset your
              password.
            </p>

            {error && <div className="auth-page__error">{error}</div>}

            <form className="auth-page__form" onSubmit={handleSubmit}>
              <label className="auth-page__field">
                <span>Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>

              <button type="submit" disabled={loading} className="btn btn-primary auth-page__submit">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="auth-page__footer">
              <Link to="/login">← Back to log in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
