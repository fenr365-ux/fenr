import { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../context/AuthContext';
import EmojiPicker from './EmojiPicker';
import GifPicker from './GifPicker';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const BUCKET = 'fenr-attachments';

export default function MessageInput({ hallName, onSend, onTyping, customEmojis = [] }) {
  const { session } = useAuth();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const typingTimer = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleChange(e) {
    setContent(e.target.value);
    autoResize(e.target);
    if (!typingTimer.current) {
      onTyping?.();
      typingTimer.current = setTimeout(() => { typingTimer.current = null; }, 2000);
    }
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 144) + 'px';
  }

  async function uploadFiles(files) {
    if (!files.length) return [];
    setUploading(true);
    const uploaded = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} exceeds 25MB limit`);
        continue;
      }
      const path = `${session.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { data, error } = await supabase.storage.from(BUCKET).upload(path, file);
      if (!error && data) {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
        uploaded.push({ url: urlData.publicUrl, name: file.name, type: file.type, size: file.size });
      }
    }

    setUploading(false);
    return uploaded;
  }

  async function handleFileSelect(e) {
    const files = [...(e.target.files || [])];
    const uploaded = await uploadFiles(files);
    setAttachments(prev => [...prev, ...uploaded]);
    e.target.value = '';
  }

  async function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const files = [...e.dataTransfer.files];
    const uploaded = await uploadFiles(files);
    setAttachments(prev => [...prev, ...uploaded]);
  }

  function removeAttachment(i) {
    setAttachments(prev => prev.filter((_, idx) => idx !== i));
  }

  function addEmoji(emoji, customSrc) {
    // Custom emoji: insert :name: syntax; standard: insert native char
    setContent(prev => prev + (customSrc ? `:${emoji.replace(/:/g, '')}:` : emoji));
    setShowEmoji(false);
    textareaRef.current?.focus();
  }

  function addGif(url) {
    onSend('', [{ url, name: 'GIF', type: 'image/gif', size: 0 }]);
    setShowGif(false);
  }

  function submit() {
    if (!content.trim() && !attachments.length) return;
    onSend(content.trim(), attachments);
    setContent('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  return (
    <div
      className={`px-4 pb-5 flex-shrink-0 transition-colors ${dragOver ? 'bg-fenr-brand/5' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{ background: 'rgba(74,122,255,0.1)', border: '1px solid rgba(74,122,255,0.2)' }}
            >
              {att.type?.startsWith('image/') ? (
                <img src={att.url} alt={att.name} className="w-12 h-12 object-cover rounded" />
              ) : (
                <span>📎</span>
              )}
              <span className="text-fenr-text text-xs max-w-24 truncate">{att.name}</span>
              <button onClick={() => removeAttachment(i)} className="text-fenr-muted hover:text-fenr-red ml-1 leading-none text-lg">×</button>
            </div>
          ))}
        </div>
      )}

      {dragOver && (
        <div className="mb-2 text-center text-fenr-brand text-sm py-2 rounded-lg" style={{ border: '2px dashed rgba(74,122,255,0.4)' }}>
          Drop files to upload
        </div>
      )}

      <div
        className="flex items-end gap-2 px-3 py-2.5 rounded-xl"
        style={{ background: '#2A2F37', border: '1px solid rgba(74,122,255,0.12)' }}
      >
        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Upload file"
          className="text-fenr-muted hover:text-fenr-teal transition-colors flex-shrink-0 mb-0.5 text-xl leading-none"
        >
          {uploading ? '⏳' : '+'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Message input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${hallName}`}
          rows={1}
          className="flex-1 bg-transparent text-fenr-text placeholder-fenr-muted resize-none outline-none text-sm leading-relaxed overflow-y-auto"
          style={{ maxHeight: '144px', fontFamily: 'Rajdhani, sans-serif' }}
        />

        {/* GIF button */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => { setShowGif(v => !v); setShowEmoji(false); }}
            title="GIF"
            className="text-fenr-muted hover:text-fenr-teal transition-colors mb-0.5 text-xs font-bold leading-none px-1"
          >
            GIF
          </button>
          {showGif && (
            <div className="absolute bottom-10 right-0 z-50">
              <GifPicker onSelect={addGif} onClose={() => setShowGif(false)} />
            </div>
          )}
        </div>

        {/* Emoji button */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => { setShowEmoji(v => !v); setShowGif(false); }}
            title="Emoji"
            className="text-fenr-muted hover:text-fenr-orange transition-colors mb-0.5 text-xl leading-none"
          >
            😊
          </button>
          {showEmoji && (
            <div className="absolute bottom-10 right-0 z-50">
              <EmojiPicker onSelect={addEmoji} onClose={() => setShowEmoji(false)} customEmojis={customEmojis} />
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={submit}
          disabled={!content.trim() && !attachments.length}
          title="Send Howl"
          className="text-fenr-muted hover:text-fenr-brand disabled:opacity-30 transition-colors mb-0.5 flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      <p className="text-fenr-muted text-xs mt-1 px-1">
        <strong>Enter</strong> to send · <strong>Shift+Enter</strong> for new line · Drag & drop files to upload
      </p>
    </div>
  );
}
