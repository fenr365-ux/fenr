import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Get a free key at developers.giphy.com — set GIPHY_API_KEY in Railway
// dc6zaTOxFJmzC is Giphy's legacy public beta key (limited but works)
const GIPHY_KEY = process.env.GIPHY_API_KEY || 'dc6zaTOxFJmzC';
const BASE = 'https://api.giphy.com/v1/gifs';

function mapResults(data = []) {
  return data.map(g => ({
    id: g.id,
    title: g.title,
    url: g.images?.original?.url || g.images?.fixed_height?.url,
    preview: g.images?.fixed_height?.url || g.images?.original?.url,
  })).filter(g => g.url);
}

router.get('/search', async (req, res) => {
  const { q = 'reaction', limit = 20 } = req.query;
  try {
    const url = `${BASE}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g&lang=en`;
    const r = await fetch(url);
    const json = await r.json();
    if (json.meta?.status !== 200) {
      console.error('[GIF search]', json.meta);
      return res.status(500).json({ error: 'GIF search failed' });
    }
    res.json(mapResults(json.data));
  } catch (e) {
    console.error('[GIF search error]', e.message);
    res.status(500).json({ error: 'GIF search failed' });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const url = `${BASE}/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`;
    const r = await fetch(url);
    const json = await r.json();
    if (json.meta?.status !== 200) {
      console.error('[GIF trending]', json.meta);
      return res.status(500).json({ error: 'Failed to load trending GIFs' });
    }
    res.json(mapResults(json.data));
  } catch (e) {
    console.error('[GIF trending error]', e.message);
    res.status(500).json({ error: 'Failed to load trending GIFs' });
  }
});

export default router;
