-- Flight authorisation schema, adapted for the shared SafetyHub database.
-- public.is_admin() stays the safety-message check. Flight policies use is_flight_admin().
-- Demo aircraft and instructors are not seeded. The default authorisation form is.

-- ============================================================================
-- FlightAuth — Flight Authorisation System
-- Migration 0001: initial schema, RLS, triggers, seed data
--
-- Safe to run top-to-bottom in the Supabase SQL editor on an EMPTY project.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

create type app_role as enum ('member', 'instructor', 'admin');

create type authorisation_status as enum (
  'draft',
  'submitted',
  'pending',
  'approved',
  'declined',
  'cancelled',
  'expired',
  'completed'
);

create type licence_type as enum (
  'student',
  'rpl',
  'ppl',
  'cpl',
  'atpl',
  'instructor'
);

create type field_type as enum (
  'text',
  'textarea',
  'number',
  'checkbox',
  'radio',
  'select',
  'date',
  'time',
  'signature',
  'heading',
  'info',
  'paragraph',
  'toggle',
  'file'
);

create type notification_event as enum (
  'authorisation_submitted',
  'instructor_assigned',
  'approval_granted',
  'approval_declined',
  'comment_added',
  'reminder_before_eta',
  'overdue_return',
  'medical_expiring',
  'bfr_expiring',
  'welcome',
  'password_reset',
  'account_created'
);

create type notification_status as enum ('queued', 'sending', 'sent', 'failed', 'skipped');

-- ============================================================================
-- 2. CORE IDENTITY
-- ============================================================================

-- Mirrors auth.users with application-level role + profile data.
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  full_name     text,
  phone         text,
  role          app_role not null default 'member',
  avatar_url    text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Application profile + role for each authenticated user.';

-- Pilot-specific currency data. Separated so a profile can exist without it
-- (e.g. an admin who never flies) and so it can be snapshotted independently.
create table public.pilot_profiles (
  id                      uuid primary key default gen_random_uuid(),
  profile_id              uuid not null unique references public.profiles (id) on delete cascade,
  licence_type            licence_type,
  licence_number          text,
  bfr_expiry              date,
  medical_expiry          date,
  preferred_aircraft_id   uuid,
  emergency_contact_name  text,
  emergency_contact_phone text,
  total_hours             numeric(7, 1),
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ============================================================================
-- 3. FLEET & INSTRUCTORS
-- ============================================================================

create table public.aircraft (
  id            uuid primary key default gen_random_uuid(),
  registration  text not null unique,
  aircraft_type text not null,
  display_name  text,
  status        text not null default 'available',
  colour        text not null default '#0F62FE',
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.aircraft.status is 'available | maintenance | reserved | retired';

alter table public.pilot_profiles
  add constraint pilot_profiles_preferred_aircraft_fkey
  foreign key (preferred_aircraft_id) references public.aircraft (id) on delete set null;

-- Instructors are a club-managed roster. An instructor row MAY be linked to a
-- login (profile_id) but does not have to be — the club can list an instructor
-- for authorisation purposes before that person ever creates an account.
create table public.instructors (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid unique references public.profiles (id) on delete set null,
  full_name      text not null,
  email          text,
  phone          text,
  signature_url  text,
  permissions    jsonb not null default '{"can_approve": true, "can_manage_fleet": false, "can_manage_forms": false}'::jsonb,
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ============================================================================
-- 4. FORM BUILDER
-- ============================================================================

create table public.form_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  version     integer not null default 1,
  is_active   boolean not null default false,
  published_at timestamptz,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.form_templates is
  'Versioned form definitions. Exactly one template is active at a time; submissions snapshot the template they used.';

-- Only one active template at a time.
create unique index form_templates_single_active
  on public.form_templates (is_active)
  where is_active;

create table public.form_sections (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.form_templates (id) on delete cascade,
  key         text not null,
  title       text not null,
  description text,
  icon        text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (template_id, key)
);

create table public.form_fields (
  id            uuid primary key default gen_random_uuid(),
  section_id    uuid not null references public.form_sections (id) on delete cascade,
  key           text not null,
  label         text not null,
  type          field_type not null,
  placeholder   text,
  help_text     text,
  is_required   boolean not null default false,
  -- { minLength, maxLength, min, max, pattern, mustBeTrue, ... }
  validation    jsonb not null default '{}'::jsonb,
  -- [{ value, label, description }]
  options       jsonb not null default '[]'::jsonb,
  -- Future conditional visibility: { field: "<key>", op: "eq", value: ... }
  visible_when  jsonb,
  -- Conditional required: { field: "<key>", op: "neq", value: "student" }
  -- When set on an is_required field, the field is only compulsory if the
  -- condition matches the current answers.
  required_when jsonb,
  -- Binds a field to a built-in data source: 'aircraft' | 'instructors' | 'pilot.name' ...
  data_source   text,
  default_value jsonb,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (section_id, key)
);

comment on column public.form_fields.data_source is
  'When set, options are resolved at render time from live data (e.g. active aircraft) rather than the static options array.';

-- ============================================================================
-- 5. AUTHORISATIONS
-- ============================================================================

create table public.authorisations (
  id                 uuid primary key default gen_random_uuid(),
  reference          text not null unique,
  status             authorisation_status not null default 'draft',

  -- Submitter. Null for guest submissions.
  profile_id         uuid references public.profiles (id) on delete set null,
  is_guest           boolean not null default false,

  -- Snapshot of pilot identity at submission time. Denormalised on purpose:
  -- an authorisation is a legal record and must not change when a profile does.
  pilot_name         text not null,
  pilot_email        text,
  pilot_phone        text,
  pilot_licence_type licence_type,
  pilot_bfr_expiry   date,
  pilot_medical_expiry date,

  -- Flight details, promoted out of the answer blob because we query them.
  aircraft_id        uuid references public.aircraft (id) on delete set null,
  aircraft_registration text,
  instructor_id      uuid references public.instructors (id) on delete set null,
  flight_date        date,
  exercise           text,
  destination        text,
  passenger_names    text,
  return_eta         timestamptz,

  -- Full response payload keyed by form_fields.key. New fields need no migration.
  answers            jsonb not null default '{}'::jsonb,
  -- Frozen copy of the template used, so old submissions always render correctly.
  template_id        uuid references public.form_templates (id) on delete set null,
  template_snapshot  jsonb,

  signature_url      text,
  signed_at          timestamptz,

  -- Guest access: unguessable token so a guest can view their own submission.
  access_token       uuid not null default gen_random_uuid(),
  access_expires_at  timestamptz not null default (now() + interval '30 days'),

  submitted_at       timestamptz,
  decided_at         timestamptz,
  completed_at       timestamptz,
  locked_at          timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column public.authorisations.locked_at is
  'Set when the record becomes immutable (on submission). Enforced by trg_authorisations_immutable.';

create index authorisations_status_idx      on public.authorisations (status);
create index authorisations_profile_idx     on public.authorisations (profile_id);
create index authorisations_instructor_idx  on public.authorisations (instructor_id);
create index authorisations_aircraft_idx    on public.authorisations (aircraft_id);
create index authorisations_submitted_idx   on public.authorisations (submitted_at desc);
create index authorisations_eta_idx         on public.authorisations (return_eta)
  where status in ('approved', 'completed');
create index authorisations_token_idx       on public.authorisations (access_token);
create index authorisations_answers_gin     on public.authorisations using gin (answers);

-- Normalised answer rows. The jsonb blob above is the source of truth for
-- rendering; this table exists for reporting, search and per-field analytics.
create table public.authorisation_answers (
  id               uuid primary key default gen_random_uuid(),
  authorisation_id uuid not null references public.authorisations (id) on delete cascade,
  field_key        text not null,
  section_key      text,
  label            text,
  field_type       field_type,
  value_text       text,
  value_number     numeric,
  value_boolean    boolean,
  value_date       date,
  value_json       jsonb,
  created_at       timestamptz not null default now(),
  unique (authorisation_id, field_key)
);

create index authorisation_answers_field_idx on public.authorisation_answers (field_key);
create index authorisation_answers_text_idx  on public.authorisation_answers
  using gin (to_tsvector('english', coalesce(value_text, '')));

-- ============================================================================
-- 6. WORKFLOW: APPROVALS, COMMENTS, AUDIT
-- ============================================================================

create table public.approvals (
  id               uuid primary key default gen_random_uuid(),
  authorisation_id uuid not null references public.authorisations (id) on delete cascade,
  instructor_id    uuid references public.instructors (id) on delete set null,
  actor_id         uuid references public.profiles (id) on delete set null,
  decision         authorisation_status not null,
  reason           text,
  signature_url    text,
  created_at       timestamptz not null default now()
);

create index approvals_authorisation_idx on public.approvals (authorisation_id, created_at desc);

create table public.comments (
  id               uuid primary key default gen_random_uuid(),
  authorisation_id uuid not null references public.authorisations (id) on delete cascade,
  author_id        uuid references public.profiles (id) on delete set null,
  author_name      text not null,
  body             text not null,
  is_internal      boolean not null default false,
  created_at       timestamptz not null default now()
);

create index comments_authorisation_idx on public.comments (authorisation_id, created_at desc);

create table public.notifications (
  id               uuid primary key default gen_random_uuid(),
  event            notification_event not null,
  status           notification_status not null default 'queued',
  recipient_email  text not null,
  recipient_name   text,
  subject          text,
  payload          jsonb not null default '{}'::jsonb,
  authorisation_id uuid references public.authorisations (id) on delete cascade,
  provider_id      text,
  error            text,
  attempts         integer not null default 0,
  scheduled_for    timestamptz not null default now(),
  sent_at          timestamptz,
  created_at       timestamptz not null default now()
);

create index notifications_pending_idx on public.notifications (status, scheduled_for)
  where status in ('queued', 'failed');

create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles (id) on delete set null,
  actor_label  text,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  before       jsonb,
  after        jsonb,
  ip_address   inet,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx  on public.audit_logs (actor_id, created_at desc);

-- Lightweight, user-facing feed (distinct from the forensic audit_logs).
create table public.activity_log (
  id               uuid primary key default gen_random_uuid(),
  authorisation_id uuid references public.authorisations (id) on delete cascade,
  actor_id         uuid references public.profiles (id) on delete set null,
  actor_label      text,
  verb             text not null,
  summary          text not null,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index activity_log_authorisation_idx on public.activity_log (authorisation_id, created_at desc);
create index activity_log_recent_idx        on public.activity_log (created_at desc);

-- Simple durable rate limiter for guest submissions.
create table public.rate_limits (
  id         bigserial primary key,
  bucket     text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index rate_limits_lookup_idx on public.rate_limits (bucket, identifier, created_at desc);

-- ============================================================================
-- 7. FUNCTIONS & TRIGGERS
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'pilot_profiles', 'aircraft', 'instructors',
    'form_templates', 'authorisations'
  ]
  loop
    execute format(
      'create trigger trg_%1$s_updated_at
         before update on public.%1$s
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- Human-friendly reference: FA-2601-0042
create sequence if not exists public.authorisation_reference_seq;

create or replace function public.generate_authorisation_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := 'FA-'
      || to_char(now(), 'YYMM')
      || '-'
      || lpad(nextval('public.authorisation_reference_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger trg_authorisations_reference
  before insert on public.authorisations
  for each row execute function public.generate_authorisation_reference();

-- Signatures and answers become immutable once the authorisation is submitted.
-- Instructors may still move it through the workflow, but they can never alter
-- what the pilot actually declared.
create or replace function public.enforce_authorisation_immutability()
returns trigger
language plpgsql
as $$
begin
  if old.locked_at is null then
    return new;
  end if;

  if new.answers is distinct from old.answers then
    raise exception 'Answers are immutable after submission (authorisation %)', old.reference;
  end if;

  if new.signature_url is distinct from old.signature_url
     or new.signed_at is distinct from old.signed_at then
    raise exception 'Signature is immutable after submission (authorisation %)', old.reference;
  end if;

  if new.template_snapshot is distinct from old.template_snapshot then
    raise exception 'Template snapshot is immutable after submission (authorisation %)', old.reference;
  end if;

  -- Identity snapshot is part of the legal record.
  new.pilot_name  := old.pilot_name;
  new.pilot_email := old.pilot_email;
  new.reference   := old.reference;

  return new;
end;
$$;

create trigger trg_authorisations_immutable
  before update on public.authorisations
  for each row execute function public.enforce_authorisation_immutability();

-- Lock the record the moment it leaves draft.
create or replace function public.lock_on_submission()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'draft' and new.locked_at is null then
    new.locked_at   := now();
    new.submitted_at := coalesce(new.submitted_at, now());
  end if;
  return new;
end;
$$;

create trigger trg_authorisations_lock
  before insert or update on public.authorisations
  for each row execute function public.lock_on_submission();

-- New auth user -> profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;

  insert into public.pilot_profiles (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role helpers used throughout the RLS policies. SECURITY DEFINER so that
-- reading the caller's own role does not itself require a policy pass.
create or replace function public.current_app_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_flight_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('instructor', 'admin'), false);
$$;

create or replace function public.is_flight_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

-- Guest access: exchange an unguessable token for exactly one authorisation.
-- SECURITY DEFINER + explicit token match means guests never touch RLS at all
-- and cannot enumerate other submissions.
create or replace function public.get_authorisation_by_token(p_token uuid)
returns setof public.authorisations
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.authorisations
  where access_token = p_token
    and access_expires_at > now()
  limit 1;
$$;

revoke all on function public.get_authorisation_by_token(uuid) from public;
grant execute on function public.get_authorisation_by_token(uuid) to anon, authenticated;

-- Expire stale approvals (call from pg_cron or a Vercel cron route).
create or replace function public.expire_stale_authorisations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.authorisations
     set status = 'expired'
   where status in ('submitted', 'pending')
     and submitted_at < now() - interval '24 hours';
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles              enable row level security;
alter table public.pilot_profiles        enable row level security;
alter table public.aircraft              enable row level security;
alter table public.instructors           enable row level security;
alter table public.form_templates        enable row level security;
alter table public.form_sections         enable row level security;
alter table public.form_fields           enable row level security;
alter table public.authorisations        enable row level security;
alter table public.authorisation_answers enable row level security;
alter table public.approvals             enable row level security;
alter table public.comments              enable row level security;
alter table public.notifications         enable row level security;
alter table public.audit_logs            enable row level security;
alter table public.activity_log          enable row level security;
alter table public.rate_limits           enable row level security;

-- ---- profiles --------------------------------------------------------------
create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_flight_staff());

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_flight_admin())
  with check (id = auth.uid() or public.is_flight_admin());

create policy "profiles: admin insert"
  on public.profiles for insert to authenticated
  with check (public.is_flight_admin());

-- ---- pilot_profiles --------------------------------------------------------
create policy "pilot_profiles: read own"
  on public.pilot_profiles for select to authenticated
  using (profile_id = auth.uid() or public.is_flight_staff());

create policy "pilot_profiles: write own"
  on public.pilot_profiles for insert to authenticated
  with check (profile_id = auth.uid() or public.is_flight_admin());

create policy "pilot_profiles: update own"
  on public.pilot_profiles for update to authenticated
  using (profile_id = auth.uid() or public.is_flight_admin())
  with check (profile_id = auth.uid() or public.is_flight_admin());

-- ---- aircraft / instructors -----------------------------------------------
-- Active rows are readable by anyone (guests need them to fill the form).
create policy "aircraft: public read active"
  on public.aircraft for select to anon, authenticated
  using (is_active or public.is_flight_staff());

create policy "aircraft: admin write"
  on public.aircraft for all to authenticated
  using (public.is_flight_admin()) with check (public.is_flight_admin());

create policy "instructors: public read active"
  on public.instructors for select to anon, authenticated
  using (is_active or public.is_flight_staff());

create policy "instructors: admin write"
  on public.instructors for all to authenticated
  using (public.is_flight_admin()) with check (public.is_flight_admin());

-- ---- form builder ----------------------------------------------------------
create policy "form_templates: public read active"
  on public.form_templates for select to anon, authenticated
  using (is_active or public.is_flight_staff());

create policy "form_templates: admin write"
  on public.form_templates for all to authenticated
  using (public.is_flight_admin()) with check (public.is_flight_admin());

create policy "form_sections: public read"
  on public.form_sections for select to anon, authenticated
  using (
    exists (
      select 1 from public.form_templates t
      where t.id = template_id and (t.is_active or public.is_flight_staff())
    )
  );

create policy "form_sections: admin write"
  on public.form_sections for all to authenticated
  using (public.is_flight_admin()) with check (public.is_flight_admin());

create policy "form_fields: public read"
  on public.form_fields for select to anon, authenticated
  using (
    exists (
      select 1
      from public.form_sections s
      join public.form_templates t on t.id = s.template_id
      where s.id = section_id and (t.is_active or public.is_flight_staff())
    )
  );

create policy "form_fields: admin write"
  on public.form_fields for all to authenticated
  using (public.is_flight_admin()) with check (public.is_flight_admin());

-- ---- authorisations --------------------------------------------------------
-- Guests may create, but only as a guest row with no owner attached.
create policy "authorisations: guest insert"
  on public.authorisations for insert to anon
  with check (is_guest = true and profile_id is null);

create policy "authorisations: member insert"
  on public.authorisations for insert to authenticated
  with check (profile_id = auth.uid() or public.is_flight_staff());

-- Guests never SELECT directly — they go through get_authorisation_by_token().
create policy "authorisations: read own or staff"
  on public.authorisations for select to authenticated
  using (profile_id = auth.uid() or public.is_flight_staff());

-- Members may only edit their own drafts. Staff may progress the workflow;
-- the immutability trigger still protects answers and signatures.
create policy "authorisations: update own draft"
  on public.authorisations for update to authenticated
  using (
    (profile_id = auth.uid() and status = 'draft')
    or public.is_flight_staff()
  )
  with check (
    (profile_id = auth.uid() and status in ('draft', 'submitted'))
    or public.is_flight_staff()
  );

create policy "authorisations: admin delete"
  on public.authorisations for delete to authenticated
  using (public.is_flight_admin());

-- ---- authorisation_answers -------------------------------------------------
create policy "answers: insert with parent"
  on public.authorisation_answers for insert to anon, authenticated
  with check (
    exists (select 1 from public.authorisations a where a.id = authorisation_id)
  );

create policy "answers: read own or staff"
  on public.authorisation_answers for select to authenticated
  using (
    exists (
      select 1 from public.authorisations a
      where a.id = authorisation_id
        and (a.profile_id = auth.uid() or public.is_flight_staff())
    )
  );

-- ---- approvals / comments --------------------------------------------------
create policy "approvals: read own or staff"
  on public.approvals for select to authenticated
  using (
    exists (
      select 1 from public.authorisations a
      where a.id = authorisation_id
        and (a.profile_id = auth.uid() or public.is_flight_staff())
    )
  );

create policy "approvals: staff insert"
  on public.approvals for insert to authenticated
  with check (public.is_flight_staff());

create policy "comments: read visible"
  on public.comments for select to authenticated
  using (
    public.is_flight_staff()
    or (
      is_internal = false
      and exists (
        select 1 from public.authorisations a
        where a.id = authorisation_id and a.profile_id = auth.uid()
      )
    )
  );

create policy "comments: insert"
  on public.comments for insert to authenticated
  with check (
    public.is_flight_staff()
    or exists (
      select 1 from public.authorisations a
      where a.id = authorisation_id and a.profile_id = auth.uid()
    )
  );

-- ---- activity / audit / notifications --------------------------------------
create policy "activity_log: read own or staff"
  on public.activity_log for select to authenticated
  using (
    public.is_flight_staff()
    or exists (
      select 1 from public.authorisations a
      where a.id = authorisation_id and a.profile_id = auth.uid()
    )
  );

create policy "audit_logs: admin read"
  on public.audit_logs for select to authenticated
  using (public.is_flight_admin());

create policy "notifications: admin read"
  on public.notifications for select to authenticated
  using (public.is_flight_admin());

-- rate_limits and writes to audit/activity/notifications are service-role only:
-- no policies granted, so anon/authenticated are denied by default.

-- ============================================================================
-- 9. STORAGE
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('signatures', 'signatures', false, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('attachments', 'attachments', false, 10485760, null)
on conflict (id) do nothing;

-- Signatures are written by the server (service role) and read by staff or the
-- owning pilot. Anonymous guests read theirs via a short-lived signed URL.
create policy "signatures: staff read"
  on storage.objects for select to authenticated
  using (bucket_id = 'signatures' and public.is_flight_staff());

create policy "signatures: owner read"
  on storage.objects for select to authenticated
  using (bucket_id = 'signatures' and owner = auth.uid());

create policy "attachments: staff read"
  on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.is_flight_staff());

-- ============================================================================
-- 10. SEED DATA
-- ============================================================================

-- ---- Default form template --------------------------------------------------
do $$
declare
  v_template uuid;
  v_section  uuid;
begin
  insert into public.form_templates (name, description, is_active, published_at)
  values ('Standard Solo Flight Authorisation',
          'Default club authorisation form. Mirrors the CAA-aligned paper process.',
          true, now())
  returning id into v_template;

  -- Pilot details -------------------------------------------------------------
  insert into public.form_sections (template_id, key, title, description, icon, sort_order)
  values (v_template, 'pilot', 'Pilot details', 'Confirm who is flying and that your currency is valid.', 'user', 1)
  returning id into v_section;

  insert into public.form_fields (section_id, key, label, type, placeholder, help_text, is_required, data_source, options, required_when, sort_order) values
    (v_section, 'pilot_name',     'Full name',      'text',   'e.g. Alex Whitfield', null, true,  'pilot.name',  '[]'::jsonb, null, 1),
    (v_section, 'flight_date',    'Date of flight', 'date',   null, null, true, null, '[]'::jsonb, null, 2),
    (v_section, 'pilot_phone',    'Phone number',   'text',   '+64 21 000 0000', null, true, 'pilot.phone', '[]'::jsonb, null, 3),
    (v_section, 'licence_type',   'Licence type',   'select', null, null, true, null,
      '[{"value":"student","label":"Student Pilot"},{"value":"rpl","label":"RPL"},{"value":"ppl","label":"PPL"},{"value":"cpl","label":"CPL"},{"value":"atpl","label":"ATPL"},{"value":"instructor","label":"Instructor"}]'::jsonb, null, 4),
    (v_section, 'bfr_expiry',     'BFR expiry',     'date',   null, 'Biennial Flight Review expiry date. Not required for student pilots.', true, null, '[]'::jsonb,
      '{"field":"licence_type","op":"neq","value":"student"}'::jsonb, 5),
    (v_section, 'medical_expiry', 'Medical expiry', 'date',   null, null, true, null, '[]'::jsonb, null, 6),
    (v_section, 'current_on_type','Current on type','toggle', null, 'Have you flown this type within the last 90 days?', true, null, '[]'::jsonb, null, 7);

  -- Flight details ------------------------------------------------------------
  insert into public.form_sections (template_id, key, title, description, icon, sort_order)
  values (v_template, 'flight', 'Flight details', 'Where you are going and when you will be back.', 'plane', 2)
  returning id into v_section;

  insert into public.form_fields (section_id, key, label, type, placeholder, help_text, is_required, data_source, options, sort_order) values
    (v_section, 'aircraft_id',     'Aircraft',            'select',   null, null, true, 'aircraft', '[]'::jsonb, 1),
    (v_section, 'fuel_level',      'Fuel level',          'text',     'e.g. Full, tabs, or 80 L', 'Quantity on board before departure.', true, null, '[]'::jsonb, 2),
    (v_section, 'oil_level',       'Oil level',           'text',     'e.g. 6 qt', 'Dipstick reading before departure.', true, null, '[]'::jsonb, 3),
    (v_section, 'exercise',        'Exercise / destination','text',   'e.g. Circuits, or Ardmore → Whitianga', null, true, null, '[]'::jsonb, 4),
    (v_section, 'passenger_names', 'Passenger names',     'textarea', 'Leave blank if solo', 'One name per line.', false, null, '[]'::jsonb, 5),
    (v_section, 'return_eta',      'Return ETA',          'time',     null, 'We will follow up if you have not returned 30 minutes after this time.', true, null, '[]'::jsonb, 6);

  -- Pre-flight checklist --------------------------------------------------------
  insert into public.form_sections (template_id, key, title, description, icon, sort_order)
  values (v_template, 'checklist', 'Pre-flight checklist', 'Confirm each item before you sign.', 'clipboard-check', 3)
  returning id into v_section;

  insert into public.form_fields (section_id, key, label, type, help_text, is_required, validation, sort_order) values
    (v_section, 'fuel_oil',       'Fuel & oil checked',       'checkbox', 'Quantity confirmed sufficient for the flight plus reserve.', true, '{"mustBeTrue":true}'::jsonb, 1),
    (v_section, 'weight_balance', 'Weight & balance completed','checkbox', 'Within envelope for all phases of flight.', true, '{"mustBeTrue":true}'::jsonb, 2),
    (v_section, 'imsafe',         'IMSAFE self-assessment',   'checkbox', 'Illness, Medication, Stress, Alcohol, Fatigue, Emotion.', true, '{"mustBeTrue":true}'::jsonb, 3),
    (v_section, 'weather',        'Weather checked',          'checkbox', 'Forecast and actuals reviewed for route and alternates.', true, '{"mustBeTrue":true}'::jsonb, 4),
    (v_section, 'notams',         'NOTAMs checked',           'checkbox', null, true, '{"mustBeTrue":true}'::jsonb, 5),
    (v_section, 'first_aid',      'First aid kit on board',   'checkbox', null, true, '{"mustBeTrue":true}'::jsonb, 6),
    (v_section, 'extinguisher',   'Fire extinguisher on board','checkbox', null, true, '{"mustBeTrue":true}'::jsonb, 7),
    (v_section, 'life_jackets',   'Life jackets on board',    'checkbox', 'Required for any flight over water beyond gliding distance from shore.', false, '{}'::jsonb, 8);

  -- Declarations ----------------------------------------------------------------
  insert into public.form_sections (template_id, key, title, description, icon, sort_order)
  values (v_template, 'declarations', 'Declarations', null, 'shield-check', 4)
  returning id into v_section;

  insert into public.form_fields (section_id, key, label, type, help_text, is_required, validation, sort_order) values
    (v_section, 'insurance_ack', 'I understand the club insurance excess applies to me as pilot in command', 'checkbox', null, true, '{"mustBeTrue":true}'::jsonb, 1),
    (v_section, 'cleanliness_ack','I will return the aircraft clean, refuelled and correctly secured',       'checkbox', null, true, '{"mustBeTrue":true}'::jsonb, 2),
    (v_section, 'no_accidents',  'I have had no aviation accidents or incidents in the previous five years', 'checkbox', null, true, '{"mustBeTrue":true}'::jsonb, 3),
    (v_section, 'info_correct',  'All information I have provided is true and correct',                      'checkbox', null, true, '{"mustBeTrue":true}'::jsonb, 4);

  -- Sign off ---------------------------------------------------------------------
  insert into public.form_sections (template_id, key, title, description, icon, sort_order)
  values (v_template, 'signoff', 'Sign off', 'Choose your authorising instructor and sign.', 'pen-line', 5)
  returning id into v_section;

  insert into public.form_fields (section_id, key, label, type, help_text, is_required, data_source, sort_order) values
    (v_section, 'instructor_id', 'Authorising instructor', 'select',    'They will be notified as soon as you submit.', true, 'instructors', 1),
    (v_section, 'signature',     'Signature',              'signature', 'Sign with your finger.', true, null, 2);
end;
$$;

-- ============================================================================
-- Done.
-- After running: create your first admin by signing up in the app, then run
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- ============================================================================


-- Make BFR expiry optional when licence type is Student Pilot.
-- Adds required_when support and applies the rule to the seeded BFR field.

alter table public.form_fields
  add column if not exists required_when jsonb;

comment on column public.form_fields.required_when is
  'When set on an is_required field, the field is only compulsory if the condition matches the current answers. Shape: { field, op, value }.';

update public.form_fields
set
  required_when = '{"field":"licence_type","op":"neq","value":"student"}'::jsonb,
  help_text = coalesce(
    nullif(help_text, ''),
    'Biennial Flight Review expiry date. Not required for student pilots.'
  )
where key = 'bfr_expiry'
  and (required_when is null or required_when = 'null'::jsonb);


-- Soften form copy that felt heavy-handed on the live authorisation wizard.
update public.form_sections
set description = null
where key = 'declarations'
  and description = 'These are legally binding statements.';

update public.form_fields
set help_text = null
where key = 'pilot_phone'
  and help_text = 'We will call this number if you are overdue.';


-- Club-wide settings (singleton). Outbound notifications always deliver to
-- notification_email — never to individual instructor or pilot addresses.

create table public.club_settings (
  id                  boolean primary key default true check (id),
  notification_email  text,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references public.profiles (id) on delete set null
);

comment on table public.club_settings is
  'Singleton club configuration. notification_email is the sole delivery address for all app emails.';

comment on column public.club_settings.notification_email is
  'Central inbox. When set, every notify() delivery goes here. When null, delivery is skipped.';

insert into public.club_settings (id) values (true)
on conflict (id) do nothing;

alter table public.club_settings enable row level security;

create policy "club_settings: staff read"
  on public.club_settings for select to authenticated
  using (public.is_flight_staff());

create policy "club_settings: admin write"
  on public.club_settings for all to authenticated
  using (public.is_flight_admin()) with check (public.is_flight_admin());


-- Add a master switch for outbound email, and clarify delivery routing:
-- club-facing events → notification_email; pilot-facing events → the recipient.

alter table public.club_settings
  add column if not exists emails_enabled boolean not null default false;

comment on table public.club_settings is
  'Singleton club configuration for notifications and operations.';

comment on column public.club_settings.notification_email is
  'Central ops inbox. Used for new authorisation requests and overdue alerts.';

comment on column public.club_settings.emails_enabled is
  'Master switch. When false, notify() records intent but does not send mail.';


-- Capture submitter email so receipt + approval notifications can be delivered.
-- Inserted into every active template's pilot section (idempotent).

do $$
declare
  r record;
  v_section uuid;
  v_exists boolean;
begin
  for r in
    select id from public.form_templates where is_active = true
  loop
    select id into v_section
    from public.form_sections
    where template_id = r.id and key = 'pilot'
    limit 1;

    if v_section is null then
      continue;
    end if;

    select exists(
      select 1 from public.form_fields
      where section_id = v_section and key = 'pilot_email'
    ) into v_exists;

    if v_exists then
      continue;
    end if;

    -- Make room after phone (sort_order 3).
    update public.form_fields
    set sort_order = sort_order + 1
    where section_id = v_section and sort_order >= 4;

    insert into public.form_fields (
      section_id, key, label, type, placeholder, help_text,
      is_required, data_source, options, sort_order
    ) values (
      v_section,
      'pilot_email',
      'Email',
      'text',
      'you@example.com',
      'We email your tracking link and the approval decision here.',
      true,
      'pilot.email',
      '[]'::jsonb,
      4
    );
  end loop;
end;
$$;


-- Remove redundant helper copy from the authorisation form.
update public.form_sections
set description = null
where key = 'pilot'
  and description = 'Confirm who is flying and that your currency is valid.';

update public.form_fields
set help_text = null
where key = 'pilot_email'
  and help_text = 'We email your tracking link and the approval decision here.';


-- Club logo branding: store path on club_settings + public Storage bucket.
-- Transparent PNG/WebP/SVG logos are served from a public bucket URL.

alter table public.club_settings
  add column if not exists logo_path text;

comment on column public.club_settings.logo_path is
  'Object path inside the public branding storage bucket (e.g. club-logo.png).';

-- Downloads on a public bucket are open; uploads stay service-role only
-- (no INSERT/UPDATE/DELETE policies for authenticated clients).


-- Guest-first launch: members cannot sign in/up until the club turns this on.
-- Staff (admin / instructor) can always use /login.

alter table public.club_settings
  add column if not exists member_login_enabled boolean not null default true;

comment on column public.club_settings.member_login_enabled is
  'When false, hide member login/signup and treat the app as guest-authorisation only. Staff can still sign in.';

-- Existing rows: force off so launch is guest-only until an admin enables it.
update public.club_settings
set member_login_enabled = true
where member_login_enabled is distinct from true;


-- Allow multiple published (is_active) form templates at once.
-- Pilots pick which form to complete when more than one is available.

drop index if exists public.form_templates_single_active;

comment on table public.form_templates is
  'Versioned form definitions. Any number of templates may be published (is_active); submissions snapshot the template they used.';

-- Flight role helpers are callable by the Data API roles that policies use.
-- Trigger and cron functions are not public RPCs.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.generate_authorisation_reference() from public, anon, authenticated;
revoke all on function public.enforce_authorisation_immutability() from public, anon, authenticated;
revoke all on function public.lock_on_submission() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.expire_stale_authorisations() from public, anon, authenticated;
revoke all on function public.current_app_role() from public, anon;
revoke all on function public.is_flight_staff() from public, anon;
revoke all on function public.is_flight_admin() from public, anon;
grant execute on function public.current_app_role() to anon, authenticated;
grant execute on function public.is_flight_staff() to anon, authenticated;
grant execute on function public.is_flight_admin() to anon, authenticated;

grant select, insert, update, delete on table
  public.profiles,
  public.pilot_profiles,
  public.aircraft,
  public.instructors,
  public.form_templates,
  public.form_sections,
  public.form_fields,
  public.authorisations,
  public.authorisation_answers,
  public.approvals,
  public.comments,
  public.notifications,
  public.audit_logs,
  public.activity_log,
  public.club_settings
to authenticated;

grant select on table
  public.aircraft,
  public.instructors,
  public.form_templates,
  public.form_sections,
  public.form_fields
to anon;

grant insert on table
  public.authorisations,
  public.authorisation_answers
to anon;

revoke all on table public.rate_limits from anon, authenticated;

grant usage, select on sequence public.authorisation_reference_seq to anon, authenticated;

-- Existing SafetyHub accounts become flight profiles. Safety admins are flight admins too.
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, 'pilot'), '@', 1)),
  case
    when exists (
      select 1 from public.user_roles r
      where r.user_id = u.id and r.role = 'admin'
    ) then 'admin'::public.app_role
    else 'member'::public.app_role
  end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

insert into public.pilot_profiles (profile_id)
select p.id
from public.profiles p
where not exists (
  select 1 from public.pilot_profiles pp where pp.profile_id = p.id
);

create or replace function public.flight_public_settings()
returns table (member_login_enabled boolean, logo_path text, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.member_login_enabled, s.logo_path, s.updated_at
  from public.club_settings s
  where s.id
  limit 1;
$$;

revoke all on function public.flight_public_settings() from public, anon, authenticated;
grant execute on function public.flight_public_settings() to anon, authenticated;
