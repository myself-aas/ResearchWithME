-- pgTAP coverage for the `profile-images` bucket and its storage policies.
-- Runs against the LOCAL Supabase database only:
--   npx supabase db reset --local && npx supabase test db --local
-- Never against a hosted project.
--
-- Scope note: proving that one user cannot write into another user's folder
-- needs emulated JWT claims and auth.users rows. What is asserted here is
-- deterministic without them: bucket settings and policy presence and shape.
begin;
select plan(6);

select is((select public from storage.buckets where id = 'profile-images'), true,
  'profile-images bucket exists and is public');

select is((select file_size_limit from storage.buckets where id = 'profile-images'), 102400::bigint,
  'profile-images caps files at 100 KB');

select is((select allowed_mime_types from storage.buckets where id = 'profile-images'),
  array['image/webp', 'image/jpeg'],
  'profile-images allows only WebP and JPEG');

select is(
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in (
        'Profile images are publicly readable',
        'Users upload their own profile image',
        'Users replace their own profile image',
        'Users delete their own profile image')),
  4::bigint,
  'all four profile-images policies exist');

select ok(
  (select with_check from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users upload their own profile image') like '%foldername%',
  'insert policy confines writes to the caller''s own folder');

select ok(
  (select qual from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users delete their own profile image') like '%foldername%',
  'delete policy confines removals to the caller''s own folder');

select * from finish();
rollback;
