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
select plan(23);

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

-- ---------------------------------------------------------------------------
-- The application cites the identity the database holds, not the one sent.
-- (20261114000100_verify_application_identity.sql)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email)
values ('00000000-0000-4000-8000-0000000000a1', 'applicant@example.org');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}';

select throws_ok(
  $$select public.apply_as_author('orcid', '0000-0002-1825-0097', 'Applicant', '')$$,
  'P0001', 'identity_not_linked',
  'an ORCID iD that was never connected is refused');
reset role;

insert into auth.identities (user_id, provider, provider_id, identity_data)
values
  ('00000000-0000-4000-8000-0000000000a1', 'custom:orcid', 'https://orcid.org/0000-0002-1694-233x',
   '{"sub":"https://orcid.org/0000-0002-1694-233x","name":"Applicant"}'::jsonb),
  ('00000000-0000-4000-8000-0000000000a1', 'github', '583231',
   '{"sub":"583231","user_name":"octocat"}'::jsonb);

set local role authenticated;
select is(
  (select handle from public.apply_as_author('orcid', '0000-0002-1825-0097', 'Applicant', '')),
  '0000-0002-1694-233X',
  'the stored ORCID iD comes from the custom:orcid identity, not from the caller');
select is(
  (select provider from public.author_applications where user_id = '00000000-0000-4000-8000-0000000000a1'),
  'orcid',
  'the provider is stored under its plain name');
reset role;

update public.author_applications
set status = 'rejected', reviewed_at = now()
where user_id = '00000000-0000-4000-8000-0000000000a1';

set local role authenticated;
select is(
  (select handle from public.apply_as_author('github', 'someone-else', 'Applicant', '')),
  'octocat',
  'the stored GitHub username comes from the linked identity, not from the caller');
select throws_ok(
  $$select public.apply_as_author('gitlab', 'x', 'Applicant', '')$$,
  'P0001', 'unsupported_provider',
  'providers outside GitHub and ORCID are still refused');
reset role;

select * from finish();
rollback;
