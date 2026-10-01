-- Migration 2: connections — canonical user pair (user_low < user_high) prevents
-- A->B and B->A from becoming two separate relationships.

alter table public.connections
  add column if not exists user_low uuid,
  add column if not exists user_high uuid;

update public.connections
set user_low = least(user_id, connected_user_id),
    user_high = greatest(user_id, connected_user_id)
where user_low is null;

create or replace function public.connections_set_pair()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_low := least(new.user_id, new.connected_user_id);
  new.user_high := greatest(new.user_id, new.connected_user_id);
  return new;
end;
$$;

drop trigger if exists connections_set_pair on public.connections;
create trigger connections_set_pair
  before insert or update on public.connections
  for each row execute function public.connections_set_pair();

alter table public.connections
  alter column user_low set not null,
  alter column user_high set not null;

create unique index if not exists connections_pair_key
  on public.connections (user_low, user_high);
