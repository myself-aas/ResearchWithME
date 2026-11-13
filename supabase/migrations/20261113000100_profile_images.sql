-- Public `profile-images` bucket for author profile photos.
--
-- Each author writes only inside a folder named after their own auth user id
-- (`<uid>/avatar-<id>.<ext>`). Reads are public because /author/[slug] and
-- bylines render the photo without a signed URL. The bucket itself caps files
-- at 100 KB and allows only WebP/JPEG, so the browser's crop-and-encode step
-- is not the only line of defence.
--
-- Idempotent: safe to re-run.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  102400,
  array['image/webp', 'image/jpeg']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile images are publicly readable" on storage.objects;
create policy "Profile images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'profile-images');

drop policy if exists "Users upload their own profile image" on storage.objects;
create policy "Users upload their own profile image"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users replace their own profile image" on storage.objects;
create policy "Users replace their own profile image"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users delete their own profile image" on storage.objects;
create policy "Users delete their own profile image"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;
