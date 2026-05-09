import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCustomEmojis } from '../../hooks/useCustomEmojis';
import Message from './Message';
import MessageInput from './MessageInput';
import ThreadPanel from './ThreadPanel';
import PinnedMessages from './PinnedMessages';

export default function ChatArea({ hall, serverId, isOwner }) {
  const customEmojis = useCustomEmojis(serverId);
  const { session } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [threadMessage, setThreadMessage] = useState(null);
  const [showPins, setShowPins] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const bottomRef = useRef(null);
  const joinedHallRef = useRef(null);
  const searchTimer = useRef(null);

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

    function onNewMessage(msg) { setMessages(prev => [...prev, msg]); }

    function onMessageEdited({ id, content }) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, content, edited: true } : m));
    }

    function onMessageDeleted({ id }) {
      setMessages(prev => prev.filter(m => m.id !== id));
    }

    function onReactionUpdate({ messageId, reactions }) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reactions } : m));
    }

    function onReplyCountUpdate({ messageId }) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reply_count: (m.reply_count || 0) + 1 } : m));
    }

    function onUserTyping() {
      setTypingUsers(prev => new Set([...prev, 'someone']));
      setTimeout(() => setTypingUsers(new Set()), 3000);
    }

    socket.on('new_message', onNewMessage);
    socket.on('message_edited', onMessageEdited);
    socket.on('message_deleted', onMessageDeleted);
    socket.on('reaction_update', onReactionUpdate);
    socket.on('reply_count_update', onReplyCountUpdate);
    socket.on('user_typing', onUserTyping);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('message_edited', onMessageEdited);
      socket.off('message_deleted', onMessageDeleted);
      socket.off('reaction_update', onReactionUpdate);
      socket.off('reply_count_update', onReplyCountUpdate);
      socket.off('user_typing', onUserTyping);
    };
  }, [socket]);

  useEffect(() => {
    if (!searchResults) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
    if (!socket) return;
    socket.emit('send_message', { channelId: hall.id, content, attachments });
  }

  function handleTyping() {
    socket?.emit('typing', hall.id);
  }

  function handleDelete(messageId) {
    socket?.emit('delete_message', { messageId, channelId: hall.id });
  }

  function handleEdit(messageId, content) {
    socket?.emit('edit_message', { messageId, content, channelId: hall.id });
  }

  function handleReact(messageId, emoji) {
    socket?.emit('toggle_reaction', { messageId, emoji, channelId: hall.id });
  }

  async function handlePin(message) {
    await fetch('/api/pins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        channel_id: hall.id,
        message_id: message.id,
        content: message.content,
        username: message.profiles?.username
      })
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

  const displayMessages = searchResults !== null ? searchResults : messages;

  return (
    <div className="flex h-full">
      {/* Main chat column */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Hall header */}
        <div
          className="h-12 flex items-center px-4 flex-shrink-0 border-b gap-3"
          style={{ borderColor: 'rgba(74,122,255,0.1)', background: 'rgba(26,29,33,0.8)', backdropFilter: 'blur(8px)' }}
        >
          <span className="text-fenr-brand font-bold text-lg opacity-60">#</span>
          <h3 className="font-semibold text-fenr-text">{hall.name}</h3>
          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <input
              value={searchQuery}
              onChange={handleSearch}
              placeholder="Search messages..."
              className="fenr-input text-xs py-1 pl-7 pr-3 w-40 focus:w-52 transition-all"
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-fenr-muted text-xs">🔍</span>
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults(null); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-fenr-muted hover:text-fenr-text text-xs"
              >×</button>
            )}
          </div>

          {/* Pins button */}
          <button
            onClick={() => setShowPins(true)}
            title="Pinned Messages"
            className="text-fenr-muted hover:text-fenr-orange transition-colors text-base"
          >
            📌
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-2">
          {searchResults !== null && (
            <div className="px-4 py-2 mb-2" style={{ background: 'rgba(74,122,255,0.06)', borderBottom: '1px solid rgba(74,122,255,0.1)' }}>
              <p className="text-fenr-muted text-xs">
                {searching ? 'Searching...' : `${searchResults.length} results for "${searchQuery}"`}
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-fenr-muted gap-3">
              <span className="text-4xl animate-pulse">🐺</span>
              <p className="text-sm">Loading messages...</p>
            </div>
          ) : displayMessages.length === 0 ? (
            searchResults !== null ? (
              <div className="flex flex-col items-center justify-center h-32 text-fenr-muted text-sm">
                No messages found
              </div>
            ) : (
              <div className="flex flex-col px-4 pt-10">
                <div className="text-5xl mb-4 opacity-20">ᚠ</div>
                <h3 className="text-fenr-text text-2xl font-display mb-1">Welcome to #{hall.name}</h3>
                <p className="text-fenr-muted text-sm">This is the beginning of the #{hall.name} hall. Unleash your voice.</p>
              </div>
            )
          ) : (
            displayMessages.map((msg, i) => (
              <Message
                key={msg.id}
                message={msg}
                showHeader={i === 0 || displayMessages[i - 1]?.user_id !== msg.user_id}
                isOwn={msg.user_id === session?.user?.id}
                currentUserId={session?.user?.id}
                customEmojis={customEmojis}
                canModerate={isOwner}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onReact={handleReact}
                onPin={handlePin}
                onThread={setThreadMessage}
              />
            ))
          )}

          {typingUsers.size > 0 && (
            <p className="text-fenr-muted text-xs px-16 mt-1 italic">Someone is typing...</p>
          )}

          <div ref={bottomRef} />
        </div>

        <MessageInput hallName={hall.name} onSend={sendMessage} onTyping={handleTyping} customEmojis={customEmojis} />
      </div>

      {/* Thread panel */}
      {threadMessage && (
        <ThreadPanel
          message={threadMessage}
          channelId={hall.id}
          onClose={() => setThreadMessage(null)}
        />
      )}

      {/* Pinned messages modal */}
      {showPins && (
        <PinnedMessages channelId={hall.id} onClose={() => setShowPins(false)} />
      )}
    </div>
  );
}
