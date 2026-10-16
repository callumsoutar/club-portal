-- Published article view totals. Readers can see the count, but only
-- record_safety_message_view may change it, and only by one.

alter table public.safety_messages
  add column view_count integer not null default 0,
  add constraint safety_messages_view_count_nonnegative check (view_count >= 0);

comment on column public.safety_messages.view_count is
  'Times the published article page has been opened. Not editable by clients.';

grant select (view_count) on table public.safety_messages to anon, authenticated;

-- Opening an article must not look like an editorial update.
create or replace function public.set_safety_messages_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.to_jsonb(new) - 'view_count' - 'updated_at'
     is not distinct from
     pg_catalog.to_jsonb(old) - 'view_count' - 'updated_at' then
    return new;
  end if;

  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create or replace function public.record_safety_message_view(message_slug text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_count integer;
begin
  if message_slug is null or message_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    return null;
  end if;

  update public.safety_messages
  set view_count = view_count + 1
  where slug = message_slug
    and is_published = true
  returning view_count into next_count;

  return next_count;
end;
$$;

comment on function public.record_safety_message_view(text) is
  'Adds one view to a published safety article and returns the new total.';

revoke all on function public.record_safety_message_view(text) from public, anon, authenticated;
grant execute on function public.record_safety_message_view(text) to anon, authenticated;
