-- Step 1.3 of the Supabase blueprint: the public `blog-images` bucket.
--
-- Uploads are restricted to authenticated editors. Reads are public because the
-- rendered article needs to display the image without a signed URL. File type and
-- size limits are enforced by the bucket, not only by the browser.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Blog images are publicly readable" on storage.objects;
create policy "Blog images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'blog-images');

drop policy if exists "Editors can upload blog images" on storage.objects;
create policy "Editors can upload blog images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'blog-images');

drop policy if exists "Editors can replace blog images" on storage.objects;
create policy "Editors can replace blog images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'blog-images')
  with check (bucket_id = 'blog-images');

drop policy if exists "Editors can delete blog images" on storage.objects;
create policy "Editors can delete blog images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'blog-images');

commit;
