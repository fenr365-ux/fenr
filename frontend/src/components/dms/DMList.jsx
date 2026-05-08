import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const PACK_COLORS = ['#4A7AFF', '#4DD1C4', '#FF7A3D', '#FF4D4D', '#9c84ef', '#faa61a'];
function getColor(username) {
  if (!username) return PACK_COLORS[0];
  let h = 0;
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) % PACK_COLORS.length;
  return PACK_COLORS[Math.abs(h)];
}

export default function DMList({ selectedDM, onSelectDM }) {
  const { session } = useAuth();
  const [dms, setDms] = useState([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const headers = { Authorization: `Bearer ${session.access_token}` };

  useEffect(() => { fetchDMs(); }, []);

  async function fetchDMs() {
    const res = await fetch('/api/dms', { headers });
    if (res.ok) setDms(await res.json());
  }

  async function handleSearch(e) {
    const q = e.target.value;
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    const res = await fetch(`/api/dms/users/search?q=${encodeURIComponent(q)}`, { headers });
    if (res.ok) setResults(await res.json());
    setSearching(false);
  }

  async function openDM(userId) {
    const res = await fetch('/api/dms/open', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: userId })
    });
    if (res.ok) {
      const dm = await res.json();
      if (!dms.find(d => d.id === dm.id)) setDms(prev => [dm, ...prev]);
      onSelectDM(dm);
      setSearch('');
      setResults([]);
    }
  }

  function getOtherUser(dm) {
    return dm.user1_id === session.user.id ? dm.user2 : dm.user1;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 flex items-center px-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(74,122,255,0.1)' }}>
        <span className="font-display text-fenr-text text-sm tracking-wide">Direct Messages</span>
      </div>

      {/* Search */}
      <div className="px-3 py-2 relative">
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Find or start a DM..."
          className="fenr-input w-full text-sm py-1.5"
        />
        {results.length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 glass rounded-lg shadow-xl z-20 overflow-hidden">
            {results.map(user => (
              <button
                key={user.id}
                onClick={() => openDM(user.id)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-fenr-hover transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: getColor(user.username) }}>
                  {user.username[0]?.toUpperCase()}
                </div>
                <span className="text-fenr-text text-sm">{user.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* DM list */}
      <div className="flex-1 overflow-y-auto px-2">
        {dms.length === 0 ? (
          <p className="text-fenr-muted text-xs text-center px-4 py-6">Search for a pack member above to start a DM</p>
        ) : (
          dms.map(dm => {
            const other = getOtherUser(dm);
            if (!other) return null;
            return (
              <button
                key={dm.id}
                onClick={() => onSelectDM(dm)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all mb-0.5 text-left
                  ${selectedDM?.id === dm.id ? 'text-fenr-text' : 'text-fenr-muted hover:text-fenr-text'}`}
                style={{
                  background: selectedDM?.id === dm.id ? 'rgba(74,122,255,0.15)' : 'transparent',
                  borderLeft: selectedDM?.id === dm.id ? '2px solid #4A7AFF' : '2px solid transparent'
                }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: getColor(other.username) }}>
                  {other.username[0]?.toUpperCase()}
                </div>
                <span className="text-sm truncate">{other.username}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
