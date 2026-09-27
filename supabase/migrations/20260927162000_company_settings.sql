-- Singleton club identity for the public site, admin, and briefing-room TV.
-- The logo file lives in the public branding bucket. logo_path is null until one is uploaded.

create table public.company_settings (
  id smallint primary key default 1,
  company_name text not null,
  logo_path text,
  updated_at timestamptz not null default pg_catalog.now(),
  constraint company_settings_singleton check (id = 1),
  constraint company_settings_name_not_blank check (length(btrim(company_name)) > 0),
  constraint company_settings_name_length check (char_length(company_name) <= 80),
  constraint company_settings_logo_path_format check (
    logo_path is null
    or logo_path ~ '^logos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  )
);

comment on table public.company_settings is
  'One row of public club identity: display name and optional logo object path.';

comment on column public.company_settings.logo_path is
  'Object path inside the public branding bucket. Null keeps the text wordmark.';

insert into public.company_settings (id, company_name)
values (1, 'Kapiti Aero Club');

create or replace function public.set_company_settings_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_company_settings_updated_at() from public, anon, authenticated;

create trigger company_settings_set_updated_at
  before update on public.company_settings
  for each row
  execute function public.set_company_settings_updated_at();

alter table public.company_settings enable row level security;

revoke all on table public.company_settings from anon, authenticated;

grant select (id, company_name, logo_path, updated_at)
  on table public.company_settings
  to anon, authenticated;

grant update (company_name, logo_path)
  on table public.company_settings
  to authenticated;

create policy company_settings_public_read
  on public.company_settings
  for select
  to anon, authenticated
  using (id = 1);

create policy company_settings_admin_update
  on public.company_settings
  for update
  to authenticated
  using ((select public.is_admin()) and id = 1)
  with check ((select public.is_admin()) and id = 1);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding',
  'branding',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy branding_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'branding');

create policy branding_admin_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'branding'
    and (select public.is_admin())
    and name ~ '^logos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );

create policy branding_admin_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'branding'
    and (select public.is_admin())
  )
  with check (
    bucket_id = 'branding'
    and (select public.is_admin())
    and name ~ '^logos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );

create policy branding_admin_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'branding'
    and (select public.is_admin())
  );
