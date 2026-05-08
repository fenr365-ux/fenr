import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import authRoutes from './routes/auth.js';
import serverRoutes from './routes/servers.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import botRoutes from './routes/bots.js';
import voiceRoutes from './routes/voice.js';
import dmRoutes from './routes/dms.js';
import { handleBuiltinCommand } from './bots/builtinBots.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/dms', dmRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'FENR' }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Authenticate socket connections (users via Supabase JWT, bots via bot token)
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const botToken = socket.handshake.auth.bot_token;

  if (botToken) {
    // Bot authentication
    const { data: bot, error } = await supabase
      .from('bots')
      .select('id, name')
      .eq('token', botToken)
      .single();
    if (error || !bot) return next(new Error('Invalid bot token'));
    socket.user = { id: `bot-${bot.id}`, isBot: true, botName: bot.name, botId: bot.id };
    return next();
  }

  if (!token) return next(new Error('Authentication required'));
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return next(new Error('Invalid token'));
  socket.user = user;
  next();
});

io.on('connection', (socket) => {
  console.log(`[FENR] pack member connected: ${socket.user.id}`);

  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
  });

  socket.on('leave_channel', (channelId) => {
    socket.leave(channelId);
  });

  // Send message (with optional attachments)
  socket.on('send_message', async ({ channelId, content, attachments = [] }) => {
    if (!channelId || (!content?.trim() && !attachments.length)) return;

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        channel_id: channelId,
        user_id: socket.user.id,
        content: content?.trim() || '',
        attachments: attachments.length ? attachments : []
      })
      .select('*, profiles(id, username, avatar_url)')
      .single();

    if (!error && message) {
      io.to(channelId).emit('new_message', { ...message, reactions: [] });
      // Check for builtin bot commands
      handleBuiltinCommand(content?.trim() || '', channelId, io);
    }
  });

  // Edit message
  socket.on('edit_message', async ({ messageId, content, channelId }) => {
    if (!messageId || !content?.trim()) return;

    const { data, error } = await supabase
      .from('messages')
      .update({ content: content.trim(), edited: true, updated_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('user_id', socket.user.id)
      .select()
      .single();

    if (!error && data) {
      io.to(channelId).emit('message_edited', { id: messageId, content: content.trim() });
    }
  });

  // Delete message
  socket.on('delete_message', async ({ messageId, channelId }) => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', socket.user.id);

    if (!error) {
      io.to(channelId).emit('message_deleted', { id: messageId });
    }
  });

  // Toggle reaction (add if not present, remove if present)
  socket.on('toggle_reaction', async ({ messageId, emoji, channelId }) => {
    if (!messageId || !emoji) return;

    // Check if reaction exists
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', socket.user.id)
      .eq('emoji', emoji)
      .single();

    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: socket.user.id,
        emoji
      });
    }

    // Fetch updated reactions for this message
    const { data: reactions } = await supabase
      .from('message_reactions')
      .select('id, emoji, user_id')
      .eq('message_id', messageId);

    io.to(channelId).emit('reaction_update', { messageId, reactions: reactions || [] });
  });

  // Typing indicator
  socket.on('typing', (channelId) => {
    socket.to(channelId).emit('user_typing', { userId: socket.user.id });
  });

  // DM messaging
  socket.on('join_dm', (dmChannelId) => {
    socket.join(`dm:${dmChannelId}`);
  });

  socket.on('send_dm', async ({ dmChannelId, content, attachments = [] }) => {
    if (!dmChannelId || !content?.trim()) return;

    const { data: message, error } = await supabase
      .from('dm_messages')
      .insert({ channel_id: dmChannelId, user_id: socket.user.id, content: content.trim(), attachments })
      .select('*, profiles(id, username, avatar_url)')
      .single();

    if (!error && message) {
      io.to(`dm:${dmChannelId}`).emit('new_dm', message);
    }
  });

  // Presence — track online status
  socket.on('set_presence', async (status) => {
    await supabase.from('presence').upsert({
      user_id: socket.user.id,
      status: status || 'online',
      last_seen: new Date().toISOString()
    });
    socket.broadcast.emit('presence_update', { userId: socket.user.id, status });
  });

  socket.on('disconnect', async () => {
    console.log(`[FENR] pack member disconnected: ${socket.user.id}`);
    if (!socket.user.isBot) {
      await supabase.from('presence').upsert({
        user_id: socket.user.id,
        status: 'offline',
        last_seen: new Date().toISOString()
      });
      socket.broadcast.emit('presence_update', { userId: socket.user.id, status: 'offline' });
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🐺 FENR backend running on http://localhost:${PORT}`);
});
