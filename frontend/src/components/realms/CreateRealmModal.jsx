import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function CreateRealmModal({ onClose, onCreated, onJoined }) {
  const { session } = useAuth();
  const [mode, setMode] = useState(null);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated(data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/servers/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ invite_code: inviteCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onJoined(data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-fenr-muted hover:text-fenr-text text-xl leading-none">×</button>

        {!mode && (
          <>
            <div className="text-center mb-5">
              <span className="text-3xl">🐺</span>
              <h2 className="text-xl font-display text-fenr-text mt-2">Enter a Realm</h2>
              <p className="text-fenr-muted text-sm mt-1">Forge a new realm or join one with a binding code</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setMode('create')}
                className="fenr-btn w-full"
              >
                Forge a New Realm
              </button>
              <button
                onClick={() => setMode('join')}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-fenr-muted hover:text-fenr-text transition-colors"
                style={{ background: 'rgba(60,66,74,0.5)', border: '1px solid rgba(74,122,255,0.15)' }}
              >
                Join with Binding Code
              </button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <>
            <h2 className="text-xl font-display text-fenr-text mb-4">Forge a Realm</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fenr-muted uppercase tracking-widest mb-1.5">Realm Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="fenr-input w-full" required autoFocus />
              </div>
              {error && <p className="text-fenr-red text-sm">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setMode(null); setError(''); }} className="flex-1 py-2 text-fenr-muted hover:text-fenr-text text-sm transition-colors">
                  Back
                </button>
                <button type="submit" disabled={loading} className="fenr-btn flex-1 py-2 text-sm">
                  {loading ? 'Forging...' : 'Forge Realm'}
                </button>
              </div>
            </form>
          </>
        )}

        {mode === 'join' && (
          <>
            <h2 className="text-xl font-display text-fenr-text mb-4">Join a Realm</h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fenr-muted uppercase tracking-widest mb-1.5">Binding Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  placeholder="e.g. abc12345"
                  className="fenr-input w-full"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-fenr-red text-sm">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setMode(null); setError(''); }} className="flex-1 py-2 text-fenr-muted hover:text-fenr-text text-sm transition-colors">
                  Back
                </button>
                <button type="submit" disabled={loading} className="fenr-btn flex-1 py-2 text-sm">
                  {loading ? 'Binding...' : 'Bind to Realm'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
