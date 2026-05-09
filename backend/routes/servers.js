import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Get all servers for the current user
router.get('/', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('server_members')
    .select('servers(*)')
    .eq('user_id', req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data.map(sm => sm.servers).filter(Boolean));
});

// Create a new server
router.post('/', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Server name required' });

  const { data: server, error: serverError } = await supabase
    .from('servers')
    .insert({ name, owner_id: req.user.id })
    .select()
    .single();

  if (serverError) return res.status(400).json({ error: serverError.message });

  // Add owner as member
  await supabase.from('server_members').insert({
    server_id: server.id,
    user_id: req.user.id,
    role: 'owner'
  });

  // Create default #general channel
  await supabase.from('channels').insert({
    server_id: server.id,
    name: 'general',
    type: 'text'
  });

  res.json(server);
});

// Join server by invite code
router.post('/join', authenticateToken, async (req, res) => {
  const { invite_code } = req.body;
  if (!invite_code) return res.status(400).json({ error: 'Invite code required' });

  const { data: server, error: serverError } = await supabase
    .from('servers')
    .select('*')
    .eq('invite_code', invite_code)
    .single();

  if (serverError || !server) return res.status(404).json({ error: 'Invalid invite code' });

  const { error } = await supabase.from('server_members').insert({
    server_id: server.id,
    user_id: req.user.id,
    role: 'member'
  });

  if (error) return res.status(400).json({ error: error.message });
  res.json(server);
});

// Get invite code for a server
router.get('/:id/invite', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('servers')
    .select('invite_code, name')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Server not found' });
  res.json(data);
});

// Public invite lookup (no auth required)
router.get('/invite/:code', async (req, res) => {
  const { data: server, error } = await supabase
    .from('servers')
    .select('id, name')
    .eq('invite_code', req.params.code)
    .single();

  if (error || !server) return res.status(404).json({ error: 'Invalid invite link' });

  const { count } = await supabase
    .from('server_members')
    .select('*', { count: 'exact', head: true })
    .eq('server_id', server.id);

  res.json({ id: server.id, name: server.name, member_count: count });
});

// Get members of a server
router.get('/:id/members', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('server_members')
    .select('role, profiles(id, username)')
    .eq('server_id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data.map(m => ({ ...m.profiles, role: m.role })).filter(Boolean));
});

// Delete server (owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  const { error } = await supabase
    .from('servers')
    .delete()
    .eq('id', req.params.id)
    .eq('owner_id', req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;
