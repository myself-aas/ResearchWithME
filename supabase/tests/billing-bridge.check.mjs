/**
 * Local verification of supabase/migrations/20261113000300_billing.sql: bridge behaviour.
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
// PGlite is installed outside the repository (see the header); PGLITE_PATH
// points at it so this file runs from a clean checkout.
const { PGlite } = await import(process.env.PGLITE_PATH ?? '@electric-sql/pglite');
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const db = new PGlite();
await db.exec(`
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create role anon; create role authenticated; create role service_role;
grant usage on schema public to anon, authenticated;
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
`);
await db.exec(readFileSync('/home/user/ResearchWithME/supabase/migrations/20261113000300_billing.sql','utf8'));

const SECRET = 'bridge_test_secret';
const DIGEST = createHash('sha256').update(SECRET).digest('hex');
// Owner step from the migration comment.
await db.query(`insert into private.billing_settings (key, value) values ('bridge_secret_sha256', $1)`, [DIGEST]);

const USER = '10000000-0000-4000-8000-000000000001';
await db.query(`insert into auth.users (id) values ($1)`, [USER]);

let fails = 0;
const canonical = (v) => Array.isArray(v) ? v.map(canonical)
  : (v && typeof v === 'object') ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical(v[k])])) : v;
const check = (label, got, want) => {
  const pass = JSON.stringify(canonical(got)) === JSON.stringify(canonical(want));
  if (!pass) fails++;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}${pass ? '' : ` → got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};

const order = (over = {}) => ({
  kind: 'order', userId: USER, lemonCustomerId: '7001', lemonOrderId: '5001',
  variantId: '111', productName: 'The Teardown System', total: 1900,
  currency: 'USD', status: 'paid', aiCredits: 0, testMode: true,
  occurredAt: '2026-11-13T10:00:00Z', ...over,
});

const apply = async (eventId, name, payload) => {
  const { rows } = await db.query(`select public.apply_billing_event($1,$2,$3,$4::jsonb) as v`, [SECRET, eventId, name, JSON.stringify(payload)]);
  return rows[0].v;
};

// 1. A signed order is applied.
check('first order applies', await apply('evt_1', 'order_created', order()), { applied: true, duplicate: false, ignored: false });

// 2. Lemon Squeezy retried the same event: no second row, no second credit.
check('replayed event is a duplicate', await apply('evt_1', 'order_created', order()), { applied: false, duplicate: true, ignored: false });
const { rows: counts } = await db.query(`select (select count(*) from public.billing_orders)::int as orders, (select coalesce(sum(ai_credits),0) from public.billing_orders)::int as credits, (select count(*) from public.billing_events)::int as events`);
check('one order, one credit, one audit row', counts[0], { orders: 1, credits: 0, events: 1 });

// 3. An unattributable purchase is acknowledged and recorded, not retried.
check('missing user id is ignored', await apply('evt_2', 'order_created', order({ userId: null, lemonOrderId: '5002' })), { applied: false, duplicate: false, ignored: true });
const { rows: ignored } = await db.query(`select outcome, note from public.billing_events where event_id='evt_2'`);
check('ignored event recorded with a reason', ignored[0], { outcome: 'ignored', note: 'missing_user_id' });

// 4. A subscription is created, then updated by the renewal webhook.
check('subscription created', await apply('evt_3', 'subscription_created', { kind: 'subscription', userId: USER, lemonCustomerId: '7001', lemonSubscriptionId: '9001', variantId: '222', status: 'active', renewsAt: '2026-12-13T10:00:00Z' }), { applied: true, duplicate: false, ignored: false });
check('subscription updated', await apply('evt_4', 'subscription_payment_failed', { kind: 'subscription', userId: USER, lemonCustomerId: '7001', lemonSubscriptionId: '9001', variantId: '222', status: 'past_due' }), { applied: true, duplicate: false, ignored: false });
const { rows: sub } = await db.query(`select count(*)::int as n, max(status) as status from public.billing_subscriptions`);
check('one subscription row, newest status wins', sub[0], { n: 1, status: 'past_due' });

// 5. An unknown kind writes nothing but is recorded.
check('unknown kind ignored', await apply('evt_5', 'license_key_created', { kind: 'license' }), { applied: false, duplicate: false, ignored: true });

console.log(fails === 0 ? '\nALL BEHAVIOUR CHECKS PASS' : `\n${fails} FAILED`);
process.exitCode = fails === 0 ? 0 : 1;
