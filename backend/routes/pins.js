import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Get pins for a channel
router.get('/:channelId', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('pinned_messages')
    .select('*')
    .eq('channel_id', req.params.channelId)
    .order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Pin a message
router.post('/', authenticateToken, async (req, res) => {
  const { channel_id, message_id, content, username } = req.body;
  const { data, error } = await supabase
    .from('pinned_messages')
    .upsert({ channel_id, message_id, content, username, pinned_by: req.user.id })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Unpin a message
router.delete('/:channelId/:messageId', authenticateToken, async (req, res) => {
  const { error } = await supabase
    .from('pinned_messages')
    .delete()
    .eq('channel_id', req.params.channelId)
    .eq('message_id', req.params.messageId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;
