-- Friend requests / friendship system
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) on delete cascade not null,
  receiver_id uuid references profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  unique (sender_id, receiver_id)
);

alter table friendships enable row level security;

-- Users can see friendships they're part of
create policy "Users can view own friendships"
  on friendships for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Users can send friend requests
create policy "Users can send friend requests"
  on friendships for insert
  with check (auth.uid() = sender_id);

-- Users can update (accept) requests sent to them, or delete their own
create policy "Receiver can accept"
  on friendships for update
  using (auth.uid() = receiver_id);

create policy "Either party can remove friendship"
  on friendships for delete
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
