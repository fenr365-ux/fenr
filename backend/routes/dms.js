import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Get or create a DM channel between two users
router.post('/open', authenticateToken, async (req, res) => {
  const { target_user_id } = req.body;
  if (!target_user_id) return res.status(400).json({ error: 'target_user_id required' });
  if (target_user_id === req.user.id) return res.status(400).json({ error: 'Cannot DM yourself' });

  const [u1, u2] = [req.user.id, target_user_id].sort();

  // Check existing
  let { data: existing } = await supabase
    .from('dm_channels')
    .select('*, user1:profiles!dm_channels_user1_id_fkey(id,username,avatar_url), user2:profiles!dm_channels_user2_id_fkey(id,username,avatar_url)')
    .eq('user1_id', u1)
    .eq('user2_id', u2)
    .single();

  if (existing) return res.json(existing);

  const { data, error } = await supabase
    .from('dm_channels')
    .insert({ user1_id: u1, user2_id: u2 })
    .select('*, user1:profiles!dm_channels_user1_id_fkey(id,username,avatar_url), user2:profiles!dm_channels_user2_id_fkey(id,username,avatar_url)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get all DM channels for current user
router.get('/', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('dm_channels')
    .select('*, user1:profiles!dm_channels_user1_id_fkey(id,username,avatar_url), user2:profiles!dm_channels_user2_id_fkey(id,username,avatar_url)')
    .or(`user1_id.eq.${req.user.id},user2_id.eq.${req.user.id}`)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get DM messages
router.get('/:channelId/messages', authenticateToken, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const before = req.query.before;

  let query = supabase
    .from('dm_messages')
    .select('*, profiles(id, username, avatar_url)')
    .eq('channel_id', req.params.channelId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.json(data.reverse());
});

// Search users (for opening DMs)
router.get('/users/search', authenticateToken, async (req, res) => {
  const q = req.query.q?.trim();
  if (!q || q.length < 2) return res.json([]);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `%${q}%`)
    .neq('id', req.user.id)
    .limit(10);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
