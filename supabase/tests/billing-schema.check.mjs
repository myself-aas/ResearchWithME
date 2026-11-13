/**
 * Local verification of supabase/migrations/20261113000300_billing.sql: schema + RLS shape.
 *
 * pgTAP (billing.test.sql) is the primary suite and runs under
 * `npx supabase test db --local`. That needs Docker. This script is the
 * fallback for an environment without it: it applies the real migration to an
 * embedded Postgres (PGlite) behind a three-line shim for the Supabase surface
 * the migration touches (the `auth` schema, `auth.uid()`, and the anon /
 * authenticated roles), then asserts.
 *
 * Run:  npm --prefix /tmp/pgprobe exec node supabase/tests/<this file>
 *       (or: node supabase/tests/<this file> with @electric-sql/pglite resolvable)
 * Not part of `npm run quality`, and not a dependency of the app: PGlite is
 * installed outside the repository on purpose.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const repo = '/home/user/ResearchWithME';
const db = new PGlite();

// Supabase-surface shims: the parts of the hosted platform the migration touches.
const shim = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create role anon;
create role authenticated;
create role service_role;
grant usage on schema public to anon, authenticated;
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
`;

const run = async (label, sql) => {
  try {
    await db.exec(sql);
    console.log(`OK   ${label}`);
    return true;
  } catch (e) {
    console.log(`FAIL ${label}: ${e.message}`);
    return false;
  }
};

await run('shim', shim);
const migration = readFileSync(`${repo}/supabase/migrations/20261113000300_billing.sql`, 'utf8');
const ok = await run('migration 1st apply', migration);
if (!ok) process.exit(1);
// Idempotency is a stated property of every migration in this repo.
await run('migration 2nd apply (idempotent)', migration);

const probe = async (label, sql, expected) => {
  const { rows } = await db.query(sql);
  const got = rows[0]?.v;
  const pass = String(got) === String(expected);
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label} → ${JSON.stringify(got)}${pass ? '' : ` (expected ${JSON.stringify(expected)})`}`);
  if (!pass) process.exitCode = 1;
};

await probe('billing_orders exists', `select count(*)::text as v from pg_tables where schemaname='public' and tablename='billing_orders'`, '1');
await probe('billing_subscriptions exists', `select count(*)::text as v from pg_tables where schemaname='public' and tablename='billing_subscriptions'`, '1');
await probe('billing_events exists', `select count(*)::text as v from pg_tables where schemaname='public' and tablename='billing_events'`, '1');
await probe('billing_orders RLS on', `select rowsecurity::text as v from pg_tables where schemaname='public' and tablename='billing_orders'`, 'true');
await probe('billing_events RLS on', `select rowsecurity::text as v from pg_tables where schemaname='public' and tablename='billing_events'`, 'true');
await probe('billing_orders has 1 policy', `select count(*)::text as v from pg_policies where schemaname='public' and tablename='billing_orders'`, '1');
await probe('apply_billing_event is security definer', `select prosecdef::text as v from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='apply_billing_event'`, 'true');
await probe('no API-role grant on billing_events', `select count(*)::text as v from information_schema.role_table_grants where table_schema='public' and table_name='billing_events' and grantee in ('anon','authenticated','service_role')`, '0');

// The bridge refuses a wrong secret with 28000.
try {
  await db.query(`select public.apply_billing_event('wrong-secret','e1','order_created','{}'::jsonb)`);
  console.log('FAIL wrong secret did not raise');
  process.exitCode = 1;
} catch (e) {
  const ok = e.message.includes('billing_bridge_unauthorized') && (e.code === '28000' || e.message.includes('28000'));
  console.log(`${ok ? 'PASS' : 'FAIL'} wrong secret raises 28000/billing_bridge_unauthorized → ${e.code ?? ''} ${e.message.slice(0,60)}`);
  if (!ok) process.exitCode = 1;
}
await probe('rejected event wrote no audit row', `select count(*)::text as v from public.billing_events`, '0');
