import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const PACK_COLORS = ['#4A7AFF', '#4DD1C4', '#FF7A3D', '#FF4D4D', '#9c84ef', '#faa61a'];
function getColor(u) {
  if (!u) return PACK_COLORS[0];
  let h = 0;
  for (const c of u) h = (h * 31 + c.charCodeAt(0)) % PACK_COLORS.length;
  return PACK_COLORS[Math.abs(h)];
}
function fmt(d) {
  const date = new Date(d);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ThreadPanel({ message, channelId, onClose }) {
  const { session } = useAuth();
  const socket = useSocket();
  const [replies, setReplies] = useState([]);
  const [content, setContent] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    loadReplies();
    socket?.emit('join_thread', message.id);
    const onReply = (msg) => setReplies(prev => [...prev, msg]);
    socket?.on('new_thread_reply', onReply);
    return () => {
      socket?.emit('leave_thread', message.id);
      socket?.off('new_thread_reply', onReply);
    };
  }, [message.id, socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies.length]);

  async function loadReplies() {
    const res = await fetch(`/api/messages/${channelId}/thread/${message.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) setReplies(await res.json());
  }

  function sendReply(e) {
    e.preventDefault();
    if (!content.trim()) return;
    socket?.emit('send_thread_reply', { threadId: message.id, channelId, content: content.trim() });
    setContent('');
  }

  const username = message.profiles?.username || 'Unknown';

  return (
    <div className="flex flex-col h-full border-l" style={{ width: '320px', background: '#1e2228', borderColor: 'rgba(74,122,255,0.1)' }}>
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 flex-shrink-0 border-b" style={{ borderColor: 'rgba(74,122,255,0.1)' }}>
        <span className="font-semibold text-fenr-text text-sm">Thread</span>
        <button onClick={onClose} className="text-fenr-muted hover:text-fenr-text text-xl leading-none transition-colors">×</button>
      </div>

      {/* Parent message */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(74,122,255,0.08)', background: 'rgba(74,122,255,0.04)' }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: getColor(username) }}>
            {username[0]?.toUpperCase()}
          </div>
          <span className="text-sm font-semibold" style={{ color: getColor(username) }}>{username}</span>
        </div>
        <p className="text-fenr-text text-sm leading-relaxed break-words">{message.content}</p>
        <p className="text-fenr-muted text-xs mt-1">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</p>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-2">
        {replies.map(reply => {
          const rUser = reply.profiles?.username || 'Unknown';
          return (
            <div key={reply.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: getColor(rUser) }}>
                {rUser[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold" style={{ color: getColor(rUser) }}>{rUser}</span>
                  <span className="text-fenr-muted text-xs">{fmt(reply.created_at)}</span>
                </div>
                <p className="text-fenr-text text-sm leading-relaxed break-words">{reply.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <form onSubmit={sendReply} className="p-3 border-t flex-shrink-0" style={{ borderColor: 'rgba(74,122,255,0.1)' }}>
        <div className="flex gap-2 items-center px-3 py-2 rounded-xl" style={{ background: '#2A2F37', border: '1px solid rgba(74,122,255,0.12)' }}>
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Reply in thread..."
            className="flex-1 bg-transparent text-fenr-text placeholder-fenr-muted outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!content.trim()}
            className="text-fenr-muted hover:text-fenr-brand disabled:opacity-30 transition-colors flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
