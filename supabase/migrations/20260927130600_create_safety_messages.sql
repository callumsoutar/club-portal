-- Safety messages shown on the public site and the briefing-room TV.
-- body_markdown is the canonical article. original_body keeps the source email text.

create or replace function public.safety_message_links_valid(links jsonb)
returns boolean
language sql
stable
set search_path = ''
as $$
  select jsonb_typeof(links) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(links) as item
      where jsonb_typeof(item) <> 'object'
        or not (item ? 'label')
        or not (item ? 'url')
        or jsonb_typeof(item -> 'label') <> 'string'
        or jsonb_typeof(item -> 'url') <> 'string'
        or length(btrim(item ->> 'label')) = 0
        or (item ->> 'url') !~ '^https://'
    );
$$;

comment on function public.safety_message_links_valid(jsonb) is
  'True when links is a JSON array of {label, url} objects and every url is https.';

create table public.safety_messages (
  id bigint generated always as identity primary key,
  slug text not null,
  title text not null,
  summary text not null,
  body_markdown text not null,
  category text not null,
  tags text[] not null default '{}',
  links jsonb not null default '[]'::jsonb,
  link_url text,
  link_label text,
  image_url text,
  image_alt text,
  caption text,
  published_date date,
  sent_at timestamptz,
  is_published boolean not null default false,
  featured boolean not null default false,
  source_email_subject text,
  original_title text,
  original_body text,
  editor_notes text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint safety_messages_slug_key unique (slug),
  constraint safety_messages_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint safety_messages_title_not_blank check (length(btrim(title)) > 0),
  constraint safety_messages_summary_not_blank check (length(btrim(summary)) > 0),
  constraint safety_messages_body_not_blank check (length(btrim(body_markdown)) > 0),
  constraint safety_messages_category_check check (
    category in (
      'Aerodrome & Circuit',
      'Aircraft & Engine',
      'Airmanship',
      'Airspace & Radio',
      'Emergencies',
      'Ground Ops',
      'Human Factors',
      'Procedures & SOPs',
      'Weather'
    )
  ),
  constraint safety_messages_links_shape check (public.safety_message_links_valid(links)),
  constraint safety_messages_link_url_https check (
    link_url is null or link_url ~ '^https://'
  ),
  constraint safety_messages_link_label_with_url check (
    (link_url is null and link_label is null)
    or (
      link_url is not null
      and link_label is not null
      and length(btrim(link_label)) > 0
    )
  ),
  constraint safety_messages_image_url_check check (
    image_url is null
    or image_url ~ '^https://'
    or image_url ~ '^/[^/]'
  ),
  constraint safety_messages_image_alt_required check (
    image_url is null
    or (image_alt is not null and length(btrim(image_alt)) > 0)
  ),
  constraint safety_messages_published_date_required check (
    not is_published or published_date is not null
  )
);

comment on table public.safety_messages is
  'Club safety messages. Public readers can only select rows where is_published is true.';

comment on column public.safety_messages.body_markdown is
  'Canonical message body, stored as Markdown.';

comment on column public.safety_messages.links is
  'Related resources as a JSON array of {label, url} objects. url must be https.';

comment on column public.safety_messages.link_url is
  'Optional primary link, separate from the links list. Used when one resource should be featured.';

comment on column public.safety_messages.image_url is
  'Optional photo for the article and briefing-room slideshow. https URL or site path.';

comment on column public.safety_messages.caption is
  'Short caption shown with the slideshow photo.';

comment on column public.safety_messages.original_body is
  'Unedited source text, usually the weekly flyer email. Not shown publicly.';

comment on column public.safety_messages.featured is
  'Marks a message for the homepage or briefing-room lead slide.';

create index safety_messages_published_feed_idx
  on public.safety_messages (published_date desc, id desc)
  where is_published;

create index safety_messages_category_idx
  on public.safety_messages (category)
  where is_published;

create index safety_messages_tags_idx
  on public.safety_messages using gin (tags);

create or replace function public.set_safety_messages_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger safety_messages_set_updated_at
  before update on public.safety_messages
  for each row
  execute function public.set_safety_messages_updated_at();

alter table public.safety_messages enable row level security;

create policy safety_messages_public_read
  on public.safety_messages
  for select
  to anon, authenticated
  using (is_published = true);

grant select on public.safety_messages to anon, authenticated;
