import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function PinnedMessages({ channelId, onClose }) {
  const { session } = useAuth();
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPins();
  }, [channelId]);

  async function loadPins() {
    setLoading(true);
    const res = await fetch(`/api/pins/${channelId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) setPins(await res.json());
    setLoading(false);
  }

  async function unpin(messageId) {
    const res = await fetch(`/api/pins/${channelId}/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) setPins(prev => prev.filter(p => p.message_id !== messageId));
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-xl shadow-2xl w-96 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(74,122,255,0.15)' }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">📌</span>
            <h3 className="font-display text-fenr-text">Pinned Messages</h3>
          </div>
          <button onClick={onClose} className="text-fenr-muted hover:text-fenr-text text-xl leading-none transition-colors">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <p className="text-fenr-muted text-sm text-center py-6">Loading...</p>
          ) : pins.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3 opacity-30">📌</p>
              <p className="text-fenr-muted text-sm">No pinned messages yet</p>
              <p className="text-fenr-muted text-xs mt-1">Hover a message and click 📌 to pin it</p>
            </div>
          ) : pins.map(pin => (
            <div
              key={pin.id}
              className="rounded-lg p-3 flex gap-3"
              style={{ background: 'rgba(74,122,255,0.06)', border: '1px solid rgba(74,122,255,0.12)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-fenr-brand text-xs font-semibold">{pin.username}</span>
                </div>
                <p className="text-fenr-text text-sm break-words leading-relaxed">{pin.content}</p>
              </div>
              <button
                onClick={() => unpin(pin.message_id)}
                title="Unpin"
                className="text-fenr-muted hover:text-fenr-red transition-colors flex-shrink-0 text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
