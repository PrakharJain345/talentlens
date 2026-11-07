-- ==============================================================================
-- Fix: Set search_path = public for auth trigger and helper functions
-- Run this in Supabase SQL Editor if auth.admin.createUser fails with 
-- "Database error creating new user".
-- ==============================================================================

create or replace function auth_role() returns user_role language sql stable security definer set search_path = public as
$$ 
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function auth_client() returns uuid language sql stable security definer set search_path = public as
$$ 
  select client_id from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _role public.user_role := 'recruiter';
  _client_id uuid := null;
begin
  if new.raw_user_meta_data is not null and (new.raw_user_meta_data->>'role') in ('recruiter', 'client') then
    _role := (new.raw_user_meta_data->>'role')::public.user_role;
  end if;

  if new.raw_user_meta_data is not null and (new.raw_user_meta_data->>'client_id') is not null and (new.raw_user_meta_data->>'client_id') != '' then
    begin
      _client_id := (new.raw_user_meta_data->>'client_id')::uuid;
    exception when others then
      _client_id := null;
    end;
  end if;

  insert into public.profiles (id, role, full_name, client_id)
  values (
    new.id,
    _role,
    new.raw_user_meta_data->>'full_name',
    _client_id
  )
  on conflict (id) do update set
    role = excluded.role,
    full_name = excluded.full_name,
    client_id = excluded.client_id;
  return new;
end;
$$;

