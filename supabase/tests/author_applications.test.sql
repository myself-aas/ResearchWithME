-- pgTAP coverage for writer applications (the apply → review bridge).
-- Runs against the LOCAL Supabase database only:
--   npx supabase db reset --local && npx supabase test db --local
-- Never against a hosted project.
--
-- Scope note: row-visibility and review semantics per authenticated session
-- (reader sees own rows, editor sees the queue, approval writes the allowlist)
-- require emulated JWT claims and an auth.users row; the in-process harness
-- suite (test/pages/applications-api.test.ts) covers those against the same
-- SQL the migration installs. What is asserted here is deterministic without
-- JWT emulation: privileges, RLS, policy shape, and the RPC surface.
begin;
select plan(18);

-- ---------------------------------------------------------------------------
-- RLS and table privileges
-- ---------------------------------------------------------------------------
select is((select relrowsecurity from pg_class where relname = 'author_applications' and relnamespace = 'public'::regnamespace), true,
  'RLS enabled on author_applications');
select is(has_table_privilege('anon', 'public.author_applications', 'select'), false,
  'anon has no select on author_applications');
select is(has_table_privilege('authenticated', 'public.author_applications', 'select'), true,
  'authenticated retains select (RLS then narrows it)');
select is(has_table_privilege('authenticated', 'public.author_applications', 'insert'), false,
  'authenticated cannot insert directly — RPC only');
select is(has_table_privilege('authenticated', 'public.author_applications', 'update'), false,
  'authenticated cannot update directly — RPC only');
select is(has_table_privilege('authenticated', 'public.author_applications', 'delete'), false,
  'authenticated cannot delete directly — RPC only');

set local role authenticated;
select is((select count(*) from public.author_applications), 0::bigint,
  'authenticated without a session sees zero rows (RLS hides everything)');
reset role;

set local role anon;
select throws_ok($$select count(*) from public.author_applications$$,
  '42501', null, 'anon cannot read author_applications at all');
reset role;

-- ---------------------------------------------------------------------------
-- Exactly one policy: read own-or-editor. No write policies exist by design.
-- ---------------------------------------------------------------------------
select is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'author_applications'), 1::bigint,
  'author_applications carries exactly one policy');
select is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'author_applications' and cmd = 'SELECT'), 1::bigint,
  'the single policy is a SELECT policy');

-- ---------------------------------------------------------------------------
-- The partial unique index that caps pending applications per account
-- ---------------------------------------------------------------------------
select is((select count(*) from pg_indexes where schemaname = 'public' and tablename = 'author_applications' and indexname = 'author_applications_one_pending'), 1::bigint,
  'author_applications_one_pending exists');
select ok((select indexdef from pg_indexes where schemaname = 'public' and indexname = 'author_applications_one_pending') like '%where%pending%',
  'author_applications_one_pending is a partial index on status = pending');

-- ---------------------------------------------------------------------------
-- RPC surface: callers must hold execute; both functions are security definer
-- and reject anonymous callers with not_authenticated.
-- ---------------------------------------------------------------------------
select is(has_function_privilege('anon', 'public.apply_as_author(text, text, text, text)', 'execute'), false,
  'anon cannot execute apply_as_author');
select is(has_function_privilege('authenticated', 'public.apply_as_author(text, text, text, text)', 'execute'), true,
  'authenticated can execute apply_as_author');
select is(has_function_privilege('anon', 'public.review_author_application(bigint, boolean, text)', 'execute'), false,
  'anon cannot execute review_author_application');
select is(has_function_privilege('authenticated', 'public.review_author_application(bigint, boolean, text)', 'execute'), true,
  'authenticated can execute review_author_application');
select is((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'apply_as_author'), true,
  'apply_as_author is SECURITY DEFINER');
select is((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'review_author_application'), true,
  'review_author_application is SECURITY DEFINER');

select * from finish();
rollback;
