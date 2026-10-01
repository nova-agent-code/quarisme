-- Migration 5: user_message_states (delete-for-me), auth_rate_limits (Edge Function
-- rate limiting), realtime publication for the new state table.

create table if not exists public.user_message_states (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  deleted_for_user boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

drop trigger if exists user_message_states_updated_at on public.user_message_states;
create trigger user_message_states_updated_at
  before update on public.user_message_states
  for each row execute function public.update_updated_at();

create policy "Users can view their own message states" on public.user_message_states
  for select to authenticated
  using (user_id = auth.uid());

create policy "Users can hide messages for themselves" on public.user_message_states
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own message states" on public.user_message_states
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can unhide messages for themselves" on public.user_message_states
  for delete to authenticated
  using (user_id = auth.uid());

create table if not exists public.auth_rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null default 0
);

revoke all on public.auth_rate_limits from anon, authenticated;

alter publication supabase_realtime add table public.user_message_states;
