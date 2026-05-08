import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Get all channels for a server
router.get('/:serverId', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('server_id', req.params.serverId)
    .order('created_at');

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Create a channel
router.post('/', authenticateToken, async (req, res) => {
  const { server_id, name, type, is_voice } = req.body;
  if (!server_id || !name) return res.status(400).json({ error: 'server_id and name required' });

  const { data, error } = await supabase
    .from('channels')
    .insert({ server_id, name: name.toLowerCase().replace(/\s+/g, '-'), type: type || 'text', is_voice: is_voice || false })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Delete a channel
router.delete('/:id', authenticateToken, async (req, res) => {
  const { error } = await supabase
    .from('channels')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;
