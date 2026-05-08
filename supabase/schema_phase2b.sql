-- Custom emojis per realm
create table if not exists custom_emojis (
  id uuid default uuid_generate_v4() primary key,
  server_id uuid references servers(id) on delete cascade,
  name text not null,
  url text not null,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  unique(server_id, name)
);

alter table custom_emojis enable row level security;

create policy "Custom emojis viewable by realm members" on custom_emojis for select using (
  exists (select 1 from server_members where server_id = custom_emojis.server_id and user_id = auth.uid())
);

create policy "Realm members can add emojis" on custom_emojis for insert with check (
  auth.uid() = created_by and
  exists (select 1 from server_members where server_id = custom_emojis.server_id and user_id = auth.uid())
);

create policy "Creator or owner can delete emoji" on custom_emojis for delete using (
  created_by = auth.uid() or
  exists (select 1 from servers where id = custom_emojis.server_id and owner_id = auth.uid())
);

-- Storage bucket for custom emojis:
-- Supabase → Storage → New bucket
-- Name: fenr-emojis
-- Public: true
-- Max size: 1MB
