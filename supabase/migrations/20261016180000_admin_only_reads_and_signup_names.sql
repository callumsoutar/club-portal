-- Members can use Safety Hub, their own flights, and flight authorisation.
-- Cross-user operational data is readable by flight admins only.
-- Safety editors (is_admin) keep published-article admin and club settings,
-- because those screens are already limited to that role.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  composed text := nullif(btrim(concat_ws(' ', meta ->> 'first_name', meta ->> 'last_name')), '');
  full_name text := coalesce(
    composed,
    nullif(meta ->> 'full_name', ''),
    nullif(meta ->> 'name', ''),
    nullif(meta ->> 'display_name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    full_name,
    meta ->> 'phone'
  )
  on conflict (id) do nothing;

  insert into public.pilot_profiles (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

-- Fill the display-name keys the dashboard reads. Leave values Google already set.
update auth.users u
set raw_user_meta_data =
  coalesce(u.raw_user_meta_data, '{}'::jsonb)
  || jsonb_strip_nulls(jsonb_build_object(
       'full_name', case
         when nullif(u.raw_user_meta_data ->> 'full_name', '') is null
           then nullif(btrim(p.full_name), '')
         else null
       end,
       'name', case
         when nullif(u.raw_user_meta_data ->> 'name', '') is null
           then coalesce(
             nullif(u.raw_user_meta_data ->> 'full_name', ''),
             nullif(btrim(p.full_name), '')
           )
         else null
       end,
       'display_name', case
         when nullif(u.raw_user_meta_data ->> 'display_name', '') is null
           then coalesce(
             nullif(u.raw_user_meta_data ->> 'name', ''),
             nullif(u.raw_user_meta_data ->> 'full_name', ''),
             nullif(btrim(p.full_name), '')
           )
         else null
       end
     ))
from public.profiles p
where p.id = u.id
  and (
    nullif(u.raw_user_meta_data ->> 'name', '') is null
    or nullif(u.raw_user_meta_data ->> 'display_name', '') is null
    or nullif(u.raw_user_meta_data ->> 'full_name', '') is null
  )
  and coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    nullif(btrim(p.full_name), '')
  ) is not null;

-- Accounts with a name already in auth metadata, but no profile row to join.
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'display_name',
    coalesce(
      nullif(raw_user_meta_data ->> 'name', ''),
      nullif(raw_user_meta_data ->> 'full_name', '')
    )
  )
where nullif(raw_user_meta_data ->> 'display_name', '') is null
  and coalesce(
    nullif(raw_user_meta_data ->> 'name', ''),
    nullif(raw_user_meta_data ->> 'full_name', '')
  ) is not null;

-- ---------------------------------------------------------------------------
-- Row access
-- ---------------------------------------------------------------------------

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_flight_admin());

drop policy if exists "pilot_profiles: read own" on public.pilot_profiles;
create policy "pilot_profiles: read own"
  on public.pilot_profiles for select to authenticated
  using (profile_id = auth.uid() or public.is_flight_admin());

drop policy if exists "aircraft: public read active" on public.aircraft;
create policy "aircraft: public read active"
  on public.aircraft for select to anon, authenticated
  using (is_active or public.is_flight_admin());

drop policy if exists "instructors: public read active" on public.instructors;
create policy "instructors: public read active"
  on public.instructors for select to anon, authenticated
  using (is_active or public.is_flight_admin());

drop policy if exists "form_templates: public read active" on public.form_templates;
create policy "form_templates: public read active"
  on public.form_templates for select to anon, authenticated
  using (is_active or public.is_flight_admin());

drop policy if exists "form_sections: public read" on public.form_sections;
create policy "form_sections: public read"
  on public.form_sections for select to anon, authenticated
  using (
    exists (
      select 1 from public.form_templates t
      where t.id = template_id
        and (t.is_active or public.is_flight_admin())
    )
  );

drop policy if exists "form_fields: public read" on public.form_fields;
create policy "form_fields: public read"
  on public.form_fields for select to anon, authenticated
  using (
    exists (
      select 1
      from public.form_sections s
      join public.form_templates t on t.id = s.template_id
      where s.id = section_id
        and (t.is_active or public.is_flight_admin())
    )
  );

drop policy if exists "authorisations: member insert" on public.authorisations;
create policy "authorisations: member insert"
  on public.authorisations for insert to authenticated
  with check (profile_id = auth.uid() or public.is_flight_admin());

drop policy if exists "authorisations: read own or staff" on public.authorisations;
create policy "authorisations: read own or admin"
  on public.authorisations for select to authenticated
  using (profile_id = auth.uid() or public.is_flight_admin());

drop policy if exists "authorisations: update own draft" on public.authorisations;
create policy "authorisations: update own draft"
  on public.authorisations for update to authenticated
  using (
    (profile_id = auth.uid() and status = 'draft')
    or public.is_flight_admin()
  )
  with check (
    (profile_id = auth.uid() and status in ('draft', 'submitted'))
    or public.is_flight_admin()
  );

drop policy if exists "answers: insert with parent" on public.authorisation_answers;
create policy "answers: insert with parent"
  on public.authorisation_answers for insert to authenticated
  with check (
    public.is_flight_admin()
    or exists (
      select 1 from public.authorisations a
      where a.id = authorisation_id
        and a.profile_id = auth.uid()
    )
  );

drop policy if exists "answers: read own or staff" on public.authorisation_answers;
create policy "answers: read own or admin"
  on public.authorisation_answers for select to authenticated
  using (
    exists (
      select 1 from public.authorisations a
      where a.id = authorisation_id
        and (a.profile_id = auth.uid() or public.is_flight_admin())
    )
  );

drop policy if exists "approvals: read own or staff" on public.approvals;
create policy "approvals: read own or admin"
  on public.approvals for select to authenticated
  using (
    exists (
      select 1 from public.authorisations a
      where a.id = authorisation_id
        and (a.profile_id = auth.uid() or public.is_flight_admin())
    )
  );

drop policy if exists "approvals: staff insert" on public.approvals;
create policy "approvals: admin insert"
  on public.approvals for insert to authenticated
  with check (public.is_flight_admin());

drop policy if exists "comments: read visible" on public.comments;
create policy "comments: read visible"
  on public.comments for select to authenticated
  using (
    public.is_flight_admin()
    or (
      is_internal = false
      and exists (
        select 1 from public.authorisations a
        where a.id = authorisation_id
          and a.profile_id = auth.uid()
      )
    )
  );

drop policy if exists "comments: insert" on public.comments;
create policy "comments: insert"
  on public.comments for insert to authenticated
  with check (
    public.is_flight_admin()
    or exists (
      select 1 from public.authorisations a
      where a.id = authorisation_id
        and a.profile_id = auth.uid()
    )
  );

drop policy if exists "activity_log: read own or staff" on public.activity_log;
create policy "activity_log: read own or admin"
  on public.activity_log for select to authenticated
  using (
    public.is_flight_admin()
    or exists (
      select 1 from public.authorisations a
      where a.id = authorisation_id
        and a.profile_id = auth.uid()
    )
  );

drop policy if exists "club_settings: staff read" on public.club_settings;
create policy "club_settings: admin read"
  on public.club_settings for select to authenticated
  using (public.is_flight_admin() or public.is_admin());

drop policy if exists "notifications: staff read authorisation" on public.notifications;

drop policy if exists "signatures: staff read" on storage.objects;
create policy "signatures: admin read"
  on storage.objects for select to authenticated
  using (bucket_id = 'signatures' and public.is_flight_admin());

drop policy if exists "attachments: staff read" on storage.objects;
create policy "attachments: admin read"
  on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.is_flight_admin());

-- Trigger functions should not follow a caller-controlled search_path.
alter function public.set_updated_at() set search_path = public;
alter function public.generate_authorisation_reference() set search_path = public;
alter function public.enforce_authorisation_immutability() set search_path = public;
alter function public.lock_on_submission() set search_path = public;

-- Not part of the app API. Keep it off the Data API.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
