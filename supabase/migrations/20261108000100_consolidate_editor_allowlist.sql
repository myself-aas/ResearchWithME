-- Consolidate the editor allowlist onto public.editors.
--
-- 20261025000300_cms_storage.sql created public.editor_memberships and gated the
-- storage policies on it. 20261028000100_editor_allowlist.sql then created
-- public.editors, added public.is_editor(), and rewrote every posts, comments,
-- and storage policy to consult that function — which reads public.editors.
-- Nothing has referenced editor_memberships since, so a row inserted there
-- grants no access at all.
--
-- This migration carries any such rows across, then removes the dead table so
-- there is exactly one allowlist to administer.
--
-- Idempotent: safe to re-run, and a no-op once editor_memberships is gone.

begin;

-- 1. Carry membership across. Only runs while the legacy table still exists,
--    so re-running after the drop below does nothing.
do $$
begin
  if to_regclass('public.editor_memberships') is null then
    return;
  end if;

  insert into public.editors (user_id, note)
  select em.user_id, 'migrated from public.editor_memberships'
  from public.editor_memberships em
  -- auth.users rows may already have been removed; editors.user_id references it.
  where exists (select 1 from auth.users u where u.id = em.user_id)
  on conflict (user_id) do nothing;
end;
$$;

-- 2. Drop the orphaned table and everything that depends on it.
drop policy if exists "Editors can read their own membership" on public.editor_memberships;
drop table if exists public.editor_memberships;

-- 3. Re-assert the single source of truth. Identical to the definition in
--    20261028000100_editor_allowlist.sql; repeated here so this migration is
--    self-sufficient and the invariant is visible next to the drop above.
create or replace function public.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.editors e where e.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_editor() from public;
grant execute on function public.is_editor() to anon, authenticated;

commit;
