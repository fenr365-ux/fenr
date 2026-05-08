-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (linked to auth.users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Profiles viewable by authenticated users" on profiles for select using (auth.role() = 'authenticated');
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Servers
create table if not exists servers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  icon_url text,
  owner_id uuid references profiles(id) on delete cascade not null,
  invite_code text unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

alter table servers enable row level security;
create policy "Servers viewable by members" on servers for select using (
  exists (select 1 from server_members where server_id = servers.id and user_id = auth.uid())
);
create policy "Authenticated users can create servers" on servers for insert with check (auth.role() = 'authenticated');
create policy "Owner can update server" on servers for update using (owner_id = auth.uid());
create policy "Owner can delete server" on servers for delete using (owner_id = auth.uid());

-- Server Members
create table if not exists server_members (
  id uuid default uuid_generate_v4() primary key,
  server_id uuid references servers(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member',
  joined_at timestamptz default now(),
  unique(server_id, user_id)
);

alter table server_members enable row level security;
create policy "Members can view server membership" on server_members for select using (
  user_id = auth.uid() or
  exists (select 1 from server_members sm where sm.server_id = server_members.server_id and sm.user_id = auth.uid())
);
create policy "Users can join servers" on server_members for insert with check (auth.role() = 'authenticated');
create policy "Members can leave" on server_members for delete using (user_id = auth.uid());

-- Channels
create table if not exists channels (
  id uuid default uuid_generate_v4() primary key,
  server_id uuid references servers(id) on delete cascade,
  name text not null,
  type text default 'text',
  created_at timestamptz default now()
);

alter table channels enable row level security;
create policy "Channels viewable by server members" on channels for select using (
  exists (select 1 from server_members where server_id = channels.server_id and user_id = auth.uid())
);
create policy "Server owner can manage channels" on channels for all using (
  exists (select 1 from servers where id = channels.server_id and owner_id = auth.uid())
);

-- Messages
create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  channel_id uuid references channels(id) on delete cascade,
  user_id uuid references profiles(id),
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table messages enable row level security;
create policy "Messages viewable by channel members" on messages for select using (
  exists (
    select 1 from channels c
    join server_members sm on sm.server_id = c.server_id
    where c.id = messages.channel_id and sm.user_id = auth.uid()
  )
);
create policy "Members can send messages" on messages for insert with check (
  auth.uid() = user_id and
  exists (
    select 1 from channels c
    join server_members sm on sm.server_id = c.server_id
    where c.id = messages.channel_id and sm.user_id = auth.uid()
  )
);
create policy "Users can delete own messages" on messages for delete using (user_id = auth.uid());

-- Auto-create profile on signup (uses email prefix as default username)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
