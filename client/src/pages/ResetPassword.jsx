import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/store';
import { BRAND } from '../utils/india';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await api.resetPassword({ token, password });

      localStorage.setItem('h2r_token', data.token);
      localStorage.setItem('h2r_user', JSON.stringify(data));
      setDone(true);

      setTimeout(() => {
        navigate(data.role === 'admin' ? '/admin' : '/my-orders');
      }, 1600);
    } catch (err) {
      setError(err.response?.data?.error || 'This reset link is invalid or has expired.');
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
            <h1 className="auth-page__title">Set a new password</h1>
          </div>
        </div>

        {done ? (
          <div className="auth-page__notice auth-page__notice--info">
            Password updated. Taking you to your account…
          </div>
        ) : (
          <>
            {error && <div className="auth-page__error">{error}</div>}

            <form className="auth-page__form" onSubmit={handleSubmit}>
              <label className="auth-page__field">
                <span>New password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                />
              </label>

              <label className="auth-page__field">
                <span>Confirm new password</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                />
              </label>

              <button type="submit" disabled={loading} className="btn btn-primary auth-page__submit">
                {loading ? 'Updating…' : 'Update password'}
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
