import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { supabase } from '../../context/AuthContext';

const PACK_COLORS = ['#4A7AFF', '#4DD1C4', '#FF7A3D', '#FF4D4D', '#9c84ef', '#faa61a'];
function getColor(username) {
  if (!username) return PACK_COLORS[0];
  let h = 0;
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) % PACK_COLORS.length;
  return PACK_COLORS[Math.abs(h)];
}

export default function MemberList({ realm, onDMUser, isOwner }) {
  const { session } = useAuth();
  const socket = useSocket();
  const [members, setMembers] = useState([]);
  const [presence, setPresence] = useState({});
  const [contextMenu, setContextMenu] = useState(null); // { member, x, y }

  useEffect(() => {
    if (realm) loadMembers();
  }, [realm?.id]);

  useEffect(() => {
    if (!socket) return;
    const onPresence = ({ userId, status }) => {
      setPresence(prev => ({ ...prev, [userId]: status }));
    };
    socket.on('presence_update', onPresence);
    socket.emit('set_presence', 'online');
    return () => socket.off('presence_update', onPresence);
  }, [socket]);

  useEffect(() => {
    function closeMenu() { setContextMenu(null); }
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  async function loadMembers() {
    const { data } = await supabase
      .from('server_members')
      .select('role, profiles(id, username, avatar_url)')
      .eq('server_id', realm.id)
      .order('role');

    if (data) {
      setMembers(data.map(m => ({ ...m.profiles, role: m.role })));

      const ids = data.map(m => m.profiles?.id).filter(Boolean);
      const { data: presenceData } = await supabase
        .from('presence')
        .select('user_id, status')
        .in('user_id', ids);

      if (presenceData) {
        const map = {};
        for (const p of presenceData) map[p.user_id] = p.status;
        setPresence(map);
      }
    }
  }

  const online = members.filter(m => presence[m.id] !== 'offline');
  const offline = members.filter(m => presence[m.id] === 'offline');

  function statusColor(userId) {
    const s = presence[userId];
    if (!s || s === 'online') return '#3ba55d';
    if (s === 'idle') return '#faa61a';
    if (s === 'dnd') return '#ED4245';
    return '#747f8d';
  }

  function handleRightClick(e, member) {
    if (member.id === session.user.id) return;
    e.preventDefault();
    setContextMenu({ member, x: e.clientX, y: e.clientY });
  }

  async function contextKick(member) {
    if (!confirm(`Kick ${member.username}?`)) return;
    await fetch(`/api/moderation/${realm.id}/kick/${member.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    setMembers(prev => prev.filter(m => m.id !== member.id));
    setContextMenu(null);
  }

  async function contextBan(member) {
    if (!confirm(`Ban ${member.username}?`)) return;
    await fetch(`/api/moderation/${realm.id}/ban/${member.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    setMembers(prev => prev.filter(m => m.id !== member.id));
    setContextMenu(null);
  }

  function renderMember(member) {
    return (
      <div
        key={member.id}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-fenr-hover transition-colors group cursor-pointer select-none"
        onClick={() => member.id !== session.user.id && onDMUser?.(member.id)}
        onContextMenu={e => handleRightClick(e, member)}
        title={member.id !== session.user.id ? `DM ${member.username}` : 'You'}
      >
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: getColor(member.username) }}>
            {member.username[0]?.toUpperCase()}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
            style={{ background: statusColor(member.id), borderColor: '#22262C' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${presence[member.id] === 'offline' ? 'text-fenr-muted' : 'text-fenr-text'}`}>
            {member.username}
            {member.id === session.user.id && <span className="text-fenr-muted text-xs ml-1">(you)</span>}
          </p>
          {member.role === 'owner' && (
            <p className="text-fenr-orange text-xs leading-tight">Owner</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto py-3 px-2" style={{ width: '200px', background: '#1e2228' }}>
      {online.length > 0 && (
        <>
          <p className="text-fenr-muted text-xs uppercase tracking-widest font-semibold px-2 mb-1">
            Online — {online.length}
          </p>
          {online.map(renderMember)}
        </>
      )}
      {offline.length > 0 && (
        <>
          <p className="text-fenr-muted text-xs uppercase tracking-widest font-semibold px-2 mt-4 mb-1">
            Offline — {offline.length}
          </p>
          {offline.map(renderMember)}
        </>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed glass rounded-lg shadow-xl py-1 z-50 w-44"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(74,122,255,0.1)' }}>
            <p className="text-fenr-text text-sm font-semibold">{contextMenu.member.username}</p>
          </div>
          <button
            onClick={() => { onDMUser?.(contextMenu.member.id); setContextMenu(null); }}
            className="w-full text-left px-3 py-2 text-fenr-text hover:bg-fenr-hover text-sm transition-colors"
          >
            Send Message
          </button>
          {isOwner && contextMenu.member.role !== 'owner' && (
            <>
              <button
                onClick={() => contextKick(contextMenu.member)}
                className="w-full text-left px-3 py-2 text-fenr-orange hover:bg-fenr-orange/10 text-sm transition-colors"
              >
                Kick Member
              </button>
              <button
                onClick={() => contextBan(contextMenu.member)}
                className="w-full text-left px-3 py-2 text-fenr-red hover:bg-fenr-red/10 text-sm transition-colors"
              >
                Ban Member
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
