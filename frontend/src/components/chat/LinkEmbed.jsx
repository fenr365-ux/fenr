import { useEffect, useState } from 'react';

// Detect URLs in text
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Known image extensions
const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|webp|svg|bmp)(\?.*)?$/i;

// YouTube embed
const YOUTUBE_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/;

function ImageEmbed({ url }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="mt-2 max-w-md">
      <img
        src={url}
        alt=""
        className="rounded-lg max-w-full max-h-80 object-contain cursor-pointer"
        style={{ border: '1px solid rgba(74,122,255,0.15)' }}
        onError={() => setFailed(true)}
        onClick={() => window.open(url, '_blank')}
      />
    </div>
  );
}

function YouTubeEmbed({ videoId }) {
  return (
    <div className="mt-2 rounded-lg overflow-hidden max-w-md" style={{ border: '1px solid rgba(74,122,255,0.15)' }}>
      <div className="relative" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube embed"
        />
      </div>
    </div>
  );
}

export function extractUrls(text) {
  return [...new Set(text.match(URL_REGEX) || [])];
}

export default function LinkEmbed({ url }) {
  const ytMatch = url.match(YOUTUBE_REGEX);
  if (ytMatch) return <YouTubeEmbed videoId={ytMatch[1]} />;
  if (IMAGE_EXTS.test(url)) return <ImageEmbed url={url} />;
  return null;
}
