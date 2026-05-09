import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import StatusPicker from './StatusPicker';

const PACK_COLORS = ['#4A7AFF', '#4DD1C4', '#FF7A3D', '#FF4D4D', '#9c84ef', '#faa61a'];

function getPackColor(username) {
  if (!username) return PACK_COLORS[0];
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) % PACK_COLORS.length;
  return PACK_COLORS[Math.abs(hash)];
}

export default function UserPanel() {
  const { profile, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const username = profile?.username || '...';
  const color = getPackColor(username);

  return (
    <div className="relative h-14 flex-shrink-0 px-2 flex items-center gap-2 border-t" style={{ borderColor: 'rgba(74,122,255,0.1)', background: '#1a1e23' }}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 cursor-pointer select-none"
        style={{ background: `linear-gradient(135deg, ${color}99, ${color})` }}
        onClick={() => setShowMenu(v => !v)}
      >
        {username[0]?.toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-fenr-text text-sm font-semibold truncate leading-tight">{username}</p>
        <button
          onClick={() => { setShowStatus(v => !v); setShowMenu(false); }}
          className="text-fenr-teal text-xs leading-tight flex items-center gap-1 hover:text-fenr-brand transition-colors"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-fenr-teal" />
          Set status
        </button>
      </div>

      <button onClick={() => { setShowMenu(v => !v); setShowStatus(false); }} title="Settings" className="text-fenr-muted hover:text-fenr-text transition-colors flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
      </button>

      {/* Status picker */}
      {showStatus && (
        <div className="absolute bottom-16 left-2 z-50">
          <StatusPicker onClose={() => setShowStatus(false)} />
        </div>
      )}

      {/* Settings menu */}
      {showMenu && (
        <div className="absolute bottom-16 left-2 right-2 glass rounded-xl shadow-2xl py-1 z-50" onClick={() => setShowMenu(false)}>
          <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(74,122,255,0.1)' }}>
            <p className="text-fenr-text text-sm font-semibold">{username}</p>
            <p className="text-fenr-teal text-xs">Pack Member</p>
          </div>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-fenr-red hover:bg-fenr-red/10 text-sm transition-colors"
          >
            Leave the Pack
          </button>
        </div>
      )}
    </div>
  );
}
