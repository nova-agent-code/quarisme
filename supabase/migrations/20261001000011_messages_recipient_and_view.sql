-- Migration 11: add recipient_id to messages, backfill it, and create the
-- messages_with_profiles view for human-readable names in the Dashboard.

alter table public.messages
  add column if not exists recipient_id uuid;

update public.messages m
set recipient_id = (
  select cm.user_id
  from public.conversation_members cm
  where cm.conversation_id = m.conversation_id
    and cm.user_id <> m.sender_id
  limit 1
)
where m.recipient_id is null
  and m.deleted_at is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'messages_recipient_id_fkey'
  ) then
    alter table public.messages
      add constraint messages_recipient_id_fkey
      foreign key (recipient_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

create or replace view public.messages_with_profiles
with (security_invoker = true) as
select
  m.id,
  m.conversation_id,
  m.content,
  m.sender_id,
  sender.display_name as sender_name,
  m.recipient_id,
  recipient.display_name as recipient_name,
  m.reply_to_message_id,
  m.created_at,
  m.updated_at,
  m.edited_at,
  m.deleted_at
from public.messages m
left join public.profiles sender on sender.id = m.sender_id
left join public.profiles recipient on recipient.id = m.recipient_id;
