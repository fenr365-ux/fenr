import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';
import { isOwnerOrHasPermission } from './roles.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Kick member
router.delete('/:serverId/kick/:userId', authenticateToken, async (req, res) => {
  const { serverId, userId } = req.params;
  if (userId === req.user.id) return res.status(400).json({ error: 'Cannot kick yourself' });
  if (!await isOwnerOrHasPermission(serverId, req.user.id, 'kick_members'))
    return res.status(403).json({ error: 'No permission' });

  const { data: target } = await supabase.from('server_members').select('role')
    .eq('server_id', serverId).eq('user_id', userId).single();
  if (target?.role === 'owner') return res.status(403).json({ error: 'Cannot kick owner' });

  const { error } = await supabase.from('server_members').delete()
    .eq('server_id', serverId).eq('user_id', userId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Ban member
router.post('/:serverId/ban/:userId', authenticateToken, async (req, res) => {
  const { serverId, userId } = req.params;
  const { reason } = req.body;
  if (userId === req.user.id) return res.status(400).json({ error: 'Cannot ban yourself' });
  if (!await isOwnerOrHasPermission(serverId, req.user.id, 'ban_members'))
    return res.status(403).json({ error: 'No permission' });

  const { data: target } = await supabase.from('server_members').select('role')
    .eq('server_id', serverId).eq('user_id', userId).single();
  if (target?.role === 'owner') return res.status(403).json({ error: 'Cannot ban owner' });

  await supabase.from('server_bans').upsert({
    server_id: serverId, user_id: userId, banned_by: req.user.id, reason: reason || null
  });
  await supabase.from('server_members').delete().eq('server_id', serverId).eq('user_id', userId);
  res.json({ success: true });
});

// Unban
router.delete('/:serverId/ban/:userId', authenticateToken, async (req, res) => {
  const { serverId, userId } = req.params;
  if (!await isOwnerOrHasPermission(serverId, req.user.id, 'ban_members'))
    return res.status(403).json({ error: 'No permission' });

  const { error } = await supabase.from('server_bans').delete()
    .eq('server_id', serverId).eq('user_id', userId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// List bans
router.get('/:serverId/bans', authenticateToken, async (req, res) => {
  const { serverId } = req.params;
  if (!await isOwnerOrHasPermission(serverId, req.user.id, 'ban_members'))
    return res.status(403).json({ error: 'No permission' });

  const { data, error } = await supabase.from('server_bans')
    .select('*, profiles!server_bans_user_id_fkey(username)')
    .eq('server_id', serverId);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Timeout (mute) member
router.post('/:serverId/timeout/:userId', authenticateToken, async (req, res) => {
  const { serverId, userId } = req.params;
  const { minutes = 10 } = req.body;
  if (!await isOwnerOrHasPermission(serverId, req.user.id, 'timeout_members'))
    return res.status(403).json({ error: 'No permission' });

  const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  const { error } = await supabase.from('server_members')
    .update({ muted_until: until })
    .eq('server_id', serverId).eq('user_id', userId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, muted_until: until });
});

// Remove timeout
router.delete('/:serverId/timeout/:userId', authenticateToken, async (req, res) => {
  const { serverId, userId } = req.params;
  if (!await isOwnerOrHasPermission(serverId, req.user.id, 'timeout_members'))
    return res.status(403).json({ error: 'No permission' });

  const { error } = await supabase.from('server_members')
    .update({ muted_until: null })
    .eq('server_id', serverId).eq('user_id', userId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;
