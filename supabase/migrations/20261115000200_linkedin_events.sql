-- LinkedIn automation event log table.
--
-- Direct writes are revoked from anon/authenticated and routed through the
-- SECURITY DEFINER bridge RPCs in 20261116000200_linkedin_editorial_bridge.sql.
-- Editors can inspect events via RLS (narrowed to Editor-in-Chief once
-- 20261116000100_editorial_publication_type.sql adds public.is_editor_in_chief()).
--
-- Idempotent: safe to re-run.

begin;

create table if not exists public.linkedin_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  slug text,
  status text not null,
  post_urn text,
  error text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_linkedin_events_created_at
  on public.linkedin_events (created_at desc);

create index if not exists idx_linkedin_events_type_status
  on public.linkedin_events (type, status);

alter table public.linkedin_events enable row level security;

drop policy if exists "Service role full access" on public.linkedin_events;
drop policy if exists "Admins can view events" on public.linkedin_events;
drop policy if exists "Editors can view linkedin events" on public.linkedin_events;

create policy "Editors can view linkedin events"
  on public.linkedin_events for select
  to authenticated
  using ((select public.is_editor()));

revoke all on public.linkedin_events from anon, authenticated;
grant select on public.linkedin_events to authenticated;

commit;
