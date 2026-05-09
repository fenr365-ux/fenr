import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export async function isOwnerOrHasPermission(serverId, userId, permission = null) {
  const { data: member } = await supabase
    .from('server_members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .single();

  if (!member) return false;
  if (member.role === 'owner') return true;
  if (!permission) return false;

  const { data: roles } = await supabase
    .from('member_roles')
    .select('server_roles(permissions)')
    .eq('server_id', serverId)
    .eq('user_id', userId);

  return roles?.some(r => r.server_roles?.permissions?.[permission]) || false;
}

// Get all roles for a server
router.get('/:serverId', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('server_roles')
    .select('*')
    .eq('server_id', req.params.serverId)
    .order('position');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Create role
router.post('/:serverId', authenticateToken, async (req, res) => {
  const { serverId } = req.params;
  if (!await isOwnerOrHasPermission(serverId, req.user.id, 'manage_roles'))
    return res.status(403).json({ error: 'No permission' });

  const { name, color, permissions } = req.body;
  const { data, error } = await supabase
    .from('server_roles')
    .insert({ server_id: serverId, name, color: color || '#99AAB5', permissions: permissions || {} })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Update role
router.patch('/:serverId/:roleId', authenticateToken, async (req, res) => {
  const { serverId, roleId } = req.params;
  if (!await isOwnerOrHasPermission(serverId, req.user.id, 'manage_roles'))
    return res.status(403).json({ error: 'No permission' });

  const { name, color, permissions } = req.body;
  const { data, error } = await supabase
    .from('server_roles')
    .update({ name, color, permissions })
    .eq('id', roleId).eq('server_id', serverId)
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Delete role
router.delete('/:serverId/:roleId', authenticateToken, async (req, res) => {
  const { serverId, roleId } = req.params;
  if (!await isOwnerOrHasPermission(serverId, req.user.id, 'manage_roles'))
    return res.status(403).json({ error: 'No permission' });

  const { error } = await supabase.from('server_roles').delete()
    .eq('id', roleId).eq('server_id', serverId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Assign role to member
router.post('/:serverId/assign', authenticateToken, async (req, res) => {
  const { serverId } = req.params;
  if (!await isOwnerOrHasPermission(serverId, req.user.id, 'manage_roles'))
    return res.status(403).json({ error: 'No permission' });

  const { userId, roleId } = req.body;
  const { error } = await supabase.from('member_roles')
    .upsert({ server_id: serverId, user_id: userId, role_id: roleId });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Remove role from member
router.delete('/:serverId/assign/:userId/:roleId', authenticateToken, async (req, res) => {
  const { serverId, userId, roleId } = req.params;
  if (!await isOwnerOrHasPermission(serverId, req.user.id, 'manage_roles'))
    return res.status(403).json({ error: 'No permission' });

  const { error } = await supabase.from('member_roles').delete()
    .eq('server_id', serverId).eq('user_id', userId).eq('role_id', roleId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Get member roles
router.get('/:serverId/members/:userId', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('member_roles')
    .select('server_roles(*)')
    .eq('server_id', req.params.serverId)
    .eq('user_id', req.params.userId);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data.map(r => r.server_roles));
});

export default router;
