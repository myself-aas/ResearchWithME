-- Reconciliation migration after the 2026-11-13 cleanup:
--   * legacy /papers, /editions, /paper/[slug] routes were removed;
--   * i18n (Bengali/Arabic) was removed;
--   * fake ISSN 2994-0821 and minted DOI 10.5555/* claims were dropped;
--   * the editor allowlist is Ashif Ahmed Shuvo only.
--
-- This migration is intentionally idempotent and safe to run against a fresh
-- database (it only adds what is missing, never drops data the application
-- still reads). It does NOT drop any legacy tables the application code no
-- longer references -- the owner can drop those separately after confirming
-- zero rows are referenced by drafts. Run with:
--
--   supabase db push --linked
--
-- A backup is strongly recommended before running against the hosted project.

begin;

-- 1. Ensure the editor row exists for Ashif Ahmed Shuvo.
--    Earlier migrations used a separate allowlist (20261028000100) then
--    consolidated onto public.editors (20261108000100). At this point in the
--    migration sequence public.editors has (user_id, note, added_at); the
--    `role` column and editor-in-chief promotion are applied in
--    20261116000100_editorial_publication_type.sql.
do $$
begin
  if to_regclass('public.editors') is not null then
    insert into public.editors (user_id, note, added_at)
    select id, 'Ashif Ahmed Shuvo (Editor-in-Chief)', now()
      from auth.users
     where lower(email) in (
       'ashif@researchwith.me',
       'hello@researchwith.me',
       'shuvo.1807016@bau.edu.bd',
       'asifahmedshuvo.aas@gmail.com'
     )
    on conflict (user_id) do update
      set note = coalesce(public.editors.note, excluded.note);
  end if;
end $$;

-- 2. Ensure profile-images and blog-images buckets exist with the correct
--    size/MIME policies even if the storage migration was partially applied.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('blog-images', 'blog-images', true, 524288, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-images', 'profile-images', true, 102400, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3. RLS: blog-images is written only by editors (image uploader in
--    components/editor/PlateBodyEditor.tsx and lib/supabase/storage.ts).
--    The profile-images policies are created in 20261113000100; we only add
--    the blog-images editor-write policy here if it is missing.
do $$
begin
  if to_regclass('storage.objects') is not null
     and not exists (
       select 1 from pg_policies
        where schemaname = 'storage'
          and tablename  = 'objects'
          and policyname = 'Editors upload blog images'
     ) then
    create policy "Editors upload blog images"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'blog-images'
        and exists (select 1 from public.editors e where e.user_id = auth.uid())
      );
  end if;
end $$;

commit;
