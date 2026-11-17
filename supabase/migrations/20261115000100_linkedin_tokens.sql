-- LinkedIn OAuth tokens table (encrypted at rest via lib/crypto.ts).
--
-- Direct table access is revoked from anon and authenticated; application code
-- accesses tokens strictly through the SECURITY DEFINER bridge RPCs defined in
-- 20261116000200_linkedin_editorial_bridge.sql.
--
-- Idempotent: safe to re-run.

begin;

create table if not exists public.linkedin_tokens (
  id text primary key default 'default',
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  scope text not null,
  updated_at timestamptz not null default now()
);

alter table public.linkedin_tokens enable row level security;

drop policy if exists "Service role only" on public.linkedin_tokens;

revoke all on public.linkedin_tokens from anon, authenticated;

commit;
