-- Migration 9: fix search_messages OUT-param/column ambiguity, and force
-- user_message_states.user_id = auth.uid() on insert (clients never set it).

create or replace function public.search_messages(
  p_conversation uuid,
  p_query text,
  p_limit int default 20,
  p_before timestamptz default null
)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  content text,
  reply_to_message_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation and cm.user_id = v_me
  ) then
    raise exception 'Not a member';
  end if;
  if p_query is null or btrim(p_query) = '' then
    return;
  end if;
  return query
  select m.id, m.conversation_id, m.sender_id, m.content, m.reply_to_message_id,
         m.created_at, m.updated_at, m.edited_at, m.deleted_at
  from public.messages m
  where m.conversation_id = p_conversation
    and m.deleted_at is null
    and m.content ilike '%' || btrim(p_query) || '%'
    and (p_before is null or m.created_at < p_before)
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;

create or replace function public.user_message_states_set_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists user_message_states_set_user on public.user_message_states;
create trigger user_message_states_set_user
  before insert on public.user_message_states
  for each row execute function public.user_message_states_set_user();
