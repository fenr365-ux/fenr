import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function CreateServerModal({ onClose, onCreated, onJoined }) {
  const { session } = useAuth();
  const [mode, setMode] = useState(null); // 'create' | 'join'
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative bg-discord-sidebar rounded-lg p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-discord-muted hover:text-discord-text text-xl leading-none"
        >
          ×
        </button>

        {!mode && (
          <>
            <h2 className="text-xl font-bold text-white text-center mb-1">Create or Join</h2>
            <p className="text-discord-muted text-sm text-center mb-6">Start a new server or join with an invite code</p>
            <div className="space-y-3">
              <button
                onClick={() => setMode('create')}
                className="w-full bg-discord-brand hover:bg-indigo-500 text-white font-medium py-3 rounded transition-colors"
              >
                Create My Own
              </button>
              <button
                onClick={() => setMode('join')}
                className="w-full bg-discord-active hover:bg-discord-hover text-discord-text font-medium py-3 rounded transition-colors"
              >
                Join with Invite Code
              </button>
            </div>
          </>
        )}

        {mode === 'create' && (
          <>
            <h2 className="text-xl font-bold text-white mb-5">Create a Server</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-discord-muted uppercase tracking-wide mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-discord-servers text-discord-text px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-discord-brand"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-discord-red text-sm">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setMode(null); setError(''); }}
                  className="flex-1 py-2 text-discord-muted hover:text-discord-text transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-discord-brand hover:bg-indigo-500 text-white font-medium py-2 rounded transition-colors disabled:opacity-50 text-sm"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </>
        )}

        {mode === 'join' && (
          <>
            <h2 className="text-xl font-bold text-white mb-5">Join a Server</h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-discord-muted uppercase tracking-wide mb-1">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  placeholder="e.g. abc12345"
                  className="w-full bg-discord-servers text-discord-text px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-discord-brand"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-discord-red text-sm">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setMode(null); setError(''); }}
                  className="flex-1 py-2 text-discord-muted hover:text-discord-text transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-discord-brand hover:bg-indigo-500 text-white font-medium py-2 rounded transition-colors disabled:opacity-50 text-sm"
                >
                  {loading ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
