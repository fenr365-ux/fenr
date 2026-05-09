import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import MessageInput from '../chat/MessageInput';
import Message from '../chat/Message';

const PACK_COLORS = ['#4A7AFF', '#4DD1C4', '#FF7A3D', '#FF4D4D', '#9c84ef', '#faa61a'];
function getColor(username) {
  if (!username) return PACK_COLORS[0];
  let h = 0;
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) % PACK_COLORS.length;
  return PACK_COLORS[Math.abs(h)];
}

function DateDivider({ date }) {
  const now = new Date();
  const d = new Date(date);
  const diffDays = Math.floor((now - d) / 86400000);
  const label = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday'
    : d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <div className="date-divider">
      <span>{label}</span>
    </div>
  );
}

function TypingIndicator({ users }) {
  if (!users.size) return null;
  return (
    <div className="flex items-center gap-2 px-14 py-1">
      <div className="flex items-center gap-0.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span className="text-fenr-muted text-xs italic">
        {[...users.values()][0]} is typing...
      </span>
    </div>
  );
}

export default function DMChat({ dm }) {
  const { session } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const bottomRef = useRef(null);
  const joinedRef = useRef(null);
  const typingTimers = useRef({});

  const other = dm.user1_id === session.user.id ? dm.user2 : dm.user1;
  const headers = { Authorization: `Bearer ${session.access_token}` };

  useEffect(() => {
    loadMessages();
    if (socket) {
      if (joinedRef.current) socket.emit('leave_dm', joinedRef.current);
      socket.emit('join_dm', dm.id);
      joinedRef.current = dm.id;
    }
  }, [dm.id, socket]);

  useEffect(() => {
    if (!socket) return;

    const onNewDM = (msg) => {
      if (msg.channel_id === dm.id) setMessages(prev => [...prev, msg]);
    };
    const onReaction = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    };
    const onTyping = ({ userId, username }) => {
      setTypingUsers(prev => { const m = new Map(prev); m.set(userId, username || 'Someone'); return m; });
      clearTimeout(typingTimers.current[userId]);
      typingTimers.current[userId] = setTimeout(() => {
        setTypingUsers(prev => { const m = new Map(prev); m.delete(userId); return m; });
      }, 3000);
    };

    socket.on('new_dm', onNewDM);
    socket.on('dm_reaction_update', onReaction);
    socket.on('dm_user_typing', onTyping);

    return () => {
      socket.off('new_dm', onNewDM);
      socket.off('dm_reaction_update', onReaction);
      socket.off('dm_user_typing', onTyping);
    };
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

  function sendMessage(content, attachments = []) {
    if (!socket) return;
    socket.emit('send_dm', { dmChannelId: dm.id, content, attachments });
  }

  function handleTyping() {
    socket?.emit('dm_typing', dm.id);
  }

  function handleReact(messageId, emoji) {
    socket?.emit('toggle_dm_reaction', { messageId, emoji, dmChannelId: dm.id });
  }

  // Build list with date dividers
  const withDividers = [];
  let lastDate = null;
  for (const msg of messages) {
    const day = new Date(msg.created_at).toDateString();
    if (day !== lastDate) {
      withDividers.push({ type: 'divider', date: msg.created_at, key: `div-${msg.created_at}` });
      lastDate = day;
    }
    withDividers.push({ type: 'msg', msg });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="h-12 flex items-center gap-3 px-4 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(74,122,255,0.1)', background: 'rgba(22,25,29,0.92)', backdropFilter: 'blur(12px)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: getColor(other?.username), boxShadow: `0 2px 8px ${getColor(other?.username)}44` }}
        >
          {other?.username?.[0]?.toUpperCase()}
        </div>
        <span className="font-semibold text-fenr-text">{other?.username}</span>
        <span className="text-fenr-muted text-xs">· Direct Message</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center h-full text-fenr-muted gap-3">
            <span className="text-4xl rune-glow">ᚠ</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${getColor(other?.username)}88, ${getColor(other?.username)})`, boxShadow: `0 4px 20px ${getColor(other?.username)}44` }}
            >
              {other?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-fenr-text font-semibold text-lg">{other?.username}</p>
              <p className="text-fenr-muted text-sm mt-1">
                This is the beginning of your DM with <strong className="text-fenr-text">{other?.username}</strong>. Say something.
              </p>
            </div>
          </div>
        ) : (
          withDividers.map((item, i) =>
            item.type === 'divider' ? (
              <DateDivider key={item.key} date={item.date} />
            ) : (
              <Message
                key={item.msg.id}
                message={item.msg}
                showHeader={
                  i === 0 ||
                  withDividers[i - 1]?.type === 'divider' ||
                  withDividers[i - 1]?.msg?.user_id !== item.msg.user_id
                }
                isOwn={item.msg.user_id === session.user.id}
                currentUserId={session.user.id}
                customEmojis={[]}
                canModerate={false}
                onDelete={() => {}} // DM delete not wired yet — placeholder
                onEdit={() => {}}
                onReact={handleReact}
                onPin={null}
                onThread={null}
              />
            )
          )
        )}

        <TypingIndicator users={typingUsers} />
        <div ref={bottomRef} />
      </div>

      <MessageInput
        hallName={other?.username || 'them'}
        onSend={sendMessage}
        onTyping={handleTyping}
        customEmojis={[]}
      />
    </div>
  );
}
