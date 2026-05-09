import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Search messages in a server
router.get('/:serverId', authenticateToken, async (req, res) => {
  const { q, channelId } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });

  const { data: member } = await supabase
    .from('server_members').select('id')
    .eq('server_id', req.params.serverId).eq('user_id', req.user.id).single();
  if (!member) return res.status(403).json({ error: 'Not a member' });

  let channelIds = [];
  if (channelId) {
    channelIds = [channelId];
  } else {
    const { data: channels } = await supabase.from('channels')
      .select('id').eq('server_id', req.params.serverId);
    channelIds = channels?.map(c => c.id) || [];
  }

  if (!channelIds.length) return res.json([]);

  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles(username)')
    .ilike('content', `%${q}%`)
    .in('channel_id', channelIds)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
