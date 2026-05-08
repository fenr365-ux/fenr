import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-full" style={{ background: 'radial-gradient(ellipse at 60% 40%, #1e2535 0%, #1A1D21 70%)' }}>
      {/* Subtle rune background marks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        <div className="absolute top-1/4 left-1/4 text-fenr-brand font-display text-9xl select-none">ᚠ</div>
        <div className="absolute bottom-1/4 right-1/4 text-fenr-brand font-display text-9xl select-none">ᚾ</div>
      </div>

      <div className="glass rounded-xl p-8 w-full max-w-md shadow-2xl relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-display text-fenr-brand tracking-widest">FENR</h1>
          <p className="text-fenr-muted text-sm mt-1 font-body">Unleash Your Voice</p>
        </div>

        <h2 className="text-xl font-semibold text-fenr-text text-center mb-5">Welcome Back</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-fenr-muted uppercase tracking-widest mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="fenr-input w-full"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-fenr-muted uppercase tracking-widest mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="fenr-input w-full"
              required
            />
          </div>

          {error && (
            <div className="bg-fenr-red/10 border border-fenr-red/30 rounded px-3 py-2">
              <p className="text-fenr-red text-sm">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="fenr-btn w-full mt-2">
            {loading ? 'Entering the Pack...' : 'Enter the Pack'}
          </button>
        </form>

        <div className="runic-divider mt-5" />
        <p className="text-fenr-muted text-sm text-center mt-4">
          New to FENR?{' '}
          <Link to="/register" className="text-fenr-brand hover:text-blue-400 font-semibold transition-colors">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
