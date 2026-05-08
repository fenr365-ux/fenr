-- Bots table
create table if not exists bots (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  avatar_url text,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  owner_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

alter table bots enable row level security;
create policy "Owners can view their bots" on bots for select using (owner_id = auth.uid());
create policy "Users can create bots" on bots for insert with check (owner_id = auth.uid());
create policy "Owners can delete bots" on bots for delete using (owner_id = auth.uid());

-- Bot server memberships (which realms a bot is in)
create table if not exists bot_members (
  id uuid default uuid_generate_v4() primary key,
  bot_id uuid references bots(id) on delete cascade,
  server_id uuid references servers(id) on delete cascade,
  added_by uuid references profiles(id) on delete set null,
  added_at timestamptz default now(),
  unique(bot_id, server_id)
);

alter table bot_members enable row level security;
create policy "Realm members can view bots" on bot_members for select using (
  exists (select 1 from server_members where server_id = bot_members.server_id and user_id = auth.uid())
);
create policy "Realm members can add bots" on bot_members for insert with check (
  exists (select 1 from server_members where server_id = bot_members.server_id and user_id = auth.uid())
);
create policy "Bot owner or realm owner can remove" on bot_members for delete using (
  added_by = auth.uid() or
  exists (select 1 from servers where id = bot_members.server_id and owner_id = auth.uid())
);
