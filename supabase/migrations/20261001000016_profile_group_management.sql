-- Migration 16: profile/group management RPCs.

create or replace function public.update_display_name(p_new_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_normalized text;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;
  if p_new_name is null or btrim(p_new_name) = '' then
    raise exception 'Display name is required';
  end if;
  if char_length(btrim(p_new_name)) < 3 or char_length(btrim(p_new_name)) > 24 then
    raise exception 'Display name must be between 3 and 24 characters';
  end if;
  v_normalized := lower(btrim(p_new_name));
  if exists (
    select 1 from public.profiles
    where display_name_normalized = v_normalized and id <> v_me
  ) then
    raise exception 'This display name is already taken. Please choose another.';
  end if;
  update public.profiles
  set display_name = btrim(p_new_name),
      display_name_normalized = v_normalized,
      updated_at = now()
  where id = v_me;
  return btrim(p_new_name);
end;
$$;

create or replace function public.update_group_name(p_conversation uuid, p_new_name text)
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
  if p_new_name is null or btrim(p_new_name) = '' then
    raise exception 'Group name is required';
  end if;
  update public.conversations
  set group_name = btrim(p_new_name), updated_at = now()
  where id = p_conversation and is_group;
end;
$$;

create or replace function public.leave_group(p_conversation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_is_admin boolean;
  v_member_count int;
  v_new_admin uuid;
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
  select role = 'admin' into v_is_admin
  from public.conversation_members
  where conversation_id = p_conversation and user_id = v_me;
  select count(*) into v_member_count
  from public.conversation_members where conversation_id = p_conversation;
  if v_member_count = 1 then
    delete from public.conversation_members
    where conversation_id = p_conversation and user_id = v_me;
    delete from public.conversations where id = p_conversation;
    return;
  end if;
  delete from public.conversation_members
  where conversation_id = p_conversation and user_id = v_me;
  if v_is_admin then
    select user_id into v_new_admin
    from public.conversation_members
    where conversation_id = p_conversation
    order by joined_at asc
    limit 1;
    if v_new_admin is not null then
      update public.conversation_members
      set role = 'admin'
      where conversation_id = p_conversation and user_id = v_new_admin;
    end if;
  end if;
end;
$$;

grant execute on function public.update_display_name(text) to authenticated;
grant execute on function public.update_group_name(uuid, text) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
