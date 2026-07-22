import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { BRAND } from '../utils/india';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const isAdminLogin = redirect === 'admin';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('h2r_token', res.data.token);
      localStorage.setItem('h2r_user', JSON.stringify(res.data));

      if (res.data.role === 'admin') {
        navigate('/admin');
      } else if (redirect === 'checkout') {
        navigate('/checkout');
      } else if (redirect === 'admin') {
        setError('This account does not have admin access.');
      } else {
        navigate('/my-orders');
      }
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page${isAdminLogin ? ' auth-page--admin' : ''}`}>
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
            <p className="auth-page__eyebrow">{isAdminLogin ? 'Admin access' : 'Welcome back'}</p>
            <h1 className="auth-page__title">{isAdminLogin ? 'Admin Log In' : 'Log In'}</h1>
          </div>
        </div>

        {redirect === 'checkout' && (
          <div className="auth-page__notice auth-page__notice--warn">
            Please log in or{' '}
            <Link to="/register?redirect=checkout">create an account</Link> to complete your order.
          </div>
        )}

        {isAdminLogin && (
          <div className="auth-page__notice auth-page__notice--info">
            Sign in with your admin credentials to open the H2R commerce panel.
          </div>
        )}

        {error && <div className="auth-page__error">{error}</div>}

        <form className="auth-page__form" onSubmit={handleLogin}>
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

          <label className="auth-page__field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </label>

          <button type="submit" disabled={loading} className="btn btn-primary auth-page__submit">
            {loading ? 'Logging in…' : isAdminLogin ? 'Log in to Admin' : 'Log In'}
          </button>
        </form>

        {!isAdminLogin && (
          <p className="auth-page__footer">
            Don&apos;t have an account?{' '}
            <Link to={redirect ? `/register?redirect=${redirect}` : '/register'}>Sign up</Link>
          </p>
        )}

        {isAdminLogin && (
          <p className="auth-page__footer">
            <Link to="/">← Back to store</Link>
          </p>
        )}
      </div>
    </div>
  );
}
