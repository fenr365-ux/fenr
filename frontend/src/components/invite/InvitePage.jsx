import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function InvitePage() {
  const { code } = useParams();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [realm, setRealm] = useState(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetch(`/api/servers/invite/${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setRealm(data);
      })
      .catch(() => setError('Could not load invite'));
  }, [code]);

  async function handleJoin() {
    if (!user) {
      sessionStorage.setItem('pendingInvite', code);
      navigate('/register');
      return;
    }
    setJoining(true);
    const res = await fetch('/api/servers/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ invite_code: code })
    });
    if (res.ok) {
      setJoined(true);
      setTimeout(() => navigate('/'), 1500);
    } else {
      const data = await res.json();
      setError(data.error || 'Failed to join');
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-fenr-bg flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
        <div className="text-6xl mb-4">🐺</div>
        <div className="font-display text-fenr-brand tracking-widest text-xl mb-6">FENR</div>

        {error ? (
          <div>
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={() => navigate('/')} className="fenr-btn w-full">Go Home</button>
          </div>
        ) : !realm ? (
          <p className="text-fenr-muted animate-pulse">Loading realm...</p>
        ) : joined ? (
          <div>
            <p className="text-fenr-teal font-semibold text-lg mb-2">You've joined!</p>
            <p className="text-fenr-muted text-sm">Taking you to {realm.name}...</p>
          </div>
        ) : (
          <div>
            <p className="text-fenr-muted text-sm mb-2">You've been invited to join</p>
            <h2 className="font-display text-fenr-text text-2xl mb-1">{realm.name}</h2>
            <p className="text-fenr-muted text-sm mb-6">{realm.member_count} member{realm.member_count !== 1 ? 's' : ''}</p>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="fenr-btn w-full py-3 text-base font-semibold"
            >
              {joining ? 'Joining...' : user ? `Join ${realm.name}` : 'Sign up & Join'}
            </button>
            {user && (
              <button onClick={() => navigate('/')} className="mt-3 text-fenr-muted text-sm hover:text-fenr-text transition-colors">
                Go back
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
