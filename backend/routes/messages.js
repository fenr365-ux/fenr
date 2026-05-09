import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Get messages for a hall (newest 50, with reactions)
router.get('/:channelId', authenticateToken, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const before = req.query.before;

  let query = supabase
    .from('messages')
    .select('*, profiles(id, username, avatar_url), reactions:message_reactions(id, emoji, user_id)')
    .eq('channel_id', req.params.channelId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) query = query.lt('created_at', before);

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.json(data.reverse());
});

// Get thread replies for a message
router.get('/:channelId/thread/:messageId', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles(id, username, avatar_url), reactions:message_reactions(id, emoji, user_id)')
    .eq('channel_id', req.params.channelId)
    .eq('thread_id', req.params.messageId)
    .order('created_at', { ascending: true });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
