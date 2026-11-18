-- ============================================================================
-- ResearchWithME v3.4 — Supabase Storage artifact backend (no credit card)
-- ============================================================================
-- Why: activating Cloudflare R2 requires a payment method on file even when
-- usage stays inside the free allowance. Supabase Storage needs no card on the
-- Free plan and the project already runs on Supabase, so this migration adds
-- it as a first-class artifact backend alongside `r2` and `inline`.
--
-- Apply with `supabase db push --linked` (or paste into the dashboard SQL
-- editor). Idempotent: safe to re-run.
--
-- Code that reads/writes these columns:
--   lib/v34/artifact-storage.ts   (provider selection: supabase → r2 → inline)
--   lib/v34/supabase-storage.ts   (private bucket upload + signed URLs)
--   lib/v34/exports.ts            (v34_scholarly_exports)
--   lib/v34/wave8-store.ts        (v34_render_jobs)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Private artifact bucket
--    Objects are written with the service-role key and downloaded exclusively
--    through short-lived signed URLs, so the bucket stays private.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'researchwithme-artifacts',
  'researchwithme-artifacts',
  false,
  52428800, -- 50 MB per object: rendered manifests and text exports are tiny
  array[
    'application/x-bibtex',
    'application/json',
    'application/ld+json',
    'application/pdf',
    'application/zip',
    'application/octet-stream',
    'text/csv',
    'text/markdown',
    'text/plain',
    'image/png',
    'image/jpeg',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2. Widen the storage_provider CHECK constraints
--    Wave 18 shipped `CHECK (storage_provider IN ('inline', 'r2'))`, and the
--    constraint was created inline with the column, so its generated name is
--    not guaranteed across environments. Drop whatever check constraint
--    mentions the column, then add a stable, named replacement.
-- ----------------------------------------------------------------------------
do $migration$
declare
  target_table text;
  constraint_name text;
begin
  foreach target_table in array array['v34_scholarly_exports', 'v34_render_jobs']
  loop
    for constraint_name in
      select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace ns on ns.oid = rel.relnamespace
      where ns.nspname = 'public'
        and rel.relname = target_table
        and con.contype = 'c'
        and pg_get_constraintdef(con.oid) ilike '%storage_provider%'
    loop
      execute format(
        'alter table public.%I drop constraint %I',
        target_table,
        constraint_name
      );
    end loop;

    execute format(
      'alter table public.%I add constraint %I check (storage_provider in (''inline'', ''r2'', ''supabase''))',
      target_table,
      target_table || '_storage_provider_check'
    );
  end loop;
end
$migration$;

comment on column public.v34_scholarly_exports.storage_provider is
  'Artifact backend: inline (payload in Postgres), r2 (Cloudflare R2, needs a payment method), supabase (Supabase Storage, no credit card).';

comment on column public.v34_render_jobs.storage_provider is
  'Artifact backend: inline (payload in Postgres), r2 (Cloudflare R2, needs a payment method), supabase (Supabase Storage, no credit card).';

-- ----------------------------------------------------------------------------
-- 3. Verification helper
--    Run after applying:
--      select id, public, file_size_limit from storage.buckets
--       where id = 'researchwithme-artifacts';
--      select conname, pg_get_constraintdef(oid) from pg_constraint
--       where conname like 'v34_%storage_provider_check';
-- ----------------------------------------------------------------------------
