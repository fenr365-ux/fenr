import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await register(email, password, username);
      if (!data.session) {
        setEmailSent(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'radial-gradient(ellipse at 60% 40%, #1e2535 0%, #1A1D21 70%)' }}>
        <div className="glass rounded-xl p-8 w-full max-w-md shadow-2xl text-center">
          <h1 className="text-3xl font-display text-fenr-brand tracking-widest mb-4">FENR</h1>
          <div className="text-4xl mb-4">🐺</div>
          <h2 className="text-xl font-semibold text-fenr-text mb-3">Check your email</h2>
          <p className="text-fenr-muted mb-1">
            We sent a confirmation link to{' '}
            <strong className="text-fenr-text">{email}</strong>.
          </p>
          <p className="text-fenr-muted text-sm">Click it to activate your pack membership.</p>
          <div className="runic-divider mt-5" />
          <Link to="/login" className="mt-4 inline-block text-fenr-brand hover:text-blue-400 text-sm font-semibold transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full" style={{ background: 'radial-gradient(ellipse at 60% 40%, #1e2535 0%, #1A1D21 70%)' }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        <div className="absolute top-1/4 right-1/4 text-fenr-teal font-display text-9xl select-none">ᚱ</div>
        <div className="absolute bottom-1/4 left-1/4 text-fenr-brand font-display text-9xl select-none">ᛖ</div>
      </div>

      <div className="glass rounded-xl p-8 w-full max-w-md shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-display text-fenr-brand tracking-widest">FENR</h1>
          <p className="text-fenr-muted text-sm mt-1">Your Realm. Your Pack.</p>
        </div>

        <h2 className="text-xl font-semibold text-fenr-text text-center mb-5">Join the Pack</h2>

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
            <label className="block text-xs font-semibold text-fenr-muted uppercase tracking-widest mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="fenr-input w-full"
              required
              minLength={2}
              maxLength={32}
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
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-fenr-red/10 border border-fenr-red/30 rounded px-3 py-2">
              <p className="text-fenr-red text-sm">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="fenr-btn w-full mt-2">
            {loading ? 'Forging your identity...' : 'Join the Pack'}
          </button>
        </form>

        <div className="runic-divider mt-5" />
        <p className="text-fenr-muted text-sm text-center mt-4">
          Already in the pack?{' '}
          <Link to="/login" className="text-fenr-brand hover:text-blue-400 font-semibold transition-colors">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
