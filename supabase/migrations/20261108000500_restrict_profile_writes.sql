-- Restrict profile writes to the profile's owner.
--
-- The update and delete policies on public.profiles were named "Users can
-- update their own profile" and "Users can delete their own profile", but both
-- granted `or (select public.is_editor())`. Any editor could therefore rewrite
-- or delete any author's directory entry -- including the byline, slug, and
-- published flag that decide what /author/[slug] serves and whether it is
-- indexed at all.
--
-- Nothing in the application writes to public.profiles; every reference is a
-- select (lib/author-directory.ts, lib/cms/authors.ts). So this closes the gap
-- rather than breaking a feature, and it does so before a profile-editing
-- screen exists to exercise it.
--
-- Two things are deliberately left alone:
--
--   * Read access. Editors keep seeing unpublished profiles, which is what
--     reviewing a contributor's entry before it goes live requires. Reading is
--     not rewriting.
--   * Insert. "Users can create their own profile" was already owner-only.
--
-- An editor who needs to fix someone else's profile does it in the SQL editor
-- as the project owner -- the same mechanism used for the editor allowlist, and
-- deliberately not reachable from a browser session.
--
-- Idempotent: safe to re-run.

begin;

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (user_id = (select auth.uid()));

commit;
