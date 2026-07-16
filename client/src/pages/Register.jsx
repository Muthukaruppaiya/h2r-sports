import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';

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
      setError('Failed to create account. Email might already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--header-offset)', paddingBottom: '4rem', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--navy)' }}>Create Account</h1>

      {redirect === 'checkout' && (
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: '#fff8e1', borderRadius: '8px', color: '#7a5f00', fontSize: '0.9rem', border: '1px solid #ffe082' }}>
          Create your account to complete your order. Already have one?{' '}
          <Link to={`/login?redirect=checkout`} style={{ color: 'var(--accent)', fontWeight: '600' }}>Log in</Link>
        </p>
      )}

      {error && (
        <div style={{ padding: '1rem', background: '#ffebee', color: '#c62828', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="As on the package"
            style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--gray-200)', borderRadius: '8px' }}
          />
        </div>

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
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Mobile Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="e.g. 9876543210"
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
            minLength="6"
            placeholder="Min. 6 characters"
            style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--gray-200)', borderRadius: '8px' }}
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--gray-600)' }}>
        Already have an account?{' '}
        <Link to={redirect ? `/login?redirect=${redirect}` : '/login'} style={{ color: 'var(--accent)', fontWeight: '600' }}>
          Log in
        </Link>
      </p>
    </div>
  );
}
