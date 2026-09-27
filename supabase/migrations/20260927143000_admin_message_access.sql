-- Admin accounts are rows in user_roles. JWT user_metadata is not used for access.
-- After creating a user in Supabase Auth, grant admin with:
--   insert into public.user_roles (user_id, role) values ('<user-uuid>', 'admin');

create table public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint user_roles_role_check check (role = 'admin')
);

comment on table public.user_roles is
  'Application roles. Authorization reads this table, not user-editable JWT metadata.';

alter table public.user_roles enable row level security;

create policy user_roles_select_own
  on public.user_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.user_roles from anon, authenticated;
grant select on table public.user_roles to authenticated;

create function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'True when the current user has an admin row in public.user_roles.';

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke insert, update, delete, truncate, references, trigger
  on table public.safety_messages
  from anon, authenticated;

grant insert (
  slug,
  title,
  summary,
  body_markdown,
  category,
  tags,
  links,
  link_url,
  link_label,
  image_url,
  image_alt,
  caption,
  published_date,
  is_published,
  featured
) on table public.safety_messages to authenticated;

grant update (
  slug,
  title,
  summary,
  body_markdown,
  category,
  tags,
  links,
  link_url,
  link_label,
  image_url,
  image_alt,
  caption,
  published_date,
  is_published,
  featured
) on table public.safety_messages to authenticated;

create policy safety_messages_admin_select
  on public.safety_messages
  for select
  to authenticated
  using ((select public.is_admin()));

create policy safety_messages_admin_insert
  on public.safety_messages
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy safety_messages_admin_update
  on public.safety_messages
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
