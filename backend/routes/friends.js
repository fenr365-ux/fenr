import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Get friends list (accepted) + pending requests
router.get('/', authenticateToken, async (req, res) => {
  const uid = req.user.id;

  const { data, error } = await supabase
    .from('friendships')
    .select('*, sender:profiles!friendships_sender_id_fkey(id,username,avatar_url), receiver:profiles!friendships_receiver_id_fkey(id,username,avatar_url)')
    .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Send friend request
router.post('/request', authenticateToken, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  // Find user by username
  const { data: target, error: findErr } = await supabase
    .from('profiles')
    .select('id, username')
    .ilike('username', username.trim())
    .neq('id', req.user.id)
    .single();

  if (findErr || !target) return res.status(404).json({ error: 'User not found' });

  // Check if friendship already exists either direction
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${target.id}),and(sender_id.eq.${target.id},receiver_id.eq.${req.user.id})`)
    .single();

  if (existing) {
    if (existing.status === 'accepted') return res.status(400).json({ error: 'Already friends' });
    return res.status(400).json({ error: 'Friend request already sent' });
  }

  const { data, error } = await supabase
    .from('friendships')
    .insert({ sender_id: req.user.id, receiver_id: target.id })
    .select('*, sender:profiles!friendships_sender_id_fkey(id,username), receiver:profiles!friendships_receiver_id_fkey(id,username)')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Accept friend request
router.post('/accept/:id', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', req.params.id)
    .eq('receiver_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Decline or remove friendship
router.delete('/:id', authenticateToken, async (req, res) => {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', req.params.id)
    .or(`sender_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;
