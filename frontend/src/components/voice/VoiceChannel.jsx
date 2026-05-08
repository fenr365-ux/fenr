import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import VideoRoom from './VideoRoom';

export default function VoiceChannel({ hall }) {
  const { session } = useAuth();
  const [token, setToken] = useState(null);
  const [url, setUrl] = useState(null);
  const [room, setRoom] = useState(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  async function joinHowl() {
    setJoining(true);
    setError('');
    try {
      const res = await fetch('/api/voice/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ channelId: hall.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToken(data.token);
      setUrl(data.url);
      setRoom(data.room);
      setConnected(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }

  function leaveHowl() {
    setToken(null);
    setUrl(null);
    setRoom(null);
    setConnected(false);
  }

  if (connected && token) {
    return <VideoRoom token={token} url={url} room={room} hallName={hall.name} onLeave={leaveHowl} />;
  }

  return (
    <div className="flex flex-col h-full items-center justify-center gap-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🔊</div>
        <h2 className="font-display text-fenr-text text-2xl mb-1">{hall.name}</h2>
        <p className="text-fenr-muted text-sm">Voice Howl — join to speak with your pack</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm max-w-sm text-center" style={{ background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', color: '#FF4D4D' }}>
          {error.includes('not configured') ? (
            <>Voice requires LiveKit setup.<br />See SETUP.txt → Phase 6 for instructions.</>
          ) : error}
        </div>
      )}

      <button
        onClick={joinHowl}
        disabled={joining}
        className="fenr-btn px-8 py-3 text-base"
        style={{ background: 'linear-gradient(135deg, #4A7AFF, #4DD1C4)' }}
      >
        {joining ? 'Connecting...' : '🐺 Join Howl'}
      </button>
    </div>
  );
}
