# Live verification — 2026-11-15

Read-only inspection of the connected Supabase project **ResearchWithME** (`bxyjjbclaklzjxeumeat`). No database records, policies, configuration or deployments were modified. These observations are a snapshot, not a replacement for end-to-end tests.

## CMS database

- Supabase reports Auth, database and REST services healthy.
- `posts`, `comments` and `editors` exist, have row-level security enabled, and their inspected columns match the CMS store's selected/written fields. The public `is_editor()` and `increment_post_likes(bigint)` functions exist; the latter updates published posts only.
- Policy definitions allow anonymous and authenticated users to read published posts, and authenticated editors to read and modify all posts. Comment policies permit public reads/inserts for published posts and editor deletion. The editor checks inspect the current `auth.uid()` against `editors`. This is policy inspection, not a test using real reader and editor sessions.
- The `anon` and `authenticated` database roles have broad table privileges on `posts` and `comments`, including `TRUNCATE`. RLS restricts ordinary row operations but does **not** apply to `TRUNCATE`. PostgREST does not expose a standard truncate endpoint; assess all direct SQL/function access paths and revoke unnecessary grants through a separately reviewed migration. No destructive test was performed.

## Schema drift and integrations

- The connected project's public schema has eight tables. It does not contain `linkedin_events`, `linkedin_tokens`, or the `billing_*` tables defined by repository migrations. The recorded migration history differs from the repository migration filenames. Confirm the intended target and migration provenance before applying anything; migration history alone does not prove a migration can safely be replayed.
- `supabase/migrations/20261115_linkedin_events.sql` defines an authenticated admin policy using `profiles.id`, but the inspected live `profiles` table has `user_id`, not `id`. This migration would need review and correction before applying; its use of a profile role for authorization also needs a security review against profile write permissions. No migration was run.
- Source review found the LinkedIn admin auth, post, and status routes also query `profiles.id`, which does not exist in the inspected project. Further, the token store and monitoring code use the cookie-free anonymous client, while their migrations allow service-role writes and do not permit anonymous token access; the status endpoint also tries to read tokens with the session client. These paths cannot be assumed functional even if tables are created. Repair requires a reviewed, least-privilege server-side design and staged OAuth testing; do not expose privileged credentials or broaden token policies to work around it.
- The latest observed main-branch GitHub run of LinkedIn Automation Tests remains failed: https://github.com/myself-aas/ResearchWithME/actions/runs/43688104765. No CI run has validated the current uncommitted branch changes.

## Still required

Live Pages deployment and genuine anonymous, reader and editor sessions must exercise reads, draft isolation, publishing, comment permissions and failure recovery. Use an explicitly designated staging environment and non-production test accounts for write tests; do not create or delete production content as a verification shortcut. Physical Android/iOS, assistive technology, comprehensive screen/theme parity, field performance, dependency remediation, selective 3D assessment and independent review remain open as described in `refactor-verification.md`.
