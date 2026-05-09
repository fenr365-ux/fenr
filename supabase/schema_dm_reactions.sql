-- DM message reactions
create table if not exists dm_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references dm_messages(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique (message_id, user_id, emoji)
);

alter table dm_message_reactions enable row level security;

create policy "Users can view dm reactions"
  on dm_message_reactions for select using (true);

create policy "Users can add dm reactions"
  on dm_message_reactions for insert with check (auth.uid() = user_id);

create policy "Users can remove own dm reactions"
  on dm_message_reactions for delete using (auth.uid() = user_id);

-- Also add attachments column to dm_messages if missing
alter table dm_messages add column if not exists attachments jsonb default '[]'::jsonb;
