import { useState, useEffect, useRef } from 'react';

export default function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchTimer = useRef(null);

  useEffect(() => {
    loadTrending();
  }, []);

  async function loadTrending() {
    setLoading(true);
    try {
      const r = await fetch('/api/gifs/trending');
      if (r.ok) setGifs(await r.json());
    } catch {}
    setLoading(false);
  }

  function handleSearch(e) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { loadTrending(); return; }
    searchTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/gifs/search?q=${encodeURIComponent(q)}`);
        if (r.ok) setGifs(await r.json());
      } catch {}
      setLoading(false);
    }, 400);
  }

  return (
    <div className="glass rounded-xl shadow-2xl z-50 flex flex-col" style={{ width: '320px', height: '380px' }}>
      <div className="p-2 border-b" style={{ borderColor: 'rgba(74,122,255,0.15)' }}>
        <input
          autoFocus
          value={query}
          onChange={handleSearch}
          placeholder="Search GIFs..."
          className="fenr-input w-full text-sm py-1.5"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-1 grid grid-cols-2 gap-1 content-start">
        {loading ? (
          <div className="col-span-2 flex items-center justify-center h-32 text-fenr-muted text-sm">Loading...</div>
        ) : gifs.length === 0 ? (
          <div className="col-span-2 flex items-center justify-center h-32 text-fenr-muted text-sm">No GIFs found</div>
        ) : gifs.map(gif => (
          <button
            key={gif.id}
            onClick={() => { onSelect(gif.url); onClose(); }}
            className="rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
          >
            <img src={gif.preview || gif.url} alt={gif.title} className="w-full h-24 object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      <div className="p-1 text-center">
        <button onClick={onClose} className="text-fenr-muted text-xs hover:text-fenr-text transition-colors">Close</button>
      </div>
    </div>
  );
}
