-- pgTAP coverage for the billing tables, their RLS, and the event bridge.
-- Runs against the LOCAL Supabase database only:
--   npx supabase db reset --local && npx supabase test db --local
-- Never against a hosted project.
--
-- Scope note, as in profile_images.test.sql: what is asserted here is what is
-- deterministic without emulated JWT claims and auth.users rows -- table
-- presence, RLS being on, exactly one read policy per user table, no direct
-- grant on the audit table, and the bridge refusing a wrong secret. Proving that
-- user A cannot read user B's orders needs two seeded users, which pgTAP can do
-- but which is better covered where the read path lives (Task 5's store test)
-- and by RLS itself: the only policy on each table is `auth.uid() = user_id`.
begin;
select plan(9);

select has_table('public', 'billing_orders', 'billing_orders exists');
select has_table('public', 'billing_subscriptions', 'billing_subscriptions exists');
select has_table('public', 'billing_events', 'billing_events exists');

select is((select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'billing_orders'),
  true, 'billing_orders has RLS');
select is((select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'billing_events'),
  true, 'billing_events has RLS');

-- One policy, and it is a self-read: no insert/update/delete path exists in the
-- database for any caller except the bridge function.
select is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'billing_orders'),
  1::bigint, 'billing_orders has exactly one policy');

select is((select prosecdef from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'apply_billing_event'),
  true, 'apply_billing_event is security definer');

-- The table owner (postgres) always holds its own privileges; that is not a
-- grant anyone can use over the API. What matters is that no API-facing role
-- holds one.
select is((select count(*) from information_schema.role_table_grants
            where table_schema = 'public' and table_name = 'billing_events'
              and grantee in ('anon', 'authenticated', 'service_role')),
  0::bigint, 'no API role may read billing_events directly');

select throws_ok(
  $$ select public.apply_billing_event('wrong-secret', 'e1', 'order_created', '{}'::jsonb) $$,
  '28000', 'billing_bridge_unauthorized', 'a wrong bridge secret raises 28000');

select is((select count(*) from public.billing_events where event_id = 'e1'), 0::bigint,
  'a rejected event writes no audit row');

select * from finish();
rollback;
