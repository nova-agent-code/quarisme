-- Migration 7: fix RLS infinite recursion — policies on messages/conversations/
-- message_reads queried conversation_members, whose own policy self-referenced.
-- A SECURITY DEFINER membership check breaks the cycle.

create or replace function public.is_conversation_member(p_conversation uuid, p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation and cm.user_id = p_user
  );
end;
$$;

grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

drop policy if exists "Members can view conversations" on public.conversations;
create policy "Members can view conversations" on public.conversations
  for select to authenticated
  using (public.is_conversation_member(id, auth.uid()));

drop policy if exists "Members can view conversation members" on public.conversation_members;
create policy "Members can view conversation members" on public.conversation_members
  for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "Conversation members can read messages" on public.messages;
create policy "Conversation members can read messages" on public.messages
  for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "Conversation members can send messages" on public.messages;
create policy "Conversation members can send messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id, auth.uid())
  );

drop policy if exists "Users can edit their own messages" on public.messages;
create policy "Users can edit their own messages" on public.messages
  for update to authenticated
  using (sender_id = auth.uid())
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id, auth.uid())
  );

drop policy if exists "Users can view message read states" on public.message_reads;
create policy "Users can view message read states" on public.message_reads
  for select to authenticated
  using (exists (
    select 1 from public.messages m
    where m.id = message_reads.message_id
      and public.is_conversation_member(m.conversation_id, auth.uid())
  ));
