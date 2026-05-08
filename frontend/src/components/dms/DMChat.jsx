import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const PACK_COLORS = ['#4A7AFF', '#4DD1C4', '#FF7A3D', '#FF4D4D', '#9c84ef', '#faa61a'];
function getColor(username) {
  if (!username) return PACK_COLORS[0];
  let h = 0;
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) % PACK_COLORS.length;
  return PACK_COLORS[Math.abs(h)];
}

function formatTimestamp(dateStr) {
  const date = new Date(dateStr);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const diffDays = Math.floor((Date.now() - date) / 86400000);
  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Yesterday at ${time}`;
  return `${date.toLocaleDateString()} at ${time}`;
}

export default function DMChat({ dm }) {
  const { session } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const joinedRef = useRef(null);

  const other = dm.user1_id === session.user.id ? dm.user2 : dm.user1;
  const headers = { Authorization: `Bearer ${session.access_token}` };

  useEffect(() => {
    loadMessages();
    if (socket) {
      if (joinedRef.current) socket.emit('leave_channel', `dm:${joinedRef.current}`);
      socket.emit('join_dm', dm.id);
      joinedRef.current = dm.id;
    }
  }, [dm.id, socket]);

  useEffect(() => {
    if (!socket) return;
    const onNewDM = (msg) => {
      if (msg.channel_id === dm.id) setMessages(prev => [...prev, msg]);
    };
    socket.on('new_dm', onNewDM);
    return () => socket.off('new_dm', onNewDM);
  }, [socket, dm.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function loadMessages() {
    setLoading(true);
    setMessages([]);
    const res = await fetch(`/api/dms/${dm.id}/messages`, { headers });
    if (res.ok) setMessages(await res.json());
    setLoading(false);
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!content.trim() || !socket) return;
    socket.emit('send_dm', { dmChannelId: dm.id, content: content.trim() });
    setContent('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (content.trim() && socket) {
        socket.emit('send_dm', { dmChannelId: dm.id, content: content.trim() });
        setContent('');
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 flex items-center gap-3 px-4 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(74,122,255,0.1)', background: 'rgba(26,29,33,0.8)' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: getColor(other?.username) }}>
          {other?.username?.[0]?.toUpperCase()}
        </div>
        <span className="font-semibold text-fenr-text">{other?.username}</span>
        <span className="text-fenr-muted text-xs ml-1">· Direct Message</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2 px-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-fenr-muted">
            <span className="animate-pulse">🐺</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: getColor(other?.username) }}>
              {other?.username?.[0]?.toUpperCase()}
            </div>
            <p className="text-fenr-text font-semibold">{other?.username}</p>
            <p className="text-fenr-muted text-sm">This is the beginning of your DM with {other?.username}.</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const showHeader = i === 0 || messages[i - 1]?.user_id !== msg.user_id;
            const username = msg.profiles?.username || 'Unknown';
            return (
              <div key={msg.id} className={`flex gap-3 py-0.5 ${showHeader ? 'mt-4' : ''}`}>
                <div className="w-8 flex-shrink-0 flex items-start justify-center mt-0.5">
                  {showHeader && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: getColor(username) }}>
                      {username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  {showHeader && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-semibold text-sm" style={{ color: getColor(username) }}>{username}</span>
                      <span className="text-fenr-muted text-xs">{formatTimestamp(msg.created_at)}</span>
                    </div>
                  )}
                  <p className="text-fenr-text text-sm leading-relaxed break-words">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-5 flex-shrink-0">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: '#2A2F37', border: '1px solid rgba(74,122,255,0.12)' }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${other?.username}`}
            rows={1}
            className="flex-1 bg-transparent text-fenr-text placeholder-fenr-muted resize-none outline-none text-sm leading-relaxed"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          />
          <button
            onClick={sendMessage}
            disabled={!content.trim()}
            className="text-fenr-muted hover:text-fenr-brand disabled:opacity-30 transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
