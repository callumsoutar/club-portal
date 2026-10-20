-- Admins can correct a submitted authorisation's answers. The immutability
-- trigger still rejects every other update. A correction is possible only
-- while a row exists in private.answer_correction_latch, and the only writer
-- of that latch is correct_submitted_responses(), which also records the
-- before/after audit entry in the same transaction.

create schema if not exists private;

revoke all on schema private from public;
do $$
begin
  execute 'revoke all on schema private from anon, authenticated, service_role';
exception
  when undefined_object then
    null;
end;
$$;

create table private.answer_correction_latch (
  authorisation_id uuid primary key
);

revoke all on table private.answer_correction_latch from public;
do $$
begin
  execute 'revoke all on table private.answer_correction_latch from anon, authenticated, service_role';
exception
  when undefined_object then
    null;
end;
$$;

comment on table private.answer_correction_latch is
  'Transaction-scoped permit for one admin answer correction. Not exposed to the API.';

create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references public.profiles (id) on delete set null,
  actor_label  text,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  reason       text,
  before       jsonb,
  after        jsonb,
  ip_address   inet,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx
  on public.audit_logs (actor_id, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs: admin read" on public.audit_logs;
create policy "audit_logs: admin read"
  on public.audit_logs for select to authenticated
  using (public.is_flight_admin());

revoke all on table public.audit_logs from public, anon, authenticated;
grant select on table public.audit_logs to authenticated;

comment on table public.audit_logs is
  'Forensic record of admin corrections. Written only by correct_submitted_responses().';

comment on column public.authorisations.locked_at is
  'Set when the record becomes immutable (on submission). Answers change afterwards only through correct_submitted_responses().';

create or replace function public.enforce_authorisation_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  correcting boolean;
begin
  if old.locked_at is null then
    return new;
  end if;

  -- A locked record cannot be unlocked, retokened, or renumbered.
  new.locked_at := old.locked_at;
  new.reference := old.reference;
  new.access_token := old.access_token;

  if new.signature_url is distinct from old.signature_url
     or new.signed_at is distinct from old.signed_at then
    raise exception 'Signature is immutable after submission (authorisation %)', old.reference;
  end if;

  if new.template_snapshot is distinct from old.template_snapshot
     or new.template_id is distinct from old.template_id then
    raise exception 'Template snapshot is immutable after submission (authorisation %)', old.reference;
  end if;

  correcting := exists (
    select 1
    from private.answer_correction_latch latch
    where latch.authorisation_id = old.id
  );

  if not correcting then
    if new.answers is distinct from old.answers then
      raise exception 'Answers are immutable after submission (authorisation %). An admin must record a correction.', old.reference;
    end if;

    new.pilot_name := old.pilot_name;
    new.pilot_email := old.pilot_email;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_authorisation_immutability() from public, anon, authenticated;

create or replace function public.correct_submitted_responses(
  p_authorisation_id uuid,
  p_answers jsonb,
  p_reason text,
  p_columns jsonb,
  p_answer_rows jsonb,
  p_ip text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_old public.authorisations%rowtype;
  v_answers jsonb;
  v_columns jsonb := coalesce(p_columns, '{}'::jsonb);
  v_rows jsonb := coalesce(p_answer_rows, '[]'::jsonb);
  v_reason text := btrim(coalesce(p_reason, ''));
  v_changes jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_label text;
  v_summary text;
  v_ip inet;
  v_audit_id uuid;
begin
  if v_actor is null or not public.is_flight_admin() then
    raise exception 'Only an admin can correct a submitted response';
  end if;

  if length(v_reason) < 8 then
    raise exception 'Give a reason of at least 8 characters so the audit log is useful';
  end if;

  if length(v_reason) > 1000 then
    raise exception 'Reason is too long';
  end if;

  if jsonb_typeof(p_answers) is distinct from 'object'
     or jsonb_typeof(v_columns) is distinct from 'object'
     or jsonb_typeof(v_rows) is distinct from 'array' then
    raise exception 'Correction details are invalid';
  end if;

  if v_columns ? 'pilot_licence_type'
     and nullif(v_columns->>'pilot_licence_type', '') is not null
     and not exists (
       select 1
       from pg_enum e
       join pg_type t on t.oid = e.enumtypid
       join pg_namespace n on n.oid = t.typnamespace
       where n.nspname = 'public'
         and t.typname = 'licence_type'
         and e.enumlabel = v_columns->>'pilot_licence_type'
     ) then
    raise exception 'That licence type is not valid';
  end if;

  if v_columns ? 'flight_date'
     and nullif(v_columns->>'flight_date', '') is not null
     and v_columns->>'flight_date' !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Flight date must be a calendar date';
  end if;

  if v_columns ? 'pilot_bfr_expiry'
     and nullif(v_columns->>'pilot_bfr_expiry', '') is not null
     and v_columns->>'pilot_bfr_expiry' !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'BFR expiry must be a calendar date';
  end if;

  if v_columns ? 'pilot_medical_expiry'
     and nullif(v_columns->>'pilot_medical_expiry', '') is not null
     and v_columns->>'pilot_medical_expiry' !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Medical expiry must be a calendar date';
  end if;

  select *
    into v_old
  from public.authorisations
  where id = p_authorisation_id
  for update;

  if not found then
    raise exception 'Authorisation not found';
  end if;

  if v_old.locked_at is null or v_old.status = 'draft' then
    raise exception 'Only a submitted authorisation can be corrected';
  end if;

  v_answers := p_answers;
  if v_old.answers ? 'signature' then
    v_answers := jsonb_set(v_answers, '{signature}', v_old.answers->'signature', true);
  else
    v_answers := v_answers - 'signature';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'key', diff.key,
           'label', coalesce(labels.label, diff.key),
           'before', v_old.answers -> diff.key,
           'after', v_answers -> diff.key
         ) order by diff.key), '[]'::jsonb)
    into v_changes
  from (
    select keys.key
    from (
      select jsonb_object_keys(v_old.answers) as key
      union
      select jsonb_object_keys(v_answers) as key
    ) keys
    where keys.key <> 'signature'
      and (v_old.answers -> keys.key) is distinct from (v_answers -> keys.key)
  ) diff
  left join (
    select r.field_key, max(r.label) as label
    from jsonb_to_recordset(v_rows) as r(field_key text, label text)
    group by r.field_key
  ) labels on labels.field_key = diff.key;

  v_count := jsonb_array_length(v_changes);
  if v_count = 0 then
    raise exception 'No responses were changed';
  end if;

  if v_columns ? 'aircraft_id'
     and nullif(v_columns->>'aircraft_id', '') is not null
     and v_columns->>'aircraft_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'That aircraft is not on the fleet';
  end if;

  if v_columns ? 'instructor_id'
     and nullif(v_columns->>'instructor_id', '') is not null
     and v_columns->>'instructor_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'That instructor is not on the roster';
  end if;

  if v_columns ? 'aircraft_id'
     and nullif(v_columns->>'aircraft_id', '') is not null
     and not exists (
       select 1 from public.aircraft
       where id = nullif(v_columns->>'aircraft_id', '')::uuid
     ) then
    raise exception 'That aircraft is not on the fleet';
  end if;

  if v_columns ? 'instructor_id'
     and nullif(v_columns->>'instructor_id', '') is not null
     and not exists (
       select 1 from public.instructors
       where id = nullif(v_columns->>'instructor_id', '')::uuid
     ) then
    raise exception 'That instructor is not on the roster';
  end if;

  select coalesce(nullif(btrim(full_name), ''), nullif(btrim(email), ''), 'Admin')
    into v_label
  from public.profiles
  where id = v_actor;

  v_label := coalesce(v_label, 'Admin');

  begin
    v_ip := nullif(btrim(coalesce(p_ip, '')), '')::inet;
  exception
    when invalid_text_representation then
      v_ip := null;
  end;

  insert into private.answer_correction_latch (authorisation_id)
  values (p_authorisation_id);

  begin
    update public.authorisations
    set
      answers = v_answers,
      pilot_name = case
        when v_columns ? 'pilot_name'
             and length(btrim(coalesce(v_columns->>'pilot_name', ''))) > 0
          then btrim(v_columns->>'pilot_name')
        else pilot_name
      end,
      pilot_email = case
        when v_columns ? 'pilot_email'
          then nullif(lower(btrim(coalesce(v_columns->>'pilot_email', ''))), '')
        else pilot_email
      end,
      pilot_phone = case
        when v_columns ? 'pilot_phone'
          then nullif(btrim(coalesce(v_columns->>'pilot_phone', '')), '')
        else pilot_phone
      end,
      pilot_licence_type = case
        when v_columns ? 'pilot_licence_type'
          then nullif(v_columns->>'pilot_licence_type', '')::public.licence_type
        else pilot_licence_type
      end,
      pilot_bfr_expiry = case
        when v_columns ? 'pilot_bfr_expiry'
          then nullif(v_columns->>'pilot_bfr_expiry', '')::date
        else pilot_bfr_expiry
      end,
      pilot_medical_expiry = case
        when v_columns ? 'pilot_medical_expiry'
          then nullif(v_columns->>'pilot_medical_expiry', '')::date
        else pilot_medical_expiry
      end,
      aircraft_id = case
        when v_columns ? 'aircraft_id'
          then nullif(v_columns->>'aircraft_id', '')::uuid
        else aircraft_id
      end,
      aircraft_registration = case
        when v_columns ? 'aircraft_registration'
          then nullif(btrim(coalesce(v_columns->>'aircraft_registration', '')), '')
        else aircraft_registration
      end,
      instructor_id = case
        when v_columns ? 'instructor_id'
          then nullif(v_columns->>'instructor_id', '')::uuid
        else instructor_id
      end,
      flight_date = case
        when v_columns ? 'flight_date'
          then nullif(v_columns->>'flight_date', '')::date
        else flight_date
      end,
      exercise = case
        when v_columns ? 'exercise'
          then nullif(btrim(coalesce(v_columns->>'exercise', '')), '')
        else exercise
      end,
      destination = case
        when v_columns ? 'destination'
          then nullif(btrim(coalesce(v_columns->>'destination', '')), '')
        else destination
      end,
      passenger_names = case
        when v_columns ? 'passenger_names'
          then nullif(btrim(coalesce(v_columns->>'passenger_names', '')), '')
        else passenger_names
      end,
      return_eta = case
        when v_columns ? 'return_eta'
          then nullif(v_columns->>'return_eta', '')::timestamptz
        else return_eta
      end
    where id = p_authorisation_id;
  exception
    when invalid_text_representation or invalid_datetime_format then
      raise exception 'A corrected value is not in a valid format';
    when foreign_key_violation then
      raise exception 'A corrected aircraft or instructor is not on file';
  end;

  delete from public.authorisation_answers
  where authorisation_id = p_authorisation_id;

  insert into public.authorisation_answers (
    authorisation_id,
    field_key,
    section_key,
    label,
    field_type,
    value_text,
    value_number,
    value_boolean,
    value_date,
    value_json
  )
  select distinct on (r.field_key)
    p_authorisation_id,
    r.field_key,
    r.section_key,
    r.label,
    r.field_type::public.field_type,
    r.value_text,
    r.value_number,
    r.value_boolean,
    r.value_date,
    r.value_json
  from jsonb_to_recordset(v_rows) as r(
    field_key text,
    section_key text,
    label text,
    field_type text,
    value_text text,
    value_number numeric,
    value_boolean boolean,
    value_date date,
    value_json jsonb
  )
  where r.field_key is not null
    and btrim(r.field_key) <> ''
    and r.field_key <> 'signature'
  order by r.field_key;

  v_summary := format(
    'Corrected %s response%s - %s',
    v_count,
    case when v_count = 1 then '' else 's' end,
    v_reason
  );
  if length(v_summary) > 240 then
    v_summary := left(v_summary, 237) || '...';
  end if;

  insert into public.audit_logs (
    actor_id,
    actor_label,
    action,
    entity_type,
    entity_id,
    reason,
    before,
    after,
    ip_address,
    user_agent
  )
  values (
    v_actor,
    v_label,
    'answers_corrected',
    'authorisation',
    p_authorisation_id,
    v_reason,
    jsonb_build_object('changes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'key', c->>'key',
        'label', c->>'label',
        'value', c->'before'
      )), '[]'::jsonb)
      from jsonb_array_elements(v_changes) c
    )),
    jsonb_build_object('changes', v_changes),
    v_ip,
    nullif(left(coalesce(p_user_agent, ''), 500), '')
  )
  returning id into v_audit_id;

  insert into public.activity_log (
    authorisation_id,
    actor_id,
    actor_label,
    verb,
    summary,
    metadata
  )
  values (
    p_authorisation_id,
    v_actor,
    v_label,
    'corrected',
    v_summary,
    jsonb_build_object(
      'reason', v_reason,
      'audit_id', v_audit_id,
      'fields', (
        select coalesce(jsonb_agg(c->>'label' order by c->>'label'), '[]'::jsonb)
        from jsonb_array_elements(v_changes) c
      )
    )
  );

  delete from private.answer_correction_latch
  where authorisation_id = p_authorisation_id;

  return jsonb_build_object(
    'audit_id', v_audit_id,
    'changed', v_count
  );
end;
$$;

revoke all on function public.correct_submitted_responses(uuid, jsonb, text, jsonb, jsonb, text, text)
  from public, anon;
grant execute on function public.correct_submitted_responses(uuid, jsonb, text, jsonb, jsonb, text, text)
  to authenticated;

comment on function public.correct_submitted_responses(uuid, jsonb, text, jsonb, jsonb, text, text) is
  'Admin correction of a submitted authorisation. Writes the answer change, normalised answer rows, activity entry, and forensic audit row together.';
