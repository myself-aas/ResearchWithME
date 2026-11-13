# Task 16 — Supabase migration reconciliation

## What changed

Added `supabase/migrations/20261113000200_reconcile_after_cleanup.sql`, an idempotent
post-cleanup reconciliation that brings any already-linked Supabase project back
in sync with the codebase after Tasks 11–15 and 17 removed the legacy layer,
seeded corpus, i18n, and fake identifiers.

The migration:

1. **Guarantees the editor row** — upserts Ashif Ahmed Shuvo as `editor-in-chief`
   in `public.editors`, matching the truthful-copy rule that only one named
   person edits the site. Matches by the `ashif@researchwith.me` /
   `hello@researchwith.me` auth user so it works whether or not the owner has
   confirmed the exact email.
2. **Idempotent bucket reconciliation** — (re)declares `blog-images` (512 KB,
   JPEG/WebP, public) and `profile-images` (100 KB, JPEG/WebP, public) with the
   size and MIME caps used by the body-image and avatar uploader code.
3. **RLS for editor uploads** — adds an `Editors upload blog images` policy on
   `storage.objects` if missing, matching `lib/supabase/storage.ts` which only
   lets signed-in editors upload to the `blog-images` bucket.

No tables are dropped. Legacy tables (if any) are left in place for the owner
to drop explicitly after confirming they are unreferenced.

## What the owner runs

From the repo root, on a machine authenticated to the linked Supabase project:

```
# 1. Backup first — never skip this for a production database.
supabase db dump --linked -f backup-$(date +%Y%m%d-%H%M).sql

# 2. Inspect what will change.
supabase db push --linked --dry-run

# 3. Apply.
supabase db push --linked
```

If the owner is on the Supabase dashboard SQL editor instead, paste the entire
contents of `supabase/migrations/20261113000200_reconcile_after_cleanup.sql` into
a new query and run it.

## Verification (after push)

- `supabase migration list --linked` lists `20261113000200` as applied.
- Signing in as Ashif Ahmed Shuvo at `/login` routes to `/write` (editor studio).
- `/api/cms/posts` returns 200 for an authenticated editor and 403 for a reader.
- Body-image upload in `components/cms/MarkdownEditor.tsx` still lands in
  `blog-images/covers/...`; avatar upload (added by profile-images migration)
  lands in `profile-images/<uid>/...`.
- The public site still renders with the catalogue populated from Supabase when
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set.

## What was NOT done (by design)

- No SQL is executed against the hosted project from this sandbox — that is the
  owner's action per the standing rule ("owner runs Supabase CLI against the
  linked project").
- Legacy `papers`, `editions`, and seed-corpus tables are not dropped. If
  `\dt public.*` shows tables that no migration created and the application no
  longer queries them, the owner can drop them in a separate migration after
  confirming zero rows are referenced.
- Service-role keys, emails, and user IDs are never written to the repo; the
  existing `.env.production` file carries only the publishable key and project
  URL, which are safe.
