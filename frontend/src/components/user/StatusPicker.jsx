import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { supabase } from '../../context/AuthContext';

const STATUSES = [
  { value: 'online', label: 'Online', color: '#3ba55d', dot: '🟢' },
  { value: 'idle', label: 'Idle', color: '#faa61a', dot: '🟡' },
  { value: 'dnd', label: 'Do Not Disturb', color: '#ED4245', dot: '🔴' },
  { value: 'offline', label: 'Invisible', color: '#747f8d', dot: '⚫' },
];

export default function StatusPicker({ onClose }) {
  const { session, profile } = useAuth();
  const socket = useSocket();
  const [customStatus, setCustomStatus] = useState('');
  const [saving, setSaving] = useState(false);

  async function setStatus(status) {
    socket?.emit('set_presence', status);
    await supabase.from('presence').upsert({
      user_id: session.user.id,
      status,
      last_seen: new Date().toISOString()
    });
    onClose();
  }

  async function saveCustomStatus(e) {
    e.preventDefault();
    if (!customStatus.trim()) return;
    setSaving(true);
    await supabase.from('presence').upsert({
      user_id: session.user.id,
      status: 'online',
      custom_status: customStatus.trim(),
      last_seen: new Date().toISOString()
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className="glass rounded-xl shadow-2xl py-2 w-56 z-50">
      <div className="px-3 pb-2 border-b mb-1" style={{ borderColor: 'rgba(74,122,255,0.1)' }}>
        <p className="text-fenr-muted text-xs uppercase tracking-widest font-semibold mb-2">Set Status</p>
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setStatus(s.value)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-fenr-hover transition-colors text-left"
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-fenr-text text-sm">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="px-3 pt-1">
        <p className="text-fenr-muted text-xs uppercase tracking-widest font-semibold mb-2">Custom Status</p>
        <form onSubmit={saveCustomStatus} className="flex gap-2">
          <input
            value={customStatus}
            onChange={e => setCustomStatus(e.target.value)}
            placeholder="What's on your mind?"
            maxLength={128}
            className="fenr-input flex-1 text-xs py-1.5"
            autoFocus
          />
          <button
            type="submit"
            disabled={!customStatus.trim() || saving}
            className="fenr-btn text-xs px-2 py-1 disabled:opacity-40"
          >
            ✓
          </button>
        </form>
      </div>
    </div>
  );
}
