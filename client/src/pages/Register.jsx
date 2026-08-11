import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { BRAND } from '../utils/india';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect'); // e.g. "checkout"

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/register', { name, email, phone, password });
      localStorage.setItem('h2r_token', res.data.token);
      localStorage.setItem('h2r_user', JSON.stringify(res.data));

      if (redirect) {
        navigate(`/${redirect}`);
      } else {
        navigate('/my-orders');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account. Email might already be in use.');
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
            <p className="auth-page__eyebrow">Join H2R Sports</p>
            <h1 className="auth-page__title">Create Account</h1>
          </div>
        </div>

        {redirect === 'checkout' && (
          <div className="auth-page__notice auth-page__notice--warn">
            Create your account to complete your order. Already have one?{' '}
            <Link to="/login?redirect=checkout">Log in</Link>
          </div>
        )}

        {error && <div className="auth-page__error">{error}</div>}

        <form className="auth-page__form" onSubmit={handleRegister}>
          <label className="auth-page__field">
            <span>Full name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="As on the package"
            />
          </label>

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
            <span>Mobile number</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
              placeholder="e.g. 9876543210"
            />
          </label>

          <label className="auth-page__field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
              autoComplete="new-password"
              placeholder="Min. 6 characters"
            />
          </label>

          <button type="submit" disabled={loading} className="btn btn-primary auth-page__submit">
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-page__footer">
          Already have an account?{' '}
          <Link to={redirect ? `/login?redirect=${redirect}` : '/login'}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
