-- Rename the existing published solo form to Local, then duplicate it as
-- Cross Country with one extra required field: SAR time.
-- Idempotent: safe to re-run if the XC form already exists.

do $$
declare
  v_source_id uuid;
  v_xc_id uuid;
  v_src_section record;
  v_new_section_id uuid;
  v_flight_section_id uuid;
begin
  -- Prefer the canonical solo/local template; fall back to any single active one.
  select id into v_source_id
  from public.form_templates
  where name in (
    'Standard Solo Flight Authorisation',
    'Local Flight Authorisation',
    'Local Flight'
  )
  order by
    case name
      when 'Local Flight Authorisation' then 0
      when 'Local Flight' then 1
      else 2
    end,
    created_at
  limit 1;

  if v_source_id is null then
    select id into v_source_id
    from public.form_templates
    where is_active = true
    order by published_at nulls last, created_at
    limit 1;
  end if;

  if v_source_id is null then
    raise exception 'No source authorisation form template found to duplicate';
  end if;

  -- Rename / describe the local form.
  update public.form_templates
  set
    name = 'Local Flight Authorisation',
    description = 'For local flights in and around the circuit / training area.',
    updated_at = now()
  where id = v_source_id;

  -- Ensure local form is published.
  update public.form_templates
  set
    is_active = true,
    published_at = coalesce(published_at, now()),
    updated_at = now()
  where id = v_source_id;

  -- Reuse existing XC template if already created.
  select id into v_xc_id
  from public.form_templates
  where name in ('Cross Country Flight Authorisation', 'Cross Country Form')
  order by created_at
  limit 1;

  if v_xc_id is null then
    insert into public.form_templates (name, description, is_active, published_at, version)
    values (
      'Cross Country Flight Authorisation',
      'For cross-country flights. Includes SAR time for overdue follow-up.',
      true,
      now(),
      1
    )
    returning id into v_xc_id;

    for v_src_section in
      select id, key, title, description, icon, sort_order
      from public.form_sections
      where template_id = v_source_id
      order by sort_order
    loop
      insert into public.form_sections (template_id, key, title, description, icon, sort_order)
      values (
        v_xc_id,
        v_src_section.key,
        v_src_section.title,
        v_src_section.description,
        v_src_section.icon,
        v_src_section.sort_order
      )
      returning id into v_new_section_id;

      insert into public.form_fields (
        section_id, key, label, type, placeholder, help_text,
        is_required, required_when, visible_when, options, validation,
        data_source, default_value, sort_order
      )
      select
        v_new_section_id,
        f.key,
        f.label,
        f.type,
        f.placeholder,
        f.help_text,
        f.is_required,
        f.required_when,
        f.visible_when,
        f.options,
        f.validation,
        f.data_source,
        f.default_value,
        f.sort_order
      from public.form_fields f
      where f.section_id = v_src_section.id
      order by f.sort_order;
    end loop;
  else
    update public.form_templates
    set
      name = 'Cross Country Flight Authorisation',
      description = 'For cross-country flights. Includes SAR time for overdue follow-up.',
      is_active = true,
      published_at = coalesce(published_at, now()),
      updated_at = now()
    where id = v_xc_id;
  end if;

  -- Add SAR time to the XC flight section if missing.
  select s.id into v_flight_section_id
  from public.form_sections s
  where s.template_id = v_xc_id and s.key = 'flight'
  limit 1;

  if v_flight_section_id is null then
    raise exception 'Cross country form is missing a flight section';
  end if;

  if not exists (
    select 1
    from public.form_fields
    where section_id = v_flight_section_id and key = 'sar_time'
  ) then
    insert into public.form_fields (
      section_id, key, label, type, placeholder, help_text,
      is_required, options, validation, sort_order
    )
    values (
      v_flight_section_id,
      'sar_time',
      'SAR time',
      'time',
      null,
      'Search and Rescue time. Ops will follow up if you have not returned by this time.',
      true,
      '[]'::jsonb,
      '{}'::jsonb,
      coalesce(
        (select max(sort_order) + 1 from public.form_fields where section_id = v_flight_section_id),
        7
      )
    );
  end if;
end;
$$;
