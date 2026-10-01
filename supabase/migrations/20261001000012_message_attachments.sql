-- Migration 12: message attachments (photo/audio) + updated view.

alter table public.messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text,
  add column if not exists attachment_name text,
  add column if not exists attachment_size int;

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
  m.deleted_at,
  m.attachment_url,
  m.attachment_type,
  m.attachment_name,
  m.attachment_size
from public.messages m
left join public.profiles sender on sender.id = m.sender_id
left join public.profiles recipient on recipient.id = m.recipient_id;
