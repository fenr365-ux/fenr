import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../context/AuthContext';

const BUCKET = 'fenr-emojis';
const MAX_SIZE = 1024 * 1024; // 1MB

export default function CustomEmojiManager({ realm, onClose }) {
  const { session } = useAuth();
  const [emojis, setEmojis] = useState([]);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadEmojis();
  }, [realm?.id]);

  async function loadEmojis() {
    const { data } = await supabase
      .from('custom_emojis')
      .select('*')
      .eq('server_id', realm.id)
      .order('created_at');
    if (data) setEmojis(data);
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanName) { setError('Enter an emoji name first'); return; }
    if (file.size > MAX_SIZE) { setError('Max file size is 1MB'); return; }
    if (!file.type.startsWith('image/')) { setError('Must be an image file'); return; }

    setUploading(true);
    const path = `${realm.id}/${cleanName}-${Date.now()}.${file.name.split('.').pop()}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true });

    if (uploadError) { setError(uploadError.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);

    const { error: dbError } = await supabase.from('custom_emojis').insert({
      server_id: realm.id,
      name: cleanName,
      url: publicUrl,
      created_by: session.user.id
    });

    if (dbError) {
      setError(dbError.message);
    } else {
      setName('');
      await loadEmojis();
    }
    setUploading(false);
    e.target.value = '';
  }

  async function deleteEmoji(emoji) {
    await supabase.from('custom_emojis').delete().eq('id', emoji.id);
    await loadEmojis();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(74,122,255,0.15)' }}>
          <div>
            <h2 className="font-display text-fenr-text text-lg">Realm Emojis</h2>
            <p className="text-fenr-muted text-xs mt-0.5">{realm.name} · {emojis.length} emojis</p>
          </div>
          <button onClick={onClose} className="text-fenr-muted hover:text-fenr-text text-2xl leading-none transition-colors">×</button>
        </div>

        {/* Upload section */}
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(74,122,255,0.15)' }}>
          <p className="text-fenr-muted text-xs uppercase tracking-widest font-semibold mb-3">Upload New Emoji</p>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="emoji_name"
              className="fenr-input flex-1 text-sm"
            />
            <button
              onClick={() => { if (!name.trim()) { setError('Enter a name first'); return; } fileInputRef.current?.click(); }}
              disabled={uploading}
              className="fenr-btn px-4 py-2 text-sm whitespace-nowrap"
            >
              {uploading ? 'Uploading...' : 'Upload Image'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
          {error && <p className="text-fenr-red text-xs mt-2">{error}</p>}
          <p className="text-fenr-muted text-xs mt-2">PNG, GIF, or JPEG · Max 1MB · Use as <span className="text-fenr-brand">:emoji_name:</span> in chat</p>
        </div>

        {/* Emoji list */}
        <div className="px-5 py-3 max-h-72 overflow-y-auto">
          {emojis.length === 0 ? (
            <p className="text-fenr-muted text-sm text-center py-6">No custom emojis yet — upload one above</p>
          ) : (
            <div className="space-y-2">
              {emojis.map(emoji => (
                <div key={emoji.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-fenr-active transition-colors group">
                  <img src={emoji.url} alt={emoji.name} className="w-8 h-8 object-contain rounded" />
                  <span className="text-fenr-text text-sm flex-1">:{emoji.name}:</span>
                  <button
                    onClick={() => deleteEmoji(emoji)}
                    className="text-fenr-muted hover:text-fenr-red opacity-0 group-hover:opacity-100 transition-all text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
