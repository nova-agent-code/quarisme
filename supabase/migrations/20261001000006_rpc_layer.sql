-- Migration 6: RPC layer (SECURITY DEFINER, pinned search_path) — the single
-- authorized path for connection/conversation creation, read marking, and search.

create or replace function public.add_connection(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if p_other is null or p_other = v_me then
    raise exception 'Invalid user';
  end if;
  if not exists (select 1 from public.profiles where id = p_other) then
    raise exception 'User not found';
  end if;

  insert into public.connections (user_id, connected_user_id)
  values (v_me, p_other)
  on conflict do nothing;

  select id into v_conversation_id
  from public.conversations
  where user_low = least(v_me, p_other)
    and user_high = greatest(v_me, p_other);

  if v_conversation_id is null then
    insert into public.conversations (user_low, user_high)
    values (least(v_me, p_other), greatest(v_me, p_other))
    returning id into v_conversation_id;
  end if;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conversation_id, v_me), (v_conversation_id, p_other)
  on conflict do nothing;

  return v_conversation_id;
end;
$$;

create or replace function public.get_or_create_direct_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.add_connection(p_other);
end;
$$;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
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
    select 1 from public.conversation_members
    where conversation_id = p_conversation and user_id = v_me
  ) then
    raise exception 'Not a member';
  end if;

  insert into public.message_reads (message_id, user_id)
  select m.id, v_me
  from public.messages m
  where m.conversation_id = p_conversation
    and m.sender_id <> v_me
    and m.deleted_at is null
    and not exists (
      select 1 from public.message_reads r
      where r.message_id = m.id and r.user_id = v_me
    )
  on conflict do nothing;
end;
$$;

create or replace function public.search_users(p_query text, p_limit int default 20)
returns table (id uuid, display_name text, avatar_url text, bio text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if p_query is null or btrim(p_query) = '' then
    return;
  end if;
  return query
  select p.id, p.display_name, p.avatar_url, p.bio
  from public.profiles p
  where p.id <> v_me
    and p.display_name_normalized ilike '%' || lower(btrim(p_query)) || '%'
  order by p.display_name_normalized
  limit v_limit;
end;
$$;

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
    select 1 from public.conversation_members
    where conversation_id = p_conversation and user_id = v_me
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

grant execute on function public.add_connection(uuid) to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.search_users(text, int) to authenticated;
grant execute on function public.search_messages(uuid, text, int, timestamptz) to authenticated;
