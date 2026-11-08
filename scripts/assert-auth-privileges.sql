-- Run against a non-production database after applying migrations:
--   psql "$DATABASE_URL" -f scripts/assert-auth-privileges.sql
-- This script only reads privileges and policy names. It does not change data
-- and it does not disable row level security.

do $$
declare
  missing text;
begin
  if has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE') then
    raise exception 'authenticated can still update profiles.role';
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'is_active', 'UPDATE') then
    raise exception 'authenticated can still update profiles.is_active';
  end if;

  if not has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE') then
    raise exception 'authenticated can no longer update profiles.full_name';
  end if;

  if not has_function_privilege('authenticated', 'public.has_permission(text)', 'EXECUTE') then
    raise exception 'authenticated cannot execute public.has_permission';
  end if;

  if has_function_privilege('anon', 'public.has_permission(text)', 'EXECUTE') then
    raise exception 'anon can execute public.has_permission';
  end if;

  select string_agg(expected.name, ', ')
    into missing
  from (
    values
      ('authorisations: read own or staff'),
      ('answers: read own or staff'),
      ('approvals: read own or staff'),
      ('approvals: staff insert'),
      ('comments: read visible'),
      ('comments: insert'),
      ('activity_log: read own or staff')
  ) as expected(name)
  where not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and policyname = expected.name
  );

  if missing is not null then
    raise exception 'missing policies: %', missing;
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'profiles_protect_privileges'
      and not tgisinternal
  ) then
    raise exception 'profiles_protect_privileges trigger is missing';
  end if;

  raise notice 'auth privilege assertions passed';
end $$;
