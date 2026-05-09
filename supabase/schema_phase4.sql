-- FENR Phase 4: Roles, Categories, Pins, Search, Threads, Moderation, Status, GIFs, Push

-- Server roles
CREATE TABLE IF NOT EXISTS server_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#99AAB5',
  permissions jsonb DEFAULT '{
    "manage_channels": false,
    "manage_roles": false,
    "kick_members": false,
    "ban_members": false,
    "manage_messages": false,
    "timeout_members": false
  }',
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Member role assignments
CREATE TABLE IF NOT EXISTS member_roles (
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid REFERENCES server_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (server_id, user_id, role_id)
);

-- Pinned messages
CREATE TABLE IF NOT EXISTS pinned_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  content text,
  username text,
  pinned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, message_id)
);

-- Server bans
CREATE TABLE IF NOT EXISTS server_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(server_id, user_id)
);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Thread support on messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id uuid;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_count int DEFAULT 0;

-- Channel categories
ALTER TABLE channels ADD COLUMN IF NOT EXISTS category text DEFAULT 'General';

-- Mute/timeout on server_members
ALTER TABLE server_members ADD COLUMN IF NOT EXISTS muted_until timestamptz;

-- Custom status text on presence
ALTER TABLE presence ADD COLUMN IF NOT EXISTS custom_status text;

-- RLS
ALTER TABLE server_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view roles" ON server_roles FOR SELECT USING (
  server_id IN (SELECT server_id FROM server_members WHERE user_id = auth.uid())
);
CREATE POLICY "Owners manage roles" ON server_roles FOR ALL USING (
  server_id IN (SELECT server_id FROM server_members WHERE user_id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Members view member_roles" ON member_roles FOR SELECT USING (
  server_id IN (SELECT server_id FROM server_members WHERE user_id = auth.uid())
);
CREATE POLICY "Owners manage member_roles" ON member_roles FOR ALL USING (
  server_id IN (SELECT server_id FROM server_members WHERE user_id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Members view pins" ON pinned_messages FOR SELECT USING (
  channel_id IN (
    SELECT c.id FROM channels c
    JOIN server_members sm ON sm.server_id = c.server_id
    WHERE sm.user_id = auth.uid()
  )
);
CREATE POLICY "Members manage pins" ON pinned_messages FOR ALL USING (
  channel_id IN (
    SELECT c.id FROM channels c
    JOIN server_members sm ON sm.server_id = c.server_id
    WHERE sm.user_id = auth.uid()
  )
);
CREATE POLICY "Members view bans" ON server_bans FOR SELECT USING (
  server_id IN (SELECT server_id FROM server_members WHERE user_id = auth.uid())
);
CREATE POLICY "Members manage bans" ON server_bans FOR ALL USING (
  server_id IN (SELECT server_id FROM server_members WHERE user_id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Users manage own push subs" ON push_subscriptions FOR ALL USING (user_id = auth.uid());
