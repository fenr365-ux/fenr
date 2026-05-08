import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useCustomEmojis } from '../../hooks/useCustomEmojis';
import Message from './Message';
import MessageInput from './MessageInput';

export default function ChatArea({ hall, serverId }) {
  const customEmojis = useCustomEmojis(serverId);
  const { session } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const bottomRef = useRef(null);
  const joinedHallRef = useRef(null);

  useEffect(() => {
    if (!hall) return;
    loadMessages();
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

    function onUserTyping() {
      setTypingUsers(prev => new Set([...prev, 'someone']));
      setTimeout(() => setTypingUsers(new Set()), 3000);
    }

    socket.on('new_message', onNewMessage);
    socket.on('message_edited', onMessageEdited);
    socket.on('message_deleted', onMessageDeleted);
    socket.on('reaction_update', onReactionUpdate);
    socket.on('user_typing', onUserTyping);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('message_edited', onMessageEdited);
      socket.off('message_deleted', onMessageDeleted);
      socket.off('reaction_update', onReactionUpdate);
      socket.off('user_typing', onUserTyping);
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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

  return (
    <div className="flex flex-col h-full">
      {/* Hall header */}
      <div
        className="h-12 flex items-center px-4 flex-shrink-0 border-b"
        style={{ borderColor: 'rgba(74,122,255,0.1)', background: 'rgba(26,29,33,0.8)', backdropFilter: 'blur(8px)' }}
      >
        <span className="text-fenr-brand font-bold mr-2 text-lg opacity-60">#</span>
        <h3 className="font-semibold text-fenr-text">{hall.name}</h3>
        <span className="ml-3 text-fenr-muted text-xs hidden sm:block">·  Speak. Sync. Strengthen.</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-fenr-muted gap-3">
            <span className="text-4xl animate-pulse">🐺</span>
            <p className="text-sm">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col px-4 pt-10">
            <div className="text-5xl mb-4 opacity-20">ᚠ</div>
            <h3 className="text-fenr-text text-2xl font-display mb-1">Welcome to #{hall.name}</h3>
            <p className="text-fenr-muted text-sm">This is the beginning of the #{hall.name} hall. Unleash your voice.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <Message
              key={msg.id}
              message={msg}
              showHeader={i === 0 || messages[i - 1]?.user_id !== msg.user_id}
              isOwn={msg.user_id === session?.user?.id}
              currentUserId={session?.user?.id}
              customEmojis={customEmojis}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onReact={handleReact}
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
  );
}
