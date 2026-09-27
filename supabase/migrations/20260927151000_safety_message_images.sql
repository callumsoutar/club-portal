-- Public hero images for safety messages. Anyone can read a known URL.
-- Only admins can upload, replace, or delete objects.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'safety-message-images',
  'safety-message-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists safety_message_images_admin_read on storage.objects;
drop policy if exists safety_message_images_admin_insert on storage.objects;
drop policy if exists safety_message_images_admin_update on storage.objects;
drop policy if exists safety_message_images_admin_delete on storage.objects;

create policy safety_message_images_admin_read
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'safety-message-images'
    and (select public.is_admin())
  );

create policy safety_message_images_admin_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'safety-message-images'
    and (select public.is_admin())
  );

create policy safety_message_images_admin_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'safety-message-images'
    and (select public.is_admin())
  )
  with check (
    bucket_id = 'safety-message-images'
    and (select public.is_admin())
  );

create policy safety_message_images_admin_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'safety-message-images'
    and (select public.is_admin())
  );

update public.safety_messages
set image_url = null,
    image_alt = null
where image_url is not null
  and image_url like '%aviation-safety.png';
