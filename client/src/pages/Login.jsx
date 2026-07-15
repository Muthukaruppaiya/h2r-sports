import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect'); // e.g. "checkout"

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
      } else if (redirect) {
        navigate(`/${redirect}`);
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
    <div className="container" style={{ paddingTop: 'var(--header-offset)', paddingBottom: '4rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--navy)' }}>Log In</h1>

      {redirect === 'checkout' && (
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: '#fff8e1', borderRadius: '8px', color: '#7a5f00', fontSize: '0.9rem', border: '1px solid #ffe082' }}>
          Please log in or <Link to={`/register?redirect=checkout`} style={{ color: 'var(--accent)', fontWeight: '600' }}>create an account</Link> to complete your order.
        </p>
      )}

      {error && (
        <div style={{ padding: '1rem', background: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--gray-200)', borderRadius: '8px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--gray-200)', borderRadius: '8px' }}
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--gray-600)' }}>
        Don't have an account?{' '}
        <Link to={redirect ? `/register?redirect=${redirect}` : '/register'} style={{ color: 'var(--accent)', fontWeight: '600' }}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
