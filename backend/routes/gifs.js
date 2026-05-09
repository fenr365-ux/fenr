import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
// LIVDSRZULELA is Tenor's official public demo key
const TENOR_KEY = process.env.TENOR_API_KEY || 'LIVDSRZULELA';

function mapResults(results = []) {
  return results.map(r => ({
    id: r.id,
    title: r.title,
    url: r.media_formats?.gif?.url,
    preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url,
  })).filter(r => r.url);
}

router.get('/search', async (req, res) => {
  const { q = 'trending', limit = 20 } = req.query;
  try {
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=${limit}&media_filter=gif`;
    const r = await fetch(url);
    const data = await r.json();
    if (data.error) { console.error('[GIF search]', data.error); return res.status(500).json({ error: data.error.message }); }
    res.json(mapResults(data.results));
  } catch (e) {
    console.error('[GIF search error]', e.message);
    res.status(500).json({ error: 'GIF search failed' });
  }
});

router.get('/trending', async (req, res) => {
  try {
    const url = `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=20&media_filter=gif`;
    const r = await fetch(url);
    const data = await r.json();
    if (data.error) { console.error('[GIF trending]', data.error); return res.status(500).json({ error: data.error.message }); }
    res.json(mapResults(data.results));
  } catch (e) {
    console.error('[GIF trending error]', e.message);
    res.status(500).json({ error: 'Failed to load trending GIFs' });
  }
});

export default router;
