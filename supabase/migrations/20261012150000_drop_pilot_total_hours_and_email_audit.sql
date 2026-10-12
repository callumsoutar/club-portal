-- Staff reviewing an authorisation can read the emails recorded against it.
-- Account mail (welcome, password reset) has no authorisation_id and stays admin-only.
create policy "notifications: staff read authorisation"
  on public.notifications for select to authenticated
  using (
    public.is_flight_staff()
    and authorisation_id is not null
  );

-- Total hours is not tracked on pilot profiles.
alter table public.pilot_profiles
  drop column if exists total_hours;
