import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const PACK_COLORS = ['#4A7AFF', '#4DD1C4', '#FF7A3D', '#FF4D4D', '#9c84ef', '#faa61a'];
function getColor(username) {
  if (!username) return PACK_COLORS[0];
  let h = 0;
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) % PACK_COLORS.length;
  return PACK_COLORS[Math.abs(h)];
}

function Avatar({ username, size = 8 }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
      style={{ background: getColor(username) }}
    >
      {username?.[0]?.toUpperCase()}
    </div>
  );
}

export default function DMList({ selectedDM, onSelectDM }) {
  const { session } = useAuth();
  const [tab, setTab] = useState('friends'); // 'friends' | 'dms'
  const [dms, setDms] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [addStatus, setAddStatus] = useState(''); // '' | 'sending' | 'success' | 'error'
  const [addError, setAddError] = useState('');

  const headers = { Authorization: `Bearer ${session.access_token}` };
  const uid = session.user.id;

  useEffect(() => {
    fetchDMs();
    fetchFriends();
  }, []);

  async function fetchDMs() {
    const res = await fetch('/api/dms', { headers });
    if (res.ok) setDms(await res.json());
  }

  async function fetchFriends() {
    const res = await fetch('/api/friends', { headers });
    if (res.ok) setFriendships(await res.json());
  }

  async function sendFriendRequest(e) {
    e.preventDefault();
    if (!addUsername.trim()) return;
    setAddStatus('sending');
    setAddError('');
    const res = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: addUsername.trim() })
    });
    const data = await res.json();
    if (res.ok) {
      setFriendships(prev => [data, ...prev]);
      setAddStatus('success');
      setAddUsername('');
      setTimeout(() => { setAddStatus(''); setShowAddFriend(false); }, 2000);
    } else {
      setAddStatus('error');
      setAddError(data.error || 'Failed to send request');
    }
  }

  async function acceptFriend(id) {
    const res = await fetch(`/api/friends/accept/${id}`, { method: 'POST', headers });
    if (res.ok) {
      setFriendships(prev => prev.map(f => f.id === id ? { ...f, status: 'accepted' } : f));
    }
  }

  async function removeFriend(id) {
    await fetch(`/api/friends/${id}`, { method: 'DELETE', headers });
    setFriendships(prev => prev.filter(f => f.id !== id));
  }

  async function openDMWithFriend(friendUserId) {
    const res = await fetch('/api/dms/open', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_user_id: friendUserId })
    });
    if (res.ok) {
      const dm = await res.json();
      if (!dms.find(d => d.id === dm.id)) setDms(prev => [dm, ...prev]);
      onSelectDM(dm);
      setTab('dms');
    }
  }

  function getOtherUser(dm) {
    return dm.user1_id === uid ? dm.user2 : dm.user1;
  }

  function getFriendUser(f) {
    return f.sender_id === uid ? f.receiver : f.sender;
  }

  const accepted = friendships.filter(f => f.status === 'accepted');
  const pendingReceived = friendships.filter(f => f.status === 'pending' && f.receiver_id === uid);
  const pendingSent = friendships.filter(f => f.status === 'pending' && f.sender_id === uid);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(74,122,255,0.1)' }}>
        <span className="font-display text-fenr-text text-sm tracking-wide">
          {tab === 'friends' ? 'Pack Contacts' : 'Direct Messages'}
        </span>
        {tab === 'friends' && (
          <button
            onClick={() => setShowAddFriend(v => !v)}
            title="Add Friend"
            className="text-fenr-muted hover:text-fenr-teal transition-colors text-xl leading-none"
          >
            +
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: 'rgba(74,122,255,0.08)' }}>
        <button
          onClick={() => setTab('friends')}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === 'friends' ? 'text-fenr-brand border-b-2 border-fenr-brand' : 'text-fenr-muted hover:text-fenr-text'}`}
        >
          Friends {pendingReceived.length > 0 && <span className="ml-1 bg-fenr-red text-white text-xs px-1.5 py-0.5 rounded-full">{pendingReceived.length}</span>}
        </button>
        <button
          onClick={() => setTab('dms')}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === 'dms' ? 'text-fenr-brand border-b-2 border-fenr-brand' : 'text-fenr-muted hover:text-fenr-text'}`}
        >
          Messages
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'friends' && (
          <div className="px-2 py-2 space-y-1">
            {/* Add friend form */}
            {showAddFriend && (
              <form onSubmit={sendFriendRequest} className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(74,122,255,0.06)', border: '1px solid rgba(74,122,255,0.15)' }}>
                <p className="text-fenr-text text-xs font-semibold mb-2">Add by username</p>
                <div className="flex gap-2">
                  <input
                    value={addUsername}
                    onChange={e => { setAddUsername(e.target.value); setAddStatus(''); }}
                    placeholder="username"
                    className="fenr-input flex-1 text-sm py-1.5"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={addStatus === 'sending' || !addUsername.trim()}
                    className="fenr-btn text-xs px-3 disabled:opacity-40"
                  >
                    {addStatus === 'sending' ? '...' : 'Send'}
                  </button>
                </div>
                {addStatus === 'success' && <p className="text-fenr-teal text-xs mt-1.5">Request sent!</p>}
                {addStatus === 'error' && <p className="text-fenr-red text-xs mt-1.5">{addError}</p>}
              </form>
            )}

            {/* Pending received */}
            {pendingReceived.length > 0 && (
              <>
                <p className="text-fenr-muted text-xs uppercase tracking-widest font-semibold px-1 mb-1 mt-2">Incoming Requests</p>
                {pendingReceived.map(f => {
                  const user = f.sender;
                  return (
                    <div key={f.id} className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: 'rgba(74,122,255,0.06)' }}>
                      <Avatar username={user?.username} />
                      <span className="flex-1 text-fenr-text text-sm truncate">{user?.username}</span>
                      <button
                        onClick={() => acceptFriend(f.id)}
                        className="text-xs px-2 py-1 rounded font-semibold transition-colors"
                        style={{ background: 'rgba(59,165,93,0.2)', color: '#3ba55d' }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => removeFriend(f.id)}
                        className="text-xs px-2 py-1 rounded font-semibold transition-colors"
                        style={{ background: 'rgba(255,77,77,0.15)', color: '#FF4D4D' }}
                      >
                        Decline
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {/* Accepted friends */}
            {accepted.length > 0 && (
              <>
                <p className="text-fenr-muted text-xs uppercase tracking-widest font-semibold px-1 mb-1 mt-3">Friends — {accepted.length}</p>
                {accepted.map(f => {
                  const user = getFriendUser(f);
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-fenr-hover transition-colors group cursor-pointer"
                      onClick={() => openDMWithFriend(user?.id)}
                    >
                      <Avatar username={user?.username} />
                      <span className="flex-1 text-fenr-text text-sm truncate">{user?.username}</span>
                      <button
                        onClick={e => { e.stopPropagation(); removeFriend(f.id); }}
                        className="text-fenr-muted hover:text-fenr-red text-xs opacity-0 group-hover:opacity-100 transition-all"
                        title="Remove friend"
                      >✕</button>
                    </div>
                  );
                })}
              </>
            )}

            {/* Pending sent */}
            {pendingSent.length > 0 && (
              <>
                <p className="text-fenr-muted text-xs uppercase tracking-widest font-semibold px-1 mb-1 mt-3">Sent Requests</p>
                {pendingSent.map(f => {
                  const user = f.receiver;
                  return (
                    <div key={f.id} className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ opacity: 0.7 }}>
                      <Avatar username={user?.username} />
                      <span className="flex-1 text-fenr-muted text-sm truncate">{user?.username}</span>
                      <span className="text-fenr-muted text-xs">Pending</span>
                      <button onClick={() => removeFriend(f.id)} className="text-fenr-muted hover:text-fenr-red text-xs ml-1">✕</button>
                    </div>
                  );
                })}
              </>
            )}

            {accepted.length === 0 && pendingReceived.length === 0 && pendingSent.length === 0 && !showAddFriend && (
              <div className="text-center py-8 px-4">
                <p className="text-3xl mb-3 opacity-30">🐺</p>
                <p className="text-fenr-muted text-sm">No pack contacts yet</p>
                <p className="text-fenr-muted text-xs mt-1">Click + to add a friend by username</p>
              </div>
            )}
          </div>
        )}

        {tab === 'dms' && (
          <div className="px-2 py-2">
            {dms.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-3xl mb-3 opacity-30">💬</p>
                <p className="text-fenr-muted text-sm">No messages yet</p>
                <p className="text-fenr-muted text-xs mt-1">Add a friend and message them</p>
              </div>
            ) : dms.map(dm => {
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
                  <Avatar username={other.username} size={8} />
                  <span className="text-sm truncate">{other.username}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
