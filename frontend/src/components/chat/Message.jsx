import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import EmojiPicker from './EmojiPicker';
import LinkEmbed, { extractUrls } from './LinkEmbed';

// Configure marked — safe, no HTML passthrough
marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(content) {
  // Parse inline markdown only — no block-level headings in chat
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let html = escaped
    // Code blocks ```...```
    .replace(/```([\s\S]*?)```/g, (_, code) =>
      `<pre><code>${code.trim()}</code></pre>`)
    // Inline code `...`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold **...**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic *...*  (not touching **)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Strikethrough ~~...~~
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Blockquote > at line start
    .replace(/^&gt;\s?(.+)$/gm, '<blockquote>$1</blockquote>')
    // URLs — autolink (skip already-in-tags)
    .replace(/(?<!href="|">)(https?:\/\/[^\s<>"]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

  return html;
}

const PACK_COLORS = ['#4A7AFF', '#4DD1C4', '#FF7A3D', '#FF4D4D', '#9c84ef', '#faa61a'];
function getPackColor(username) {
  if (!username) return PACK_COLORS[0];
  let h = 0;
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) % PACK_COLORS.length;
  return PACK_COLORS[Math.abs(h)];
}

function formatTimestamp(dateStr, short = false) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (short) return time;
  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Yesterday at ${time}`;
  return `${date.toLocaleDateString()} at ${time}`;
}

function AttachmentDisplay({ attachments }) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((att, i) => {
        if (att.type?.startsWith('image/') || att.name === 'GIF') {
          return (
            <img
              key={i}
              src={att.url}
              alt={att.name}
              className="max-w-xs max-h-64 rounded-xl object-contain cursor-pointer transition-opacity hover:opacity-90"
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
            style={{ background: 'rgba(74,122,255,0.08)', border: '1px solid rgba(74,122,255,0.18)' }}
          >
            <span>📎</span>
            <span className="max-w-48 truncate">{att.name}</span>
            {att.size > 0 && <span className="text-fenr-muted text-xs">{(att.size / 1024).toFixed(0)}kb</span>}
          </a>
        );
      })}
    </div>
  );
}

export default function Message({ message, showHeader, isOwn, currentUserId, customEmojis, onDelete, onReact, onEdit, onPin, onThread, canModerate }) {
  const [hovered, setHovered] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const editRef = useRef(null);
  const username = message.profiles?.username || 'Unknown';
  const color = getPackColor(username);
  const urls = extractUrls(message.content);

  // Resolve custom emoji :name: in content
  const emojiMap = Object.fromEntries((customEmojis || []).map(e => [e.name, e.url]));
  function resolveCustomEmoji(text) {
    return text.replace(/:([a-z0-9_]+):/g, (match, name) =>
      emojiMap[name]
        ? `<img src="${emojiMap[name]}" alt=":${name}:" title=":${name}:" style="display:inline-block;width:22px;height:22px;object-fit:contain;vertical-align:middle;margin:0 1px" />`
        : match
    );
  }

  const renderedHtml = resolveCustomEmoji(renderMarkdown(message.content));

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [editing]);

  function handleEditKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
    if (e.key === 'Escape') { setEditing(false); setEditContent(message.content); }
  }

  function submitEdit() {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === message.content) { setEditing(false); return; }
    onEdit(message.id, trimmed);
    setEditing(false);
  }

  // Group reactions
  const reactionMap = {};
  for (const r of message.reactions || []) {
    if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, reacted: false };
    reactionMap[r.emoji].count++;
    if (r.user_id === currentUserId) reactionMap[r.emoji].reacted = true;
  }

  return (
    <div
      className={`msg-row relative flex gap-3 px-4 msg-enter ${showHeader ? 'mt-4 pt-1' : 'pt-0.5'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmojiPicker(false); }}
    >
      {/* Avatar column */}
      <div className="w-10 flex-shrink-0 flex items-start justify-center pt-0.5">
        {showHeader ? (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold select-none flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${color}88, ${color})`, boxShadow: `0 2px 8px ${color}44` }}
          >
            {username[0]?.toUpperCase()}
          </div>
        ) : (
          hovered && (
            <span className="text-fenr-muted text-[10px] leading-none mt-1.5 select-none w-10 text-center">
              {formatTimestamp(message.created_at, true)}
            </span>
          )
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-0.5">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-sm cursor-default" style={{ color }}>{username}</span>
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
              <kbd className="bg-fenr-active px-1.5 rounded text-fenr-text">Enter</kbd> save ·{' '}
              <kbd className="bg-fenr-active px-1.5 rounded text-fenr-text">Esc</kbd> cancel
            </p>
          </div>
        ) : (
          <div
            className="msg-content text-sm text-fenr-text"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}

        <AttachmentDisplay attachments={message.attachments} />

        {!editing && urls.map(url => <LinkEmbed key={url} url={url} />)}

        {/* Reactions */}
        {Object.keys(reactionMap).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(reactionMap).map(([emoji, { count, reacted }]) => (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className={`reaction-pill ${reacted ? 'reacted' : 'unreacted'}`}
              >
                <span>{emoji}</span>
                <span className="text-xs font-bold">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread reply count */}
        {message.reply_count > 0 && !editing && (
          <button
            onClick={() => onThread?.(message)}
            className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-fenr-brand hover:text-fenr-teal transition-colors group"
          >
            <span>💬</span>
            <span>{message.reply_count} {message.reply_count === 1 ? 'reply' : 'replies'}</span>
            <span className="text-fenr-muted group-hover:text-fenr-teal transition-colors">· View Thread</span>
          </button>
        )}
      </div>

      {/* Hover action bar */}
      {hovered && !editing && (
        <div
          className="absolute right-4 -top-4 flex items-center gap-0.5 rounded-lg px-1 py-1 z-20 shadow-xl slide-up"
          style={{ background: '#1e2228', border: '1px solid rgba(74,122,255,0.2)' }}
          onMouseEnter={() => setHovered(true)}
        >
          {/* React */}
          <div className="relative">
            <ActionBtn onClick={() => setShowEmojiPicker(v => !v)} title="Add Reaction" emoji="😊" color="#faa61a" />
            {showEmojiPicker && (
              <div className="absolute right-0 bottom-9 z-50">
                <EmojiPicker
                  onSelect={emoji => { onReact(message.id, emoji); setShowEmojiPicker(false); }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>

          {/* Thread */}
          <ActionBtn onClick={() => onThread?.(message)} title="Reply in Thread" emoji="💬" color="#4DD1C4" />

          {/* Pin */}
          <ActionBtn onClick={() => onPin?.(message)} title="Pin Message" emoji="📌" color="#FF7A3D" />

          {/* Edit own */}
          {isOwn && (
            <ActionBtn
              onClick={() => { setEditing(true); setEditContent(message.content); }}
              title="Edit Message"
              emoji="✏️"
              color="#9c84ef"
            />
          )}

          {/* Delete own or mod */}
          {(isOwn || canModerate) && (
            <ActionBtn onClick={() => onDelete(message.id)} title="Delete Message" emoji="🗑️" color="#FF4D4D" />
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ onClick, title, emoji, color }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="w-8 h-8 rounded-md flex items-center justify-center text-base transition-all duration-100"
      style={{
        background: hov ? `${color}22` : 'transparent',
        transform: hov ? 'scale(1.15)' : 'scale(1)',
      }}
    >
      {emoji}
    </button>
  );
}
