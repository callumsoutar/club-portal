-- Aircraft fuel burn (L/h) and minimum oil (qt), plus the club reserve
-- subtracted from endurance on the authorisation review.
-- Fuel answers are litres. Oil answers are quarts.

alter table public.aircraft
  add column if not exists fuel_burn_lph numeric(5,1),
  add column if not exists min_oil_quarts numeric(4,1);

comment on column public.aircraft.fuel_burn_lph is
  'Cruise fuel burn in litres per hour. Endurance is usable fuel (L) divided by this.';

comment on column public.aircraft.min_oil_quarts is
  'Minimum acceptable oil quantity in quarts. Review highlights a dipstick reading below this.';

do $$
begin
  alter table public.aircraft
    add constraint aircraft_fuel_burn_lph_range
    check (fuel_burn_lph is null or (fuel_burn_lph > 0 and fuel_burn_lph <= 500));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.aircraft
    add constraint aircraft_min_oil_quarts_range
    check (min_oil_quarts is null or (min_oil_quarts >= 0 and min_oil_quarts <= 40));
exception
  when duplicate_object then null;
end $$;

alter table public.club_settings
  add column if not exists club_reserve_minutes integer not null default 45;

comment on column public.club_settings.club_reserve_minutes is
  'Minutes subtracted from calculated endurance to produce safe endurance.';

do $$
begin
  alter table public.club_settings
    add constraint club_settings_reserve_minutes_range
    check (club_reserve_minutes >= 0 and club_reserve_minutes <= 240);
exception
  when duplicate_object then null;
end $$;

update public.form_fields
set
  type = 'number',
  label = 'Usable fuel',
  placeholder = 'Litres',
  help_text = 'Usable fuel on board before departure, in litres.',
  validation = '{"min":0,"max":2000}'::jsonb
where key = 'fuel_level';

update public.form_fields
set
  type = 'number',
  label = 'Oil',
  placeholder = 'Quarts',
  help_text = 'Dipstick reading before departure, in quarts.',
  validation = '{"min":0,"max":40}'::jsonb
where key = 'oil_level';
