import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function ModerationPanel({ realm, members, onClose }) {
  const { session } = useAuth();
  const [bans, setBans] = useState([]);
  const [tab, setTab] = useState('members');
  const [timeoutDuration, setTimeoutDuration] = useState(10);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadBans();
  }, [realm.id]);

  async function loadBans() {
    const res = await fetch(`/api/moderation/${realm.id}/bans`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) setBans(await res.json());
  }

  async function kickUser(userId, username) {
    if (!confirm(`Kick ${username} from this realm?`)) return;
    setActionLoading(userId + '_kick');
    await fetch(`/api/moderation/${realm.id}/kick/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    setActionLoading(null);
  }

  async function banUser(userId, username) {
    if (!confirm(`Ban ${username} from this realm? They won't be able to rejoin.`)) return;
    setActionLoading(userId + '_ban');
    await fetch(`/api/moderation/${realm.id}/ban/${userId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    setBans(prev => [...prev, { user_id: userId, profiles: { username } }]);
    setActionLoading(null);
  }

  async function timeoutUser(userId, username) {
    if (!confirm(`Timeout ${username} for ${timeoutDuration} minutes?`)) return;
    setActionLoading(userId + '_timeout');
    await fetch(`/api/moderation/${realm.id}/timeout/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ minutes: timeoutDuration })
    });
    setActionLoading(null);
  }

  async function unbanUser(userId) {
    await fetch(`/api/moderation/${realm.id}/ban/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    setBans(prev => prev.filter(b => b.user_id !== userId));
  }

  const nonOwners = members.filter(m => m.role !== 'owner');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-xl shadow-2xl w-[480px] max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(74,122,255,0.15)' }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <h3 className="font-display text-fenr-text text-lg">Moderation</h3>
          </div>
          <button onClick={onClose} className="text-fenr-muted hover:text-fenr-text text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: 'rgba(74,122,255,0.1)' }}>
          {['members', 'bans'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-semibold capitalize transition-colors ${tab === t ? 'text-fenr-brand border-b-2 border-fenr-brand' : 'text-fenr-muted hover:text-fenr-text'}`}
            >
              {t === 'bans' ? `Bans (${bans.length})` : 'Members'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {tab === 'members' && (
            <>
              <div className="flex items-center gap-2 mb-3 px-1">
                <label className="text-fenr-muted text-xs">Timeout duration:</label>
                <select
                  value={timeoutDuration}
                  onChange={e => setTimeoutDuration(Number(e.target.value))}
                  className="fenr-input text-xs py-1 px-2"
                >
                  {[1, 5, 10, 30, 60, 1440].map(m => (
                    <option key={m} value={m}>{m < 60 ? `${m} min` : m === 1440 ? '24 hr' : `${m / 60} hr`}</option>
                  ))}
                </select>
              </div>

              {nonOwners.length === 0 ? (
                <p className="text-fenr-muted text-sm text-center py-6">No members to moderate</p>
              ) : nonOwners.map(member => (
                <div key={member.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg mb-1.5"
                  style={{ background: 'rgba(74,122,255,0.04)', border: '1px solid rgba(74,122,255,0.08)' }}>
                  <span className="text-fenr-text text-sm font-medium">{member.username}</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => timeoutUser(member.id, member.username)}
                      disabled={actionLoading === member.id + '_timeout'}
                      title="Timeout"
                      className="px-2.5 py-1 rounded text-xs font-semibold transition-colors disabled:opacity-40"
                      style={{ background: 'rgba(250,166,26,0.15)', color: '#faa61a' }}
                    >
                      ⏱ Timeout
                    </button>
                    <button
                      onClick={() => kickUser(member.id, member.username)}
                      disabled={actionLoading === member.id + '_kick'}
                      title="Kick"
                      className="px-2.5 py-1 rounded text-xs font-semibold transition-colors disabled:opacity-40"
                      style={{ background: 'rgba(255,122,61,0.15)', color: '#FF7A3D' }}
                    >
                      👢 Kick
                    </button>
                    <button
                      onClick={() => banUser(member.id, member.username)}
                      disabled={actionLoading === member.id + '_ban'}
                      title="Ban"
                      className="px-2.5 py-1 rounded text-xs font-semibold transition-colors disabled:opacity-40"
                      style={{ background: 'rgba(255,77,77,0.15)', color: '#FF4D4D' }}
                    >
                      🔨 Ban
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'bans' && (
            bans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-3 opacity-30">🔨</p>
                <p className="text-fenr-muted text-sm">No banned members</p>
              </div>
            ) : bans.map(ban => (
              <div key={ban.user_id} className="flex items-center justify-between px-3 py-2.5 rounded-lg mb-1.5"
                style={{ background: 'rgba(255,77,77,0.05)', border: '1px solid rgba(255,77,77,0.12)' }}>
                <div>
                  <span className="text-fenr-text text-sm">{ban.profiles?.username || 'Unknown'}</span>
                  {ban.reason && <p className="text-fenr-muted text-xs mt-0.5">{ban.reason}</p>}
                </div>
                <button
                  onClick={() => unbanUser(ban.user_id)}
                  className="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                  style={{ background: 'rgba(74,122,255,0.15)', color: '#4A7AFF' }}
                >
                  Unban
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
