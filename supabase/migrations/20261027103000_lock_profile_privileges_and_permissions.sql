-- Stop members granting themselves a flight role, and let instructors review
-- authorisations again. Permissions are derived from profiles.role and
-- user_roles. They are not stored in the JWT and there is no override table.
--
-- Service-role writes (member administration, approve/decline) bypass RLS and
-- column privileges. Triggers below still run, and they allow service_role.

-- ---------------------------------------------------------------------------
-- Profile privilege columns
-- ---------------------------------------------------------------------------

revoke update on table public.profiles from anon, authenticated;

grant update (email, full_name, phone, avatar_url, updated_at)
  on table public.profiles
  to authenticated;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is not distinct from old.role
     and new.is_active is not distinct from old.is_active then
    return new;
  end if;

  -- The service-role key has no end-user uid. Member admin uses that client.
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if public.is_flight_admin() then
    return new;
  end if;

  raise exception 'role and active status can only be changed by a flight administrator'
    using errcode = '42501';
end;
$$;

revoke all on function public.protect_profile_privileges() from public, anon, authenticated;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileges();

-- A later UPDATE policy must not let a reviewer reassign who owns a flight.
create or replace function public.protect_authorisation_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id is not distinct from old.profile_id
     and new.is_guest is not distinct from old.is_guest
     and new.access_token is not distinct from old.access_token then
    return new;
  end if;

  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('service_role', 'postgres', 'supabase_admin')
     or public.is_flight_admin() then
    return new;
  end if;

  raise exception 'authorisation ownership cannot be changed'
    using errcode = '42501';
end;
$$;

revoke all on function public.protect_authorisation_ownership() from public, anon, authenticated;

drop trigger if exists authorisations_protect_ownership on public.authorisations;
create trigger authorisations_protect_ownership
  before update on public.authorisations
  for each row
  execute function public.protect_authorisation_ownership();

-- ---------------------------------------------------------------------------
-- Derived permissions. Keep in step with lib/flight/permissions.ts.
-- ---------------------------------------------------------------------------

create or replace function public.has_permission(requested text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select case requested
    when 'flights.read' then public.current_app_role() is not null
    when 'profile.update' then public.current_app_role() is not null
    when 'authorisations.review' then public.is_flight_staff()
    when 'authorisations.approve' then public.is_flight_staff()
    when 'authorisations.archive' then public.is_flight_admin()
    when 'training.record' then public.is_flight_staff()
    when 'training.manage' then public.is_flight_admin()
    when 'fleet.manage' then public.is_flight_admin()
    when 'instructors.manage' then public.is_flight_admin()
    when 'forms.manage' then public.is_flight_admin()
    when 'members.manage' then public.is_flight_admin() or public.is_admin()
    when 'club.settings' then public.is_flight_admin() or public.is_admin()
    when 'safety.manage' then public.is_admin()
    when 'briefing.tv' then public.is_admin()
    when 'traffic.read' then public.is_flight_admin()
    else false
  end;
$$;

revoke all on function public.has_permission(text) from public, anon, authenticated;
grant execute on function public.has_permission(text) to authenticated;

comment on function public.has_permission(text) is
  'Derived permission check. Unknown names return false. Not a JWT claim.';

-- ---------------------------------------------------------------------------
-- Instructor review. Status changes still go through server actions that use
-- the service role. Direct UPDATE of an authorisation stays flight-admin
-- (or the owner's draft). Signature and answer immutability is unchanged.
-- ---------------------------------------------------------------------------

drop policy if exists "authorisations: read own or admin" on public.authorisations;
create policy "authorisations: read own or staff"
  on public.authorisations for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (select public.has_permission('authorisations.review'))
  );

drop policy if exists "answers: read own or admin" on public.authorisation_answers;
create policy "answers: read own or staff"
  on public.authorisation_answers for select to authenticated
  using (
    exists (
      select 1 from public.authorisations a
      where a.id = authorisation_id
        and (
          a.profile_id = (select auth.uid())
          or (select public.has_permission('authorisations.review'))
        )
    )
  );

drop policy if exists "approvals: read own or admin" on public.approvals;
create policy "approvals: read own or staff"
  on public.approvals for select to authenticated
  using (
    exists (
      select 1 from public.authorisations a
      where a.id = authorisation_id
        and (
          a.profile_id = (select auth.uid())
          or (select public.has_permission('authorisations.review'))
        )
    )
  );

drop policy if exists "approvals: admin insert" on public.approvals;
create policy "approvals: staff insert"
  on public.approvals for insert to authenticated
  with check (
    (select public.has_permission('authorisations.approve'))
    and actor_id = (select auth.uid())
  );

drop policy if exists "comments: read visible" on public.comments;
create policy "comments: read visible"
  on public.comments for select to authenticated
  using (
    (select public.has_permission('authorisations.review'))
    or (
      is_internal = false
      and exists (
        select 1 from public.authorisations a
        where a.id = authorisation_id
          and a.profile_id = (select auth.uid())
      )
    )
  );

drop policy if exists "comments: insert" on public.comments;
create policy "comments: insert"
  on public.comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      (select public.has_permission('authorisations.review'))
      or (
        is_internal = false
        and exists (
          select 1 from public.authorisations a
          where a.id = authorisation_id
            and a.profile_id = (select auth.uid())
        )
      )
    )
  );

drop policy if exists "activity_log: read own or admin" on public.activity_log;
create policy "activity_log: read own or staff"
  on public.activity_log for select to authenticated
  using (
    (select public.has_permission('authorisations.review'))
    or exists (
      select 1 from public.authorisations a
      where a.id = authorisation_id
        and a.profile_id = (select auth.uid())
    )
  );
