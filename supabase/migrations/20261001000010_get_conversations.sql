-- Migration 10: get_conversations — chat list with other participant, last
-- message preview, and unread count in a single authorized call.

create or replace function public.get_conversations()
returns table (
  conversation_id uuid,
  other_user_id uuid,
  other_display_name text,
  other_avatar_url text,
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
    other.user_id,
    p.display_name,
    p.avatar_url,
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
  join public.conversation_members other
    on other.conversation_id = c.id and other.user_id <> v_me
  join public.profiles p on p.id = other.user_id
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
