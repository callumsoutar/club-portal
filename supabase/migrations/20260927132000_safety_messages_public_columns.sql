-- Row policies cannot hide columns. Keep editorial source fields off the public API.

revoke select on public.safety_messages from anon, authenticated;

grant select (
  id,
  slug,
  title,
  summary,
  body_markdown,
  category,
  tags,
  links,
  link_url,
  link_label,
  image_url,
  image_alt,
  caption,
  published_date,
  sent_at,
  is_published,
  featured,
  created_at,
  updated_at
) on public.safety_messages to anon, authenticated;
