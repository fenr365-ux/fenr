-- Direct Messages (Bindings)
create table if not exists dm_channels (
  id uuid default uuid_generate_v4() primary key,
  user1_id uuid references profiles(id) on delete cascade,
  user2_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user1_id, user2_id)
);

alter table dm_channels enable row level security;
create policy "DM participants can view" on dm_channels for select using (
  user1_id = auth.uid() or user2_id = auth.uid()
);
create policy "Users can create DMs" on dm_channels for insert with check (
  user1_id = auth.uid() or user2_id = auth.uid()
);

-- DM Messages
create table if not exists dm_messages (
  id uuid default uuid_generate_v4() primary key,
  channel_id uuid references dm_channels(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  content text not null,
  attachments jsonb default '[]',
  edited boolean default false,
  created_at timestamptz default now()
);

alter table dm_messages enable row level security;
create policy "DM participants can view messages" on dm_messages for select using (
  exists (
    select 1 from dm_channels
    where id = dm_messages.channel_id
    and (user1_id = auth.uid() or user2_id = auth.uid())
  )
);
create policy "DM participants can send messages" on dm_messages for insert with check (
  auth.uid() = user_id and
  exists (
    select 1 from dm_channels
    where id = dm_messages.channel_id
    and (user1_id = auth.uid() or user2_id = auth.uid())
  )
);
create policy "Authors can delete DM messages" on dm_messages for delete using (user_id = auth.uid());

-- Notifications (unread counts, mentions)
create table if not exists notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  channel_id uuid references channels(id) on delete cascade,
  server_id uuid references servers(id) on delete cascade,
  type text default 'message', -- 'message' | 'mention'
  count int default 1,
  last_message_at timestamptz default now(),
  unique(user_id, channel_id)
);

alter table notifications enable row level security;
create policy "Users view own notifications" on notifications for select using (user_id = auth.uid());
create policy "Users manage own notifications" on notifications for all using (user_id = auth.uid());

-- Voice channels (Howls) — extend channels table
alter table channels add column if not exists is_voice boolean default false;

-- Online presence (simple — tracks last seen)
create table if not exists presence (
  user_id uuid references profiles(id) on delete cascade primary key,
  status text default 'online', -- 'online' | 'idle' | 'offline'
  last_seen timestamptz default now()
);

alter table presence enable row level security;
create policy "Presence viewable by authenticated" on presence for select using (auth.role() = 'authenticated');
create policy "Users update own presence" on presence for all using (user_id = auth.uid());
