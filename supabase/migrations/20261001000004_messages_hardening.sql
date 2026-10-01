-- Migration 4: messages — timestamp/edited_at trigger, tighter UPDATE policy,
-- soft-delete only (client hard-delete path removed).

create or replace function public.messages_set_timestamps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is not null then
    raise exception 'cannot modify a deleted message';
  end if;
  if new.content is distinct from old.content then
    new.edited_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists messages_set_timestamps on public.messages;
create trigger messages_set_timestamps
  before update on public.messages
  for each row execute function public.messages_set_timestamps();

drop policy if exists "Users can edit their own messages" on public.messages;
create policy "Users can edit their own messages" on public.messages
  for update to authenticated
  using (sender_id = auth.uid())
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete their own messages" on public.messages;
