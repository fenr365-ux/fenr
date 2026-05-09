import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCustomEmojis } from '../../hooks/useCustomEmojis';
import Message from './Message';
import MessageInput from './MessageInput';
import ThreadPanel from './ThreadPanel';
import PinnedMessages from './PinnedMessages';

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
  const names = [...users];
  const label = names.length === 1 ? `${names[0]} is typing` : `${names.length} people are typing`;
  return (
    <div className="flex items-center gap-2 px-16 py-1">
      <div className="flex items-center gap-0.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span className="text-fenr-muted text-xs italic">{label}...</span>
    </div>
  );
}

export default function ChatArea({ hall, serverId, isOwner }) {
  const customEmojis = useCustomEmojis(serverId);
  const { session } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map()); // userId → username
  const [threadMessage, setThreadMessage] = useState(null);
  const [showPins, setShowPins] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const bottomRef = useRef(null);
  const joinedHallRef = useRef(null);
  const searchTimer = useRef(null);
  const typingTimers = useRef({});

  useEffect(() => {
    if (!hall) return;
    loadMessages();
    setThreadMessage(null);
    setSearchResults(null);
    setSearchQuery('');
    if (socket) {
      if (joinedHallRef.current) socket.emit('leave_channel', joinedHallRef.current);
      socket.emit('join_channel', hall.id);
      joinedHallRef.current = hall.id;
    }
  }, [hall?.id, socket]);

  useEffect(() => {
    if (!socket) return;
    const onNewMessage = msg => setMessages(prev => [...prev, msg]);
    const onEdited = ({ id, content }) =>
      setMessages(prev => prev.map(m => m.id === id ? { ...m, content, edited: true } : m));
    const onDeleted = ({ id }) =>
      setMessages(prev => prev.filter(m => m.id !== id));
    const onReaction = ({ messageId, reactions }) =>
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    const onReplyCount = ({ messageId }) =>
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reply_count: (m.reply_count || 0) + 1 } : m));
    const onTyping = ({ userId, username }) => {
      setTypingUsers(prev => { const m = new Map(prev); m.set(userId, username || 'Someone'); return m; });
      clearTimeout(typingTimers.current[userId]);
      typingTimers.current[userId] = setTimeout(() => {
        setTypingUsers(prev => { const m = new Map(prev); m.delete(userId); return m; });
      }, 3000);
    };

    socket.on('new_message', onNewMessage);
    socket.on('message_edited', onEdited);
    socket.on('message_deleted', onDeleted);
    socket.on('reaction_update', onReaction);
    socket.on('reply_count_update', onReplyCount);
    socket.on('user_typing', onTyping);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('message_edited', onEdited);
      socket.off('message_deleted', onDeleted);
      socket.off('reaction_update', onReaction);
      socket.off('reply_count_update', onReplyCount);
      socket.off('user_typing', onTyping);
    };
  }, [socket]);

  useEffect(() => {
    if (!searchResults) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, searchResults]);

  async function loadMessages() {
    setLoading(true);
    setMessages([]);
    const res = await fetch(`/api/messages/${hall.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (res.ok) setMessages(await res.json());
    setLoading(false);
  }

  function sendMessage(content, attachments = []) {
    socket?.emit('send_message', { channelId: hall.id, content, attachments });
  }
  function handleTyping() { socket?.emit('typing', hall.id); }
  function handleDelete(id) { socket?.emit('delete_message', { messageId: id, channelId: hall.id }); }
  function handleEdit(id, content) { socket?.emit('edit_message', { messageId: id, content, channelId: hall.id }); }
  function handleReact(id, emoji) { socket?.emit('toggle_reaction', { messageId: id, emoji, channelId: hall.id }); }

  async function handlePin(message) {
    await fetch('/api/pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ channel_id: hall.id, message_id: message.id, content: message.content, username: message.profiles?.username })
    });
  }

  function handleSearch(e) {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults(null); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/search/${serverId}?q=${encodeURIComponent(q)}&channelId=${hall.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) setSearchResults(await res.json());
      setSearching(false);
    }, 400);
  }

  // Build display list with date dividers injected
  const displayMessages = searchResults !== null ? searchResults : messages;
  const withDividers = [];
  let lastDate = null;
  for (const msg of displayMessages) {
    const day = new Date(msg.created_at).toDateString();
    if (day !== lastDate) {
      withDividers.push({ type: 'divider', date: msg.created_at, key: `div-${msg.created_at}` });
      lastDate = day;
    }
    withDividers.push({ type: 'msg', msg });
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Header */}
        <div
          className="h-12 flex items-center px-4 flex-shrink-0 border-b gap-3"
          style={{ borderColor: 'rgba(74,122,255,0.1)', background: 'rgba(22,25,29,0.92)', backdropFilter: 'blur(12px)' }}
        >
          <span className="text-fenr-brand font-bold text-lg opacity-50 select-none">#</span>
          <h3 className="font-semibold text-fenr-text tracking-wide">{hall.name}</h3>
          {hall.topic && <span className="hidden md:block text-fenr-muted text-xs border-l border-fenr-border pl-3 truncate">{hall.topic}</span>}
          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fenr-muted text-xs pointer-events-none">🔍</span>
            <input
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search..."
              className="fenr-input text-xs py-1.5 pl-7 pr-7 w-36 focus:w-48 transition-all duration-200"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults(null); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fenr-muted hover:text-fenr-text text-xs">×</button>
            )}
          </div>

          <button onClick={() => setShowPins(true)} title="Pinned Messages"
            className="text-fenr-muted hover:text-fenr-orange transition-colors text-lg">📌</button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-fenr-muted gap-4">
              <span className="text-5xl rune-glow select-none">ᚠ</span>
              <p className="text-sm">Summoning messages...</p>
            </div>
          ) : displayMessages.length === 0 ? (
            searchResults !== null ? (
              <div className="flex flex-col items-center justify-center h-32 text-fenr-muted text-sm">
                <span className="text-2xl mb-2">🔍</span>
                No messages found for "{searchQuery}"
              </div>
            ) : (
              <div className="px-6 pt-12 pb-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-3xl"
                  style={{ background: 'linear-gradient(135deg, rgba(74,122,255,0.15), rgba(77,209,196,0.1))', border: '1px solid rgba(74,122,255,0.2)' }}>
                  #
                </div>
                <h3 className="text-fenr-text text-2xl font-display mb-2">Welcome to #{hall.name}</h3>
                <p className="text-fenr-muted text-sm max-w-md">
                  This is the beginning of the <strong className="text-fenr-text">#{hall.name}</strong> hall.
                  The pack gathers here — speak freely.
                </p>
              </div>
            )
          ) : (
            <>
              {searchResults !== null && (
                <div className="px-4 py-2 text-fenr-muted text-xs border-b" style={{ borderColor: 'rgba(74,122,255,0.1)', background: 'rgba(74,122,255,0.04)' }}>
                  {searching ? 'Searching...' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`}
                </div>
              )}
              {withDividers.map((item, i) =>
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
                    isOwn={item.msg.user_id === session?.user?.id}
                    currentUserId={session?.user?.id}
                    customEmojis={customEmojis}
                    canModerate={isOwner}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    onReact={handleReact}
                    onPin={handlePin}
                    onThread={setThreadMessage}
                  />
                )
              )}
            </>
          )}

          <TypingIndicator users={typingUsers} />
          <div ref={bottomRef} />
        </div>

        <MessageInput hallName={hall.name} onSend={sendMessage} onTyping={handleTyping} customEmojis={customEmojis} />
      </div>

      {threadMessage && (
        <ThreadPanel message={threadMessage} channelId={hall.id} onClose={() => setThreadMessage(null)} />
      )}
      {showPins && (
        <PinnedMessages channelId={hall.id} onClose={() => setShowPins(false)} />
      )}
    </div>
  );
}
