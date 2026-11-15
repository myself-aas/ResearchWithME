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

-- 1. Ensure the editor-in-chief row exists for Ashif Ahmed Shuvo.
--    Earlier migrations used a separate allowlist (20261028000100) then
--    consolidated onto public.editors (20261108000100). This upsert guarantees
--    the single named editor is present regardless of migration order.
do $$
begin
  if to_regclass('public.editors') is not null then
    insert into public.editors (user_id, role, display_name, created_at)
    select id, 'editor-in-chief', 'Ashif Ahmed Shuvo', now()
      from auth.users
     where email = 'ashif@researchwith.me'
        or email = 'hello@researchwith.me'
    on conflict (user_id) do update
      set role = excluded.role,
          display_name = excluded.display_name;
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
--    components/cms/MarkdownEditor.tsx and lib/supabase/storage.ts).
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
