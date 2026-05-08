import express from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Generate a LiveKit token for joining a voice channel
router.post('/token', authenticateToken, async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) return res.status(400).json({ error: 'channelId required' });

  if (!process.env.LIVEKIT_API_KEY || process.env.LIVEKIT_API_KEY.startsWith('REPLACE')) {
    return res.status(503).json({ error: 'Voice not configured — add LiveKit credentials to backend/.env' });
  }

  // Verify user is a member of this channel's server
  const { data: channel } = await supabase.from('channels').select('server_id').eq('id', channelId).single();
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  const { data: member } = await supabase
    .from('server_members')
    .select('id')
    .eq('server_id', channel.server_id)
    .eq('user_id', req.user.id)
    .single();

  if (!member) return res.status(403).json({ error: 'Not a member of this realm' });

  // Get username for display
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', req.user.id).single();

  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: req.user.id,
    name: profile?.username || req.user.id,
    ttl: '4h'
  });

  at.addGrant({
    roomJoin: true,
    room: `fenr-${channelId}`,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  const token = await at.toJwt();
  res.json({ token, url: process.env.LIVEKIT_URL, room: `fenr-${channelId}` });
});

export default router;
