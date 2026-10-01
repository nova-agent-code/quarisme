-- Migration 1: profiles — case-insensitive unique display names + trigram search index
-- Tables are empty; all changes are additive.

alter table public.profiles
  add column if not exists display_name_normalized text;

update public.profiles
set display_name_normalized = lower(display_name)
where display_name_normalized is null;

alter table public.profiles
  alter column display_name_normalized set not null;

create unique index if not exists profiles_display_name_normalized_key
  on public.profiles (display_name_normalized);

create extension if not exists pg_trgm with schema extensions;

create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (display_name_normalized gin_trgm_ops);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  insert into public.profiles (id, display_name, display_name_normalized)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'New User'),
    lower(coalesce(new.raw_user_meta_data ->> 'display_name', 'New User'))
  );
  return new;
end;
$$;

drop policy if exists "Users can create their own profile" on public.profiles;
