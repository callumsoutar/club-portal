-- Club-local civil time. Instants stay timestamptz (UTC). This zone is used to
-- display them and to interpret wall-clock times such as a return ETA.

alter table public.company_settings
  add column time_zone text not null default 'Pacific/Auckland';

comment on column public.company_settings.time_zone is
  'IANA time zone for the club. Timestamps are stored in UTC and shown in this zone.';

alter table public.company_settings
  add constraint company_settings_time_zone_not_blank
    check (length(btrim(time_zone)) > 0),
  add constraint company_settings_time_zone_length
    check (char_length(time_zone) <= 64),
  add constraint company_settings_time_zone_format
    check (time_zone ~ '^[A-Za-z0-9_+/-]+$');

grant select (time_zone)
  on table public.company_settings
  to anon, authenticated;

grant update (time_zone)
  on table public.company_settings
  to authenticated;
