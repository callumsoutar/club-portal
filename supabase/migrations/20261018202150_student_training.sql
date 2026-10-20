-- Student training for this club: syllabi, enrolments, lesson records, and flight tests.
-- Students can read their own rows. Instructors and admins can read training rows.
-- Only flight staff can write. Profile reads stay admin-only; the roster function
-- returns names for enrolled students without opening the rest of the member list.

create type public.lesson_outcome as enum ('pass', 'not yet competent');

create type public.lesson_progress_source as enum (
  'debrief',
  'manual',
  'import'
);

create table public.syllabus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  licence_type public.licence_type,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint syllabus_name_not_blank check (length(btrim(name)) > 0)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  syllabus_id uuid not null references public.syllabus (id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null,
  is_active boolean not null default true,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_name_not_blank check (length(btrim(name)) > 0),
  constraint lessons_sort_order_positive check (sort_order > 0),
  constraint lessons_syllabus_sort_unique unique (syllabus_id, sort_order)
);

create index lessons_syllabus_id_idx on public.lessons (syllabus_id);

create table public.student_syllabus_enrollment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  syllabus_id uuid not null references public.syllabus (id) on delete restrict,
  status text not null default 'active',
  enrolled_at timestamptz not null default now(),
  completion_date timestamptz,
  unenrolled_at timestamptz,
  notes text,
  primary_instructor_id uuid references public.instructors (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_syllabus_enrollment_status_check
    check (status in ('active', 'completed', 'withdrawn')),
  constraint student_syllabus_enrollment_completed_requires_date
    check (status <> 'completed' or completion_date is not null),
  constraint student_syllabus_enrollment_withdrawn_requires_date
    check (status <> 'withdrawn' or unenrolled_at is not null)
);

create unique index student_syllabus_enrollment_one_active
  on public.student_syllabus_enrollment (user_id, syllabus_id)
  where status = 'active';

create index student_syllabus_enrollment_user_idx
  on public.student_syllabus_enrollment (user_id, enrolled_at desc);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  syllabus_id uuid references public.syllabus (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  instructor_id uuid references public.instructors (id) on delete set null,
  authorisation_id uuid references public.authorisations (id) on delete set null,
  attempt integer not null default 1,
  date date not null,
  completed_at timestamptz,
  status public.lesson_outcome not null,
  lesson_title text,
  instructor_comments text,
  lesson_highlights text,
  areas_for_improvement text,
  airmanship text,
  focus_next_lesson text,
  safety_concerns text,
  weather_conditions text,
  record_source public.lesson_progress_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_progress_attempt_positive check (attempt > 0)
);

create index lesson_progress_student_idx
  on public.lesson_progress (user_id, date desc);

create index lesson_progress_lesson_idx
  on public.lesson_progress (user_id, lesson_id, date desc);

create index lesson_progress_syllabus_idx
  on public.lesson_progress (user_id, syllabus_id);

create table public.syllabus_flight_tests (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.student_syllabus_enrollment (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  syllabus_id uuid not null references public.syllabus (id) on delete restrict,
  result text not null,
  test_date date not null,
  notes text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint syllabus_flight_tests_result_check check (result in ('pass', 'fail'))
);

create index syllabus_flight_tests_enrollment_idx
  on public.syllabus_flight_tests (enrollment_id, test_date desc);

create trigger trg_syllabus_updated_at
  before update on public.syllabus
  for each row execute function public.set_updated_at();

create trigger trg_lessons_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

create trigger trg_student_syllabus_enrollment_updated_at
  before update on public.student_syllabus_enrollment
  for each row execute function public.set_updated_at();

create trigger trg_lesson_progress_updated_at
  before update on public.lesson_progress
  for each row execute function public.set_updated_at();

create trigger trg_syllabus_flight_tests_updated_at
  before update on public.syllabus_flight_tests
  for each row execute function public.set_updated_at();

create or replace function public.assign_lesson_attempt()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.lesson_id is null then
    if new.attempt is null or new.attempt < 1 then
      new.attempt := 1;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' and (new.attempt is null or new.attempt < 1) then
    select coalesce(max(attempt), 0) + 1
      into new.attempt
    from public.lesson_progress
    where user_id = new.user_id
      and lesson_id = new.lesson_id;
  end if;

  return new;
end;
$$;

create trigger trg_lesson_progress_attempt
  before insert on public.lesson_progress
  for each row execute function public.assign_lesson_attempt();

create or replace function public.sync_lesson_progress_completed_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'pass' then
    if new.completed_at is null then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger trg_lesson_progress_completed_at
  before insert or update of status, completed_at on public.lesson_progress
  for each row execute function public.sync_lesson_progress_completed_at();

-- Names of enrolled students, for instructors who cannot read the member list.
create or replace function public.training_roster_names()
returns table (user_id uuid, full_name text, email text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.email
  from public.profiles p
  where public.is_flight_staff()
    and exists (
      select 1
      from public.student_syllabus_enrollment e
      where e.user_id = p.id
    );
$$;

alter table public.syllabus enable row level security;
alter table public.lessons enable row level security;
alter table public.student_syllabus_enrollment enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.syllabus_flight_tests enable row level security;

create policy "syllabus: read active"
  on public.syllabus for select to authenticated
  using (is_active or public.is_flight_staff());

create policy "syllabus: staff write"
  on public.syllabus for all to authenticated
  using (public.is_flight_staff())
  with check (public.is_flight_staff());

create policy "lessons: read active syllabus"
  on public.lessons for select to authenticated
  using (
    exists (
      select 1 from public.syllabus s
      where s.id = lessons.syllabus_id
        and (s.is_active or public.is_flight_staff())
    )
  );

create policy "lessons: staff write"
  on public.lessons for all to authenticated
  using (public.is_flight_staff())
  with check (public.is_flight_staff());

create policy "enrollment: read own or staff"
  on public.student_syllabus_enrollment for select to authenticated
  using (user_id = (select auth.uid()) or public.is_flight_staff());

create policy "enrollment: staff write"
  on public.student_syllabus_enrollment for all to authenticated
  using (public.is_flight_staff())
  with check (public.is_flight_staff());

create policy "lesson_progress: read own or staff"
  on public.lesson_progress for select to authenticated
  using (user_id = (select auth.uid()) or public.is_flight_staff());

create policy "lesson_progress: staff insert"
  on public.lesson_progress for insert to authenticated
  with check (public.is_flight_staff());

create policy "lesson_progress: staff update"
  on public.lesson_progress for update to authenticated
  using (public.is_flight_staff())
  with check (public.is_flight_staff());

create policy "lesson_progress: staff delete"
  on public.lesson_progress for delete to authenticated
  using (public.is_flight_staff());

create policy "flight_tests: read own or staff"
  on public.syllabus_flight_tests for select to authenticated
  using (user_id = (select auth.uid()) or public.is_flight_staff());

create policy "flight_tests: staff write"
  on public.syllabus_flight_tests for all to authenticated
  using (public.is_flight_staff())
  with check (public.is_flight_staff());

revoke all on function public.assign_lesson_attempt() from public, anon, authenticated;
revoke all on function public.sync_lesson_progress_completed_at() from public, anon, authenticated;
revoke all on function public.training_roster_names() from public, anon;
grant execute on function public.training_roster_names() to authenticated;

grant select, insert, update, delete on public.syllabus to authenticated;
grant select, insert, update, delete on public.lessons to authenticated;
grant select, insert, update, delete on public.student_syllabus_enrollment to authenticated;
grant select, insert, update, delete on public.lesson_progress to authenticated;
grant select, insert, update, delete on public.syllabus_flight_tests to authenticated;
