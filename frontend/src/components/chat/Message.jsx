import { useState, useRef, useEffect } from 'react';
import EmojiPicker from './EmojiPicker';
import LinkEmbed, { extractUrls } from './LinkEmbed';

// Renders text with :custom_emoji: replaced by inline images
function MessageText({ content, customEmojis = [] }) {
  if (!customEmojis.length) {
    return <span>{content}</span>;
  }
  const emojiMap = Object.fromEntries(customEmojis.map(e => [e.name, e.url]));
  const parts = content.split(/:([a-z0-9_]+):/g);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1 && emojiMap[part]) {
          return (
            <img
              key={i}
              src={emojiMap[part]}
              alt={`:${part}:`}
              title={`:${part}:`}
              className="inline-block w-6 h-6 object-contain align-middle mx-0.5"
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

const PACK_COLORS = ['#4A7AFF', '#4DD1C4', '#FF7A3D', '#FF4D4D', '#9c84ef', '#faa61a'];

function getPackColor(username) {
  if (!username) return PACK_COLORS[0];
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) % PACK_COLORS.length;
  return PACK_COLORS[Math.abs(hash)];
}

function formatTimestamp(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Yesterday at ${time}`;
  return `${date.toLocaleDateString()} at ${time}`;
}

function AttachmentDisplay({ attachments }) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((att, i) => {
        if (att.type?.startsWith('image/')) {
          return (
            <img
              key={i}
              src={att.url}
              alt={att.name}
              className="max-w-xs max-h-64 rounded-lg object-contain cursor-pointer"
              style={{ border: '1px solid rgba(74,122,255,0.2)' }}
              onClick={() => window.open(att.url, '_blank')}
            />
          );
        }
        return (
          <a
            key={i}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-fenr-brand hover:text-blue-400 text-sm transition-colors"
            style={{ background: 'rgba(74,122,255,0.1)', border: '1px solid rgba(74,122,255,0.2)' }}
          >
            <span>📎</span>
            <span className="max-w-48 truncate">{att.name}</span>
            <span className="text-fenr-muted text-xs">{(att.size / 1024).toFixed(0)}kb</span>
          </a>
        );
      })}
    </div>
  );
}

export default function Message({ message, showHeader, isOwn, currentUserId, customEmojis, onDelete, onReact, onEdit }) {
  const [hovered, setHovered] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editRef = useRef(null);
  const username = message.profiles?.username || 'Unknown';
  const color = getPackColor(username);
  const urls = extractUrls(message.content);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [editing]);

  function handleEditKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitEdit();
    }
    if (e.key === 'Escape') {
      setEditing(false);
      setEditContent(message.content);
    }
  }

  function submitEdit() {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === message.content) {
      setEditing(false);
      return;
    }
    onEdit(message.id, trimmed);
    setEditing(false);
  }

  // Group reactions: { emoji: { count, reacted } }
  const reactionMap = {};
  for (const r of message.reactions || []) {
    if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, reacted: false };
    reactionMap[r.emoji].count++;
    if (r.user_id === currentUserId) reactionMap[r.emoji].reacted = true;
  }

  return (
    <div
      className={`relative flex gap-3 px-4 py-0.5 group transition-colors ${showHeader ? 'mt-4 pt-1' : ''}`}
      style={{ ':hover': { background: 'rgba(255,255,255,0.02)' } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmojiPicker(false); }}
    >
      {/* Avatar */}
      <div className="w-10 flex-shrink-0 flex items-start justify-center mt-0.5">
        {showHeader && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold select-none"
            style={{ background: `linear-gradient(135deg, ${color}99, ${color})` }}
          >
            {username[0]?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-semibold text-sm" style={{ color }}>{username}</span>
            <span className="text-fenr-muted text-xs">{formatTimestamp(message.created_at)}</span>
            {message.edited && <span className="text-fenr-muted text-xs italic">(edited)</span>}
          </div>
        )}

        {editing ? (
          <div>
            <textarea
              ref={editRef}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              rows={2}
              className="fenr-input w-full text-sm resize-none"
            />
            <p className="text-fenr-muted text-xs mt-1">
              <kbd className="bg-fenr-active px-1 rounded">Enter</kbd> to save ·{' '}
              <kbd className="bg-fenr-active px-1 rounded">Esc</kbd> to cancel
            </p>
          </div>
        ) : (
          <p className="text-fenr-text text-sm leading-relaxed break-words whitespace-pre-wrap">
            <MessageText content={message.content} customEmojis={customEmojis} />
          </p>
        )}

        {/* Attachments */}
        <AttachmentDisplay attachments={message.attachments} />

        {/* Link embeds */}
        {!editing && urls.map(url => <LinkEmbed key={url} url={url} />)}

        {/* Reactions */}
        {Object.keys(reactionMap).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(reactionMap).map(([emoji, { count, reacted }]) => (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-all"
                style={{
                  background: reacted ? 'rgba(74,122,255,0.2)' : 'rgba(60,66,74,0.5)',
                  border: `1px solid ${reacted ? 'rgba(74,122,255,0.5)' : 'rgba(74,122,255,0.15)'}`,
                  color: reacted ? '#4A7AFF' : '#7A8290'
                }}
              >
                <span>{emoji}</span>
                <span className="text-xs font-semibold">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action bar (hover) */}
      {hovered && !editing && (
        <div
          className="absolute right-4 -top-4 flex items-center gap-1 glass rounded-lg px-1.5 py-1 z-10 shadow-lg"
          onMouseEnter={() => setHovered(true)}
        >
          {/* React */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(v => !v)}
              title="Add Reaction"
              className="w-7 h-7 rounded hover:bg-fenr-brand/20 flex items-center justify-center text-fenr-muted hover:text-fenr-teal transition-colors text-base"
            >
              😊
            </button>
            {showEmojiPicker && (
              <div className="absolute right-0 bottom-9 z-50">
                <EmojiPicker
                  onSelect={emoji => onReact(message.id, emoji)}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>

          {/* Edit (own messages only) */}
          {isOwn && (
            <button
              onClick={() => { setEditing(true); setEditContent(message.content); }}
              title="Edit Message"
              className="w-7 h-7 rounded hover:bg-fenr-brand/20 flex items-center justify-center text-fenr-muted hover:text-fenr-text transition-colors text-sm"
            >
              ✏️
            </button>
          )}

          {/* Delete (own messages only) */}
          {isOwn && (
            <button
              onClick={() => onDelete(message.id)}
              title="Delete Message"
              className="w-7 h-7 rounded hover:bg-fenr-red/20 flex items-center justify-center text-fenr-muted hover:text-fenr-red transition-colors text-sm"
            >
              🗑️
            </button>
          )}
        </div>
      )}
    </div>
  );
}
