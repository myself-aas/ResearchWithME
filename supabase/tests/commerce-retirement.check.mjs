// Offline embedded-Postgres check; no hosted database or payment provider calls.
// Install PGlite outside the repo and set PGLITE_PATH to its entry point if needed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_PATH ?? '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create role anon;
    create role authenticated;
    create role service_role;
    grant usage on schema public to anon, authenticated, service_role;
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  `);
  await db.exec(readFileSync(new URL('../migrations/20261113000300_billing.sql', import.meta.url), 'utf8'));
  await db.exec(`
    insert into auth.users values ('11111111-1111-4111-8111-111111111111');
    insert into billing_customers (user_id, lemon_customer_id)
      values ('11111111-1111-4111-8111-111111111111', 'archived-customer');
    insert into billing_orders (user_id, lemon_order_id, total)
      values ('11111111-1111-4111-8111-111111111111', 'archived-order', 1900);
    insert into billing_subscriptions (user_id, lemon_subscription_id, status)
      values ('11111111-1111-4111-8111-111111111111', 'archived-subscription', 'expired');
    insert into billing_events (event_id, event_name, outcome)
      values ('archived-event', 'order_created', 'applied');
    insert into private.billing_settings values ('bridge_secret_sha256', 'retired-digest');
    create table private.api_settings (key text primary key, value text);
    insert into private.api_settings values ('bridge_secret_sha256', 'api-digest-unchanged');
    grant all on billing_customers, billing_orders, billing_subscriptions, billing_events to service_role;
  `);
  const migration = readFileSync(new URL('../migrations/20261120000100_retire_commerce.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration);
  console.log('PASS retirement applies and is idempotent');

  for (const name of ['billing_customers', 'billing_orders', 'billing_subscriptions', 'billing_events']) {
    const result = await db.query(`select count(*)::int as count from public.${name}`);
    assert.equal(result.rows[0].count, 1, `${name} records retained`);
    for (const role of ['anon', 'authenticated', 'service_role']) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) {
        const result = await db.query(`select has_table_privilege($1, $2, $3) as allowed`, [role, `public.${name}`, privilege]);
        assert.equal(result.rows[0].allowed, false, `${role} ${privilege} ${name} blocked`);
      }
    }
  }
  for (const sequence of ['billing_orders_id_seq', 'billing_subscriptions_id_seq']) {
    for (const role of ['anon', 'authenticated', 'service_role']) {
      const result = await db.query(`select has_sequence_privilege($1, $2, 'USAGE') or has_sequence_privilege($1, $2, 'SELECT') or has_sequence_privilege($1, $2, 'UPDATE') as allowed`, [role, `public.${sequence}`]);
      assert.equal(result.rows[0].allowed, false);
    }
  }
  console.log('PASS all archived records retained; application roles have no table or sequence privileges');
  const rpc = await db.query(`select proname from pg_proc where pronamespace = 'public'::regnamespace and proname in ('apply_billing_event', 'billing_secret_matches')`);
  assert.equal(rpc.rows.length, 0);
  const secret = await db.query(`select to_regclass('private.billing_settings') as name`);
  assert.equal(secret.rows[0].name, null);
  console.log('PASS billing RPCs and bridge-secret storage removed');
  const policies = await db.query(`select tablename from pg_policies where tablename like 'billing_%'`);
  assert.equal(policies.rows.length, 0);
  const rls = await db.query(`select relname from pg_class where relname in ('billing_customers', 'billing_orders', 'billing_subscriptions', 'billing_events') and relrowsecurity`);
  assert.equal(rls.rows.length, 4);
  console.log('PASS archived tables retain RLS and no application policies');
  const apiSecret = await db.query(`select value from private.api_settings where key = 'bridge_secret_sha256'`);
  assert.equal(apiSecret.rows[0].value, 'api-digest-unchanged');
  console.log('PASS independent free API secret untouched');
} finally {
  await db.close();
}
