import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import CustomEmojiManager from '../realms/CustomEmojiManager';
import BotDashboard from '../bots/BotDashboard';

export default function HallList({ realm, selectedHall, onSelectHall }) {
  const { session } = useAuth();
  const [halls, setHalls] = useState([]);
  const [newHallName, setNewHallName] = useState('');
  const [showNewHall, setShowNewHall] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [showEmojiManager, setShowEmojiManager] = useState(false);
  const [showBotDashboard, setShowBotDashboard] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (realm) loadHalls();
  }, [realm?.id]);

  async function loadHalls() {
    const res = await fetch(`/api/channels/${realm.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setHalls(data);
      if (data.length > 0) onSelectHall(data[0]);
    }
  }

  async function openInvite() {
    const res = await fetch(`/api/servers/${realm.id}/invite`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) {
      const data = await res.json();
      const url = `${window.location.origin}/invite/${data.invite_code}`;
      setInviteCode(url);
      setShowInvite(true);
    }
  }

  async function createHall(e) {
    e.preventDefault();
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ server_id: realm.id, name: newHallName })
    });
    if (res.ok) {
      const hall = await res.json();
      setHalls(prev => [...prev, hall]);
      setNewHallName('');
      setShowNewHall(false);
    }
  }

  async function createVoiceHall() {
    const name = prompt('Howl name:');
    if (!name?.trim()) return;
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ server_id: realm.id, name: name.trim(), type: 'voice', is_voice: true })
    });
    if (res.ok) {
      const hall = await res.json();
      setHalls(prev => [...prev, hall]);
    }
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Realm header */}
      <div className="h-12 flex items-center justify-between px-4 flex-shrink-0 border-b" style={{ borderColor: 'rgba(74,122,255,0.1)' }}>
        <h2 className="font-display text-fenr-text truncate text-sm tracking-wide">{realm.name}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBotDashboard(true)}
            title="Bot Workshop"
            className="text-fenr-muted hover:text-fenr-brand transition-colors text-base leading-none"
          >
            🤖
          </button>
          <button
            onClick={() => setShowEmojiManager(true)}
            title="Manage Realm Emojis"
            className="text-fenr-muted hover:text-fenr-orange transition-colors text-base leading-none"
          >
            😊
          </button>
          <button
            onClick={openInvite}
            title="Invite Pack Members"
            className="text-fenr-muted hover:text-fenr-teal text-xl leading-none transition-colors"
          >
            +
          </button>
        </div>
      </div>

      {/* Hall list */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {/* Text halls */}
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-xs font-semibold text-fenr-muted uppercase tracking-widest">Halls</span>
          <button onClick={() => setShowNewHall(!showNewHall)} className="text-fenr-muted hover:text-fenr-teal text-lg leading-none transition-colors" title="Create Hall">+</button>
        </div>

        {showNewHall && (
          <form onSubmit={createHall} className="mb-2 px-1">
            <input
              type="text"
              value={newHallName}
              onChange={e => setNewHallName(e.target.value)}
              placeholder="new-hall"
              className="fenr-input w-full text-sm py-1.5"
              autoFocus
              onBlur={() => { if (!newHallName) setShowNewHall(false); }}
            />
          </form>
        )}

        {halls.filter(h => !h.is_voice).map(hall => (
          <button
            key={hall.id}
            onClick={() => onSelectHall(hall)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all duration-150 mb-0.5
              ${selectedHall?.id === hall.id ? 'text-fenr-text' : 'text-fenr-muted hover:text-fenr-text'}`}
            style={{
              background: selectedHall?.id === hall.id ? 'rgba(74,122,255,0.15)' : 'transparent',
              borderLeft: selectedHall?.id === hall.id ? '2px solid #4A7AFF' : '2px solid transparent'
            }}
          >
            <span className="text-fenr-brand opacity-60 font-bold text-base leading-none">#</span>
            <span className="truncate">{hall.name}</span>
          </button>
        ))}

        {/* Howls (voice channels) */}
        {halls.filter(h => h.is_voice).length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold text-fenr-muted uppercase tracking-widest">Howls</span>
              <button onClick={() => createVoiceHall()} className="text-fenr-muted hover:text-fenr-teal text-lg leading-none transition-colors" title="Create Howl">+</button>
            </div>
            {halls.filter(h => h.is_voice).map(hall => (
              <button
                key={hall.id}
                onClick={() => onSelectHall(hall)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all duration-150 mb-0.5
                  ${selectedHall?.id === hall.id ? 'text-fenr-text' : 'text-fenr-muted hover:text-fenr-text'}`}
                style={{
                  background: selectedHall?.id === hall.id ? 'rgba(77,209,196,0.15)' : 'transparent',
                  borderLeft: selectedHall?.id === hall.id ? '2px solid #4DD1C4' : '2px solid transparent'
                }}
              >
                <span className="text-fenr-teal opacity-60 text-base leading-none">🔊</span>
                <span className="truncate">{hall.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Add Howl button if no voice halls yet */}
        {halls.filter(h => h.is_voice).length === 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-semibold text-fenr-muted uppercase tracking-widest">Howls</span>
              <button onClick={createVoiceHall} className="text-fenr-muted hover:text-fenr-teal text-lg leading-none transition-colors" title="Create Voice Howl">+</button>
            </div>
          </div>
        )}
      </div>

      {showBotDashboard && (
        <BotDashboard realm={realm} onClose={() => setShowBotDashboard(false)} />
      )}

      {showEmojiManager && (
        <CustomEmojiManager realm={realm} onClose={() => setShowEmojiManager(false)} />
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowInvite(false)}>
          <div className="glass rounded-xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-fenr-text text-lg mb-1">Invite to {realm.name}</h3>
            <p className="text-fenr-muted text-sm mb-4">Share this link — anyone who clicks it can join your realm</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteCode}
                className="fenr-input flex-1 text-sm"
              />
              <button
                onClick={copyInvite}
                className="fenr-btn px-3 py-1.5 text-sm"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
