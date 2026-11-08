-- C Cat instructor-rating tracker.
-- Learnt and taught are separate events. Progress is derived from those
-- events; planned lessons never write events. Existing PPL training tables
-- are left untouched.

create table public.ccat_intakes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date,
  status text not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ccat_intakes_name_not_blank check (length(btrim(name)) > 0),
  constraint ccat_intakes_status_check check (status in ('active', 'archived'))
);

create table public.ccat_students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  profile_id uuid unique references public.profiles (id) on delete set null,
  intake_id uuid references public.ccat_intakes (id) on delete set null,
  status text not null default 'active',
  started_on date,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ccat_students_name_not_blank check (length(btrim(full_name)) > 0),
  constraint ccat_students_status_check check (status in ('active', 'completed', 'withdrawn'))
);

create index ccat_students_intake_idx on public.ccat_students (intake_id);
create index ccat_students_profile_idx on public.ccat_students (profile_id);

create table public.ccat_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  sort_order integer not null,
  signoff_mode text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ccat_categories_mode_check check (signoff_mode in ('learnt_taught', 'single')),
  constraint ccat_categories_sort_positive check (sort_order > 0)
);

create table public.ccat_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.ccat_categories (id) on delete restrict,
  name text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  signoff_mode text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ccat_items_name_not_blank check (length(btrim(name)) > 0),
  constraint ccat_items_sort_positive check (sort_order > 0),
  constraint ccat_items_mode_check check (
    signoff_mode is null or signoff_mode in ('learnt_taught', 'single')
  )
);

create index ccat_items_category_idx on public.ccat_items (category_id, sort_order);

create table public.ccat_flights (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.ccat_students (id) on delete restrict,
  flown_on date not null,
  aircraft_id uuid references public.aircraft (id) on delete set null,
  aircraft_registration text,
  instructor_id uuid references public.instructors (id) on delete set null,
  instructor_name text,
  dual_hours numeric(6, 2) not null default 0,
  solo_hours numeric(6, 2) not null default 0,
  notes text,
  voided_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ccat_flights_hours_nonnegative check (dual_hours >= 0 and solo_hours >= 0)
);

create index ccat_flights_student_idx on public.ccat_flights (student_id, flown_on desc);
create index ccat_flights_date_idx on public.ccat_flights (flown_on desc) where voided_at is null;

create table public.ccat_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.ccat_students (id) on delete restrict,
  item_id uuid not null references public.ccat_items (id) on delete restrict,
  flight_id uuid references public.ccat_flights (id) on delete restrict,
  kind text not null,
  event_date date not null,
  instructor_id uuid references public.instructors (id) on delete set null,
  instructor_name text,
  notes text,
  source text not null default 'manual',
  import_key text,
  voided_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ccat_events_kind_check check (kind in ('learnt', 'taught', 'completed')),
  constraint ccat_events_source_check check (source in ('manual', 'import'))
);

create index ccat_events_student_item_idx
  on public.ccat_events (student_id, item_id, kind, event_date);
create unique index ccat_events_import_key_uidx
  on public.ccat_events (import_key)
  where import_key is not null;

create table public.ccat_plans (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  student_id uuid not null references public.ccat_students (id) on delete cascade,
  instructor_id uuid references public.instructors (id) on delete set null,
  aircraft_registration text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ccat_plans_week_student unique (week_start, student_id)
);

create table public.ccat_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.ccat_plans (id) on delete cascade,
  item_id uuid not null references public.ccat_items (id) on delete restrict,
  kind text not null,
  constraint ccat_plan_items_kind_check check (kind in ('learnt', 'taught', 'completed')),
  constraint ccat_plan_items_unique unique (plan_id, item_id, kind)
);

create table public.ccat_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index ccat_audit_entity_idx on public.ccat_audit (entity, entity_id, created_at desc);

create trigger trg_ccat_intakes_updated_at
  before update on public.ccat_intakes
  for each row execute function public.set_updated_at();

create trigger trg_ccat_students_updated_at
  before update on public.ccat_students
  for each row execute function public.set_updated_at();

create trigger trg_ccat_categories_updated_at
  before update on public.ccat_categories
  for each row execute function public.set_updated_at();

create trigger trg_ccat_items_updated_at
  before update on public.ccat_items
  for each row execute function public.set_updated_at();

create trigger trg_ccat_flights_updated_at
  before update on public.ccat_flights
  for each row execute function public.set_updated_at();

create trigger trg_ccat_events_updated_at
  before update on public.ccat_events
  for each row execute function public.set_updated_at();

create trigger trg_ccat_plans_updated_at
  before update on public.ccat_plans
  for each row execute function public.set_updated_at();

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

create trigger trg_ccat_events_enforce
  before insert or update of item_id, kind, flight_id, student_id
  on public.ccat_events
  for each row execute function public.ccat_enforce_event();

alter table public.ccat_intakes enable row level security;
alter table public.ccat_students enable row level security;
alter table public.ccat_categories enable row level security;
alter table public.ccat_items enable row level security;
alter table public.ccat_flights enable row level security;
alter table public.ccat_events enable row level security;
alter table public.ccat_plans enable row level security;
alter table public.ccat_plan_items enable row level security;
alter table public.ccat_audit enable row level security;

create policy "ccat_intakes: staff or own"
  on public.ccat_intakes for select to authenticated
  using (
    public.is_flight_staff()
    or exists (
      select 1 from public.ccat_students s
      where s.intake_id = ccat_intakes.id
        and s.profile_id = (select auth.uid())
    )
  );

create policy "ccat_intakes: admin write"
  on public.ccat_intakes for all to authenticated
  using (public.is_flight_admin())
  with check (public.is_flight_admin());

create policy "ccat_students: staff or self"
  on public.ccat_students for select to authenticated
  using (public.is_flight_staff() or profile_id = (select auth.uid()));

create policy "ccat_students: admin write"
  on public.ccat_students for all to authenticated
  using (public.is_flight_admin())
  with check (public.is_flight_admin());

create policy "ccat_categories: read"
  on public.ccat_categories for select to authenticated
  using (true);

create policy "ccat_categories: admin write"
  on public.ccat_categories for all to authenticated
  using (public.is_flight_admin())
  with check (public.is_flight_admin());

create policy "ccat_items: read visible"
  on public.ccat_items for select to authenticated
  using (
    is_active
    or public.is_flight_staff()
    or exists (
      select 1
      from public.ccat_events e
      join public.ccat_students s on s.id = e.student_id
      where e.item_id = ccat_items.id
        and s.profile_id = (select auth.uid())
    )
  );

create policy "ccat_items: admin write"
  on public.ccat_items for all to authenticated
  using (public.is_flight_admin())
  with check (public.is_flight_admin());

create policy "ccat_flights: staff or self"
  on public.ccat_flights for select to authenticated
  using (
    public.is_flight_staff()
    or exists (
      select 1 from public.ccat_students s
      where s.id = ccat_flights.student_id
        and s.profile_id = (select auth.uid())
    )
  );

create policy "ccat_flights: staff insert"
  on public.ccat_flights for insert to authenticated
  with check (public.is_flight_staff());

create policy "ccat_flights: staff update"
  on public.ccat_flights for update to authenticated
  using (public.is_flight_staff())
  with check (public.is_flight_staff());

create policy "ccat_flights: admin delete"
  on public.ccat_flights for delete to authenticated
  using (public.is_flight_admin());

create policy "ccat_events: staff or self"
  on public.ccat_events for select to authenticated
  using (
    public.is_flight_staff()
    or exists (
      select 1 from public.ccat_students s
      where s.id = ccat_events.student_id
        and s.profile_id = (select auth.uid())
    )
  );

create policy "ccat_events: staff insert"
  on public.ccat_events for insert to authenticated
  with check (public.is_flight_staff());

create policy "ccat_events: staff update"
  on public.ccat_events for update to authenticated
  using (public.is_flight_staff())
  with check (public.is_flight_staff());

create policy "ccat_events: admin delete"
  on public.ccat_events for delete to authenticated
  using (public.is_flight_admin());

create policy "ccat_plans: staff or self"
  on public.ccat_plans for select to authenticated
  using (
    public.is_flight_staff()
    or exists (
      select 1 from public.ccat_students s
      where s.id = ccat_plans.student_id
        and s.profile_id = (select auth.uid())
    )
  );

create policy "ccat_plans: staff write"
  on public.ccat_plans for all to authenticated
  using (public.is_flight_staff())
  with check (public.is_flight_staff());

create policy "ccat_plan_items: staff or self"
  on public.ccat_plan_items for select to authenticated
  using (
    public.is_flight_staff()
    or exists (
      select 1
      from public.ccat_plans p
      join public.ccat_students s on s.id = p.student_id
      where p.id = ccat_plan_items.plan_id
        and s.profile_id = (select auth.uid())
    )
  );

create policy "ccat_plan_items: staff write"
  on public.ccat_plan_items for all to authenticated
  using (public.is_flight_staff())
  with check (public.is_flight_staff());

create policy "ccat_audit: staff read"
  on public.ccat_audit for select to authenticated
  using (public.is_flight_staff());

create policy "ccat_audit: staff insert"
  on public.ccat_audit for insert to authenticated
  with check (public.is_flight_staff());

revoke all on function public.ccat_enforce_event() from public, anon, authenticated;

grant select, insert, update, delete on public.ccat_intakes to authenticated;
grant select, insert, update, delete on public.ccat_students to authenticated;
grant select, insert, update, delete on public.ccat_categories to authenticated;
grant select, insert, update, delete on public.ccat_items to authenticated;
grant select, insert, update, delete on public.ccat_flights to authenticated;
grant select, insert, update, delete on public.ccat_events to authenticated;
grant select, insert, update, delete on public.ccat_plans to authenticated;
grant select, insert, update, delete on public.ccat_plan_items to authenticated;
grant select, insert on public.ccat_audit to authenticated;

insert into public.ccat_categories (key, name, sort_order, signoff_mode)
values
  ('flight', 'Flight Lessons', 1, 'learnt_taught'),
  ('pof', 'POF Lectures', 2, 'single'),
  ('briefing', 'Pre-flight Briefings', 3, 'single'),
  ('ground', 'Ground Knowledge', 4, 'single');

insert into public.ccat_items (category_id, name, sort_order)
select c.id, lesson.name, lesson.sort_order
from public.ccat_categories c
join (
  values
    ('EoC I', 1),
    ('EoC II', 2),
    ('S & L', 3),
    ('C & D', 4),
    ('Med Turns (30° AoB)', 5),
    ('Slow Flight', 6),
    ('Basic Stalling I', 7),
    ('Basic Stalling II', 8),
    ('SOHJ', 9),
    ('FLWOP', 10),
    ('Steep Turns', 11),
    ('Short Field TO & LDG', 12),
    ('Wingdrop Stalls', 13),
    ('Low Flying I', 14),
    ('Low Flying II', 15),
    ('Precautionary Ldgs', 16),
    ('Compass Turns', 17),
    ('Max Rate Turns', 18),
    ('Steep Gliding Turns', 19),
    ('Stalling in a Turn', 20),
    ('Constant Radius Turn', 21),
    ('Circuits 1', 22),
    ('Circuits 2', 23),
    ('Circuits 3', 24),
    ('EFATO / Go-round', 25),
    ('Glide Approach', 26),
    ('Flapless Landings', 27),
    ('Xwind Circuits', 28)
) as lesson(name, sort_order) on true
where c.key = 'flight';

insert into public.ccat_items (category_id, name, sort_order)
select c.id, 'POF lecture (placeholder)', 1
from public.ccat_categories c
where c.key = 'pof';

insert into public.ccat_items (category_id, name, sort_order)
select c.id, 'Pre-flight briefing (placeholder)', 1
from public.ccat_categories c
where c.key = 'briefing';

insert into public.ccat_items (category_id, name, sort_order)
select c.id, 'Ground knowledge (placeholder)', 1
from public.ccat_categories c
where c.key = 'ground';

insert into public.ccat_intakes (name, starts_on, status)
values ('C Cat Intake – October 2026', date '2026-10-01', 'active');

insert into public.ccat_students (full_name, intake_id, status)
select student.name, intake.id, 'active'
from (
  values ('Chris Noldus'), ('Joseph Peirce')
) as student(name)
cross join public.ccat_intakes intake
where intake.name = 'C Cat Intake – October 2026';
