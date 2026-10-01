-- Migration 3: conversations — canonical pair columns + unique index so a direct
-- conversation between the same two users can never be created twice.
-- user_low/user_high are populated by the RPC layer (it knows both participants).

alter table public.conversations
  add column if not exists user_low uuid,
  add column if not exists user_high uuid;

update public.conversations c
set user_low = least(m1.user_id, m2.user_id),
    user_high = greatest(m1.user_id, m2.user_id)
from public.conversation_members m1
join public.conversation_members m2
  on m2.conversation_id = m1.conversation_id
 and m2.user_id <> m1.user_id
where c.id = m1.conversation_id
  and m1.user_id < m2.user_id
  and c.user_low is null;

create unique index if not exists conversations_pair_key
  on public.conversations (user_low, user_high);

drop policy if exists "Authenticated users can create conversations" on public.conversations;
