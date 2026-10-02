drop function if exists public.get_conversations();

create function public.get_conversations()
returns table (
  conversation_id uuid,
  is_group boolean,
  other_user_id uuid,
  other_display_name text,
  other_avatar_url text,
  group_name text,
  group_avatar_url text,
  member_count bigint,
  last_message_id uuid,
  last_message_content text,
  last_message_sender_id uuid,
  last_message_created_at timestamptz,
  unread_count bigint
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
  return query
  select
    c.id,
    c.is_group,
    case when c.is_group then null else other.user_id end,
    case when c.is_group then null else p.display_name end,
    case when c.is_group then null else p.avatar_url end,
    c.group_name,
    c.group_avatar_url,
    (select count(*) from public.conversation_members cm where cm.conversation_id = c.id),
    lm.id,
    lm.content,
    lm.sender_id,
    lm.created_at,
    (
      select count(*)
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> v_me
        and m.deleted_at is null
        and not exists (
          select 1 from public.message_reads r
          where r.message_id = m.id and r.user_id = v_me
        )
    )
  from public.conversations c
  join public.conversation_members cm_self
    on cm_self.conversation_id = c.id and cm_self.user_id = v_me
  left join public.conversation_members other
    on other.conversation_id = c.id and other.user_id <> v_me and not c.is_group
  left join public.profiles p on p.id = other.user_id
  left join lateral (
    select m.id, m.content, m.sender_id, m.created_at
    from public.messages m
    where m.conversation_id = c.id and m.deleted_at is null
    order by m.created_at desc
    limit 1
  ) lm on true
  order by lm.created_at desc nulls last;
end;
$$;

grant execute on function public.get_conversations() to authenticated;
