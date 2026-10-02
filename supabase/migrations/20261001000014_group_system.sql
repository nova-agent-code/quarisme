alter table public.conversations
  add column if not exists is_group boolean not null default false,
  add column if not exists group_name text,
  add column if not exists group_avatar_url text;

alter table public.conversation_members
  add column if not exists role text not null default 'member';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'conversation_members_role_check') then
    alter table public.conversation_members
      add constraint conversation_members_role_check check (role in ('admin', 'member'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'conversations_group_name_check') then
    alter table public.conversations
      add constraint conversations_group_name_check check (not is_group or group_name is not null);
  end if;
end $$;

create or replace function public.create_group(p_group_name text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_conversation_id uuid;
  v_member uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if p_group_name is null or btrim(p_group_name) = '' then
    raise exception 'Group name is required';
  end if;
  if p_member_ids is null or coalesce(array_length(p_member_ids, 1), 0) = 0 then
    raise exception 'Select at least one member';
  end if;

  insert into public.conversations (is_group, group_name)
  values (true, btrim(p_group_name))
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_conversation_id, v_me, 'admin');

  foreach v_member in array p_member_ids loop
    if v_member is not null and v_member <> v_me then
      insert into public.conversation_members (conversation_id, user_id, role)
      values (v_conversation_id, v_member, 'member')
      on conflict (conversation_id, user_id) do nothing;
    end if;
  end loop;

  return v_conversation_id;
end;
$$;

create or replace function public.get_group_members(p_conversation uuid)
returns table (user_id uuid, display_name text, avatar_url text, role text)
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
  return query
  select cm.user_id, p.display_name, p.avatar_url, cm.role
  from public.conversation_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.conversation_id = p_conversation
  order by cm.role desc, p.display_name;
end;
$$;

create or replace function public.kick_group_member(p_conversation uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_is_admin boolean;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  select role = 'admin' into v_is_admin
  from public.conversation_members
  where conversation_id = p_conversation and user_id = v_me;
  if not v_is_admin then
    raise exception 'Not an admin';
  end if;
  if p_user = v_me then
    raise exception 'Cannot kick yourself';
  end if;
  delete from public.conversation_members
  where conversation_id = p_conversation and user_id = p_user;
end;
$$;

create or replace function public.make_group_admin(p_conversation uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_is_admin boolean;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  select role = 'admin' into v_is_admin
  from public.conversation_members
  where conversation_id = p_conversation and user_id = v_me;
  if not v_is_admin then
    raise exception 'Not an admin';
  end if;
  update public.conversation_members
  set role = 'admin'
  where conversation_id = p_conversation and user_id = p_user;
end;
$$;

create or replace function public.add_group_members(p_conversation uuid, p_member_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_is_admin boolean;
  v_member uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  select role = 'admin' into v_is_admin
  from public.conversation_members
  where conversation_id = p_conversation and user_id = v_me;
  if not v_is_admin then
    raise exception 'Not an admin';
  end if;
  foreach v_member in array p_member_ids loop
    if v_member is not null and v_member <> v_me then
      insert into public.conversation_members (conversation_id, user_id, role)
      values (p_conversation, v_member, 'member')
      on conflict (conversation_id, user_id) do nothing;
    end if;
  end loop;
end;
$$;

grant execute on function public.create_group(text, uuid[]) to authenticated;
grant execute on function public.get_group_members(uuid) to authenticated;
grant execute on function public.kick_group_member(uuid, uuid) to authenticated;
grant execute on function public.make_group_admin(uuid, uuid) to authenticated;
grant execute on function public.add_group_members(uuid, uuid[]) to authenticated;
