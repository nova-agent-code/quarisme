-- Migration 8: force messages.sender_id = auth.uid() on insert so the client
-- can never spoof the sender.

create or replace function public.messages_set_sender()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.sender_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists messages_set_sender on public.messages;
create trigger messages_set_sender
  before insert on public.messages
  for each row execute function public.messages_set_sender();
