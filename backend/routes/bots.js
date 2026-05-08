import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Get all bots owned by user
router.get('/', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('bots')
    .select('*')
    .eq('owner_id', req.user.id)
    .order('created_at');
  if (error) return res.status(400).json({ error: error.message });
  // Never expose token in list
  res.json(data.map(b => ({ ...b, token: `${b.token.slice(0, 8)}...` })));
});

// Create a bot
router.post('/', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Bot name required' });

  const { data, error } = await supabase
    .from('bots')
    .insert({ name: name.trim(), owner_id: req.user.id })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data); // Return full token on creation only
});

// Get a bot's full token (owner only)
router.get('/:id/token', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('bots')
    .select('token, name')
    .eq('id', req.params.id)
    .eq('owner_id', req.user.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Bot not found' });
  res.json(data);
});

// Regenerate token
router.post('/:id/token/regenerate', authenticateToken, async (req, res) => {
  const { data, error } = await supabase.rpc('regenerate_bot_token', { bot_id: req.params.id, requesting_user: req.user.id });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ token: data });
});

// Delete a bot
router.delete('/:id', authenticateToken, async (req, res) => {
  const { error } = await supabase
    .from('bots')
    .delete()
    .eq('id', req.params.id)
    .eq('owner_id', req.user.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Add bot to a realm
router.post('/:id/realms', authenticateToken, async (req, res) => {
  const { server_id } = req.body;
  if (!server_id) return res.status(400).json({ error: 'server_id required' });

  // Verify bot belongs to user
  const { data: bot } = await supabase.from('bots').select('id').eq('id', req.params.id).eq('owner_id', req.user.id).single();
  if (!bot) return res.status(403).json({ error: 'Not your bot' });

  const { data, error } = await supabase
    .from('bot_members')
    .insert({ bot_id: req.params.id, server_id, added_by: req.user.id })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get bots in a realm
router.get('/realm/:serverId', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('bot_members')
    .select('*, bots(id, name, avatar_url)')
    .eq('server_id', req.params.serverId);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data.map(bm => bm.bots).filter(Boolean));
});

// Remove bot from realm
router.delete('/:id/realms/:serverId', authenticateToken, async (req, res) => {
  const { error } = await supabase
    .from('bot_members')
    .delete()
    .eq('bot_id', req.params.id)
    .eq('server_id', req.params.serverId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;
