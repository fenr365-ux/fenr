import { useEffect, useRef } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

export default function EmojiPicker({ onSelect, onClose, customEmojis = [] }) {
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Build custom emoji categories for emoji-mart
  const customCategories = customEmojis.length > 0 ? [
    {
      id: 'realm-emojis',
      name: 'Realm Emojis',
      emojis: customEmojis.map(e => ({
        id: e.name,
        name: e.name,
        keywords: [e.name],
        skins: [{ src: e.url }]
      }))
    }
  ] : [];

  return (
    <div ref={ref}>
      <Picker
        data={data}
        custom={customCategories}
        onEmojiSelect={(emoji) => {
          // Custom emoji returns src, standard returns native
          if (emoji.src) {
            onSelect(`:${emoji.id}:`, emoji.src);
          } else {
            onSelect(emoji.native);
          }
          onClose();
        }}
        theme="dark"
        set="native"
        skinTonePosition="none"
        previewPosition="none"
        searchPosition="sticky"
        navPosition="top"
        perLine={8}
        maxFrequentRows={2}
        style={{
          '--color-border': 'rgba(74,122,255,0.2)',
          '--color-border-over': 'rgba(74,122,255,0.4)',
          '--rgb-background': '26,29,33',
          '--rgb-accent': '74,122,255',
          '--rgb-color': '242,245,247',
          '--rgb-input': '42,47,55',
          fontFamily: 'Rajdhani, sans-serif'
        }}
      />
    </div>
  );
}
