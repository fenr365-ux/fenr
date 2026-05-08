-- Phase 2 additions: reactions, attachments, edited flag

-- Add attachments (array of {url, name, type, size}) and edited flag to messages
alter table messages add column if not exists attachments jsonb default '[]';
alter table messages add column if not exists edited boolean default false;

-- Message reactions
create table if not exists message_reactions (
  id uuid default uuid_generate_v4() primary key,
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id, emoji)
);

alter table message_reactions enable row level security;

create policy "Reactions viewable by channel members" on message_reactions for select using (
  exists (
    select 1 from messages m
    join channels c on c.id = m.channel_id
    join server_members sm on sm.server_id = c.server_id
    where m.id = message_reactions.message_id and sm.user_id = auth.uid()
  )
);

create policy "Members can react" on message_reactions for insert with check (
  auth.uid() = user_id
);

create policy "Users can remove own reaction" on message_reactions for delete using (
  user_id = auth.uid()
);

-- Supabase Storage bucket for attachments
-- Run this in the Supabase dashboard → Storage → Create bucket:
-- Bucket name: fenr-attachments
-- Public: true
-- File size limit: 25MB
-- Allowed MIME types: image/*, video/*, audio/*, application/pdf, text/plain
