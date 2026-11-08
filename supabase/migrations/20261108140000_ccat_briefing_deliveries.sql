-- POF lectures and pre-flight briefings can be delivered any number of times.
-- Received is signed once: that is the record that the student has had it.

alter table public.ccat_categories
  drop constraint if exists ccat_categories_mode_check;

alter table public.ccat_categories
  add constraint ccat_categories_mode_check
  check (signoff_mode in ('learnt_taught', 'single', 'delivery'));

alter table public.ccat_items
  drop constraint if exists ccat_items_mode_check;

alter table public.ccat_items
  add constraint ccat_items_mode_check
  check (signoff_mode is null or signoff_mode in ('learnt_taught', 'single', 'delivery'));

alter table public.ccat_events
  drop constraint if exists ccat_events_kind_check;

alter table public.ccat_events
  add constraint ccat_events_kind_check
  check (kind in ('learnt', 'taught', 'completed', 'delivered', 'received'));

alter table public.ccat_plan_items
  drop constraint if exists ccat_plan_items_kind_check;

alter table public.ccat_plan_items
  add constraint ccat_plan_items_kind_check
  check (kind in ('learnt', 'taught', 'completed', 'delivered', 'received'));

create unique index if not exists ccat_events_received_once_uidx
  on public.ccat_events (student_id, item_id)
  where kind = 'received' and voided_at is null;

create or replace function public.ccat_enforce_event()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  mode text;
  flight_student uuid;
begin
  select coalesce(i.signoff_mode, c.signoff_mode)
    into mode
  from public.ccat_items i
  join public.ccat_categories c on c.id = i.category_id
  where i.id = new.item_id;

  if mode is null then
    raise exception 'Unknown syllabus item';
  end if;

  if mode = 'single' and new.kind <> 'completed' then
    raise exception 'This syllabus item uses a single completion sign-off';
  end if;

  if mode = 'learnt_taught' and new.kind not in ('learnt', 'taught') then
    raise exception 'This syllabus item uses separate learnt and taught sign-offs';
  end if;

  if mode = 'delivery' and new.kind not in ('delivered', 'received') then
    raise exception 'This syllabus item records deliveries and one received sign-off';
  end if;

  if mode = 'delivery' and (new.instructor_name is null or length(btrim(new.instructor_name)) = 0) then
    raise exception 'Enter the instructor who is signing this off';
  end if;

  if mode = 'delivery' and new.kind = 'received' and new.voided_at is null then
    if exists (
      select 1
      from public.ccat_events as existing
      where existing.student_id = new.student_id
        and existing.item_id = new.item_id
        and existing.kind = 'received'
        and existing.voided_at is null
        and existing.id is distinct from new.id
    ) then
      raise exception 'This briefing has already been signed off as received';
    end if;
  end if;

  if new.flight_id is not null then
    select student_id into flight_student
    from public.ccat_flights
    where id = new.flight_id;

    if flight_student is distinct from new.student_id then
      raise exception 'Flight does not belong to this student';
    end if;
  end if;

  return new;
end;
$$;

update public.ccat_categories
set signoff_mode = 'delivery'
where key in ('pof', 'briefing');
