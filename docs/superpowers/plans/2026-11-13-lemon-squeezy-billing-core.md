# Lemon Squeezy Billing Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sell ResearchWithMe's paid offerings through Lemon Squeezy as merchant of record — a signed webhook that records orders and subscriptions, a server-created checkout for signed-in readers, and `/pricing` plus `/dashboard/account` surfaces that show the offer and what a customer already bought. Every article stays free.

**Architecture:** Three layers that can be shipped and tested independently. (1) Pure TypeScript modules in `lib/billing/` own the product catalogue, the HMAC verification, and the mapping from a Lemon Squeezy payload to a normalised event. (2) One Postgres migration adds the billing tables, RLS, and a `security definer` bridge function, because the webhook has no user session and RLS would otherwise refuse every write — the app still ships **no service-role key**. (3) Two App Router handlers (`/api/webhooks/lemonsqueezy`, `/api/billing/checkout`) plus two pages (`/pricing`, `/dashboard/account`).

**Tech Stack:** Next.js 15.5.28 App Router, React 19, Supabase Postgres 15 (RLS + `plpgsql`), `node:crypto` (HMAC-SHA256, available under `nodejs_compat` in workerd), Vitest 3, Lemon Squeezy REST v1 (JSON:API) and Lemon.js.

**Spec:** `docs/superpowers/specs/2026-11-13-financial-integration-blueprint.md` (the technical build-out) and `docs/superpowers/specs/2026-11-13-financial-integration-blueprint-agentic.md` (the same work expressed as a Superpowers delivery sequence). Both are copies of the blueprints the owner supplied; this plan implements their Phases 1–4 and 6 and drops their Phase 5.

## Scope split (decided, not deferred)

The blueprints cover four subsystems. Per the writing-plans scope check, this plan implements **one** of them end to end and names the other three as follow-on specs. This plan leaves the product sellable and the customer informed; it deliberately gates nothing.

| Subsystem | In this plan? | Where it goes |
|---|---|---|
| Checkout, webhook, entitlement store, account surface, go-live | **Yes** | Tasks 1–12 |
| Gating a premium capability behind the subscription | **No** | Follow-on spec, see Decision D3 |
| Digital-product file delivery ($19 teardown) | **No** | Lemon Squeezy hosts the file; owner configures it. Recorded here as an order, delivered by LS |
| 1-on-1 booking / manuscript intake routing (blueprint Phase 5) | **No** | No-code work in Zapier/Calendly/Tally. Zero code in this repo; a runbook section in Task 12 |

## Decisions

| # | Topic | Decision |
|---|---|---|
| **D1** | How the webhook writes to Postgres | A `security definer` function `public.apply_billing_event(p_bridge_secret, p_event_id, p_event_name, p_payload)` called with the publishable key. **Rejected:** a service-role key in the Worker (`docs/codebase/CONCERNS.md` and `README.md` both state no service-role key ships with the app, and `lib/cms/auth.ts` depends on RLS being the only boundary); a `vault`-backed secret (same caller problem, plus an extension). The bridge secret lives in the Worker env as `BILLING_BRIDGE_SECRET` and in `private.billing_settings`, compared by SHA-256 digest. Accepted tradeoff, documented in Task 12: anyone who reads the publishable key from the browser bundle may *call* the function, but without the secret it raises `28000` and writes nothing. |
| **D2** | Which subscription states grant access | `on_trial`, `active`, `past_due`, `cancelled`, `paused` → access. `unpaid`, `expired`, `none` → no access. Rationale: Lemon Squeezy keeps a cancelled subscription valid until `ends_at`, `past_due` is inside the 2-week dunning window, and `paused` has already been paid for. Only `unpaid` and `expired` are terminal. This is the table Task 1 pins with tests. |
| **D3** | Does the $9/month tier gate anything *here*? | **No.** `PRODUCT.md` promises "nothing sits behind a paywall" for reading, and neither blueprint says what the co-pilot unlocks (its Phase 2.2 stops at "Define pricing: $9/month"). Gating the existing public `/assistant` would contradict the product. This plan records entitlement data and exposes it; choosing the gated capability is a separate spec with its own tests. Do not add a redirect, a 402, or a lock icon to any existing route in this plan. |
| **D4** | Third-party script scope | Lemon.js loads **only** on `/pricing` and `/dashboard/account`, never site-wide. `next.config.ts` gains `https://app.lemonsqueezy.com` on `script-src` and a new `frame-src https://*.lemonsqueezy.com`. Without `frame-src`, the overlay iframe falls back to `default-src 'self'` and is blocked. |
| **D5** | Who chooses the variant | The **server**. The client sends a product key (`teardown`, `copilot`, `editing`); `lib/billing/catalogue.ts` maps it to an env-held variant ID. A client-supplied variant ID is never forwarded. |
| **D6** | Duplicate and unknown webhooks | Idempotent by Lemon Squeezy's event id in `public.billing_events`. Unknown event names are acknowledged with **200** so Lemon Squeezy stops retrying, and recorded as ignored. Only a storage failure returns 500. |
| **D7** | Test data | Every billing row carries `test_mode`. `LEMONSQUEEZY_TEST_MODE=1` sets it on checkouts and is echoed from the payload on webhooks. Production reads filter `test_mode = false`. |

## Global Constraints

- Prices, verbatim from the spec: teardown **$19** one-time; co-pilot **$9/month**; manuscript editing **pay-what-you-want, minimum $150**.
- Merchant of record is **Lemon Squeezy**; payouts route **Lemon Squeezy → Payoneer (USD) → DBBL (BDT)**. All of that is dashboard configuration performed by the owner; no code.
- All verification happens in Lemon Squeezy **test mode** first, with LS test cards, before any production key is installed.
- `npm run quality` passes after every task. Baseline at plan time: 79 test files, 677 passing, 1 skipped, 0 typecheck errors, 0 ESLint errors (one pre-existing `open-next.config.ts` anonymous-default-export warning).
- **No service-role key, anywhere.** RLS stays the authorisation boundary for every user-facing read and write (D1).
- No paid-tier, invoice, or receipt copy may claim the platform charges for reading. The articles, the archive, `/cite`, and `/assistant` stay free and unmodified.
- Copy is English-only, `lang="en"`, WCAG 2.1 AA, reflow to 320 px, no disruptive modals; the checkout is a user-initiated overlay, not a pop-up (`PRODUCT.md` forbids the latter).
- Migrations are idempotent SQL in `supabase/migrations/` and are **never** applied to the hosted project by an agent; the owner runs them (see `supabase/MIGRATION-RECONCILE-2026-11-13.md` for the pattern).
- Never commit a secret. `.env.example` documents names and empty values only.
- Commit types: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- New routes change the discovery surface: `lib/api-catalog.ts`, `lib/openapi.ts`, and `test/fixtures/next-api-methods.json` are updated in the same commit that adds a route, or `lib/__tests__/api-catalog.test.ts` and `test/contracts/baseline.test.ts` fail.
- New pages need a surface brief in `.impeccable/surfaces/` or `lib/__tests__/surface-briefs.test.ts` fails.

## Review Focus

The five inputs the spec implies but never mentions, each pinned to the task that owns the code. Most likely first.

1. **A webhook Lemon Squeezy retries** (it retries up to three times with exponential backoff). Expected: the order is recorded once and `ai_credits` is credited once, not once per delivery. → Task 4 (`billing_events` primary key), Task 5, Task 6.
2. **A webhook whose `meta.custom_data.user_id` is missing or not a UUID** (checkout links made outside the app, or a legacy link). Expected: recorded and acknowledged with 200, never a 500 retry loop. → Task 3 and Task 6.
3. **A body that is valid JSON but not a Lemon Squeezy payload** (a scanner, a misconfigured proxy). Expected: 200 `{received:true, outcome:'ignored'}`, or 400 on unreadable JSON — never a 500. → Task 3 and Task 6.
4. **A checkout for a product whose variant ID env var is unset.** Expected: an honest 503 naming the missing configuration, not a 502 passed through from Lemon Squeezy. → Task 8.
5. **A request body far larger than any real webhook** (10 MB). Expected: rejected with 413 before the HMAC is computed, so a stranger cannot make the Worker hash megabytes of attacker input. → Task 6.

Additional edges owned by Task 2's tests because the signature code is where they bite: uppercase hex, surrounding whitespace, and a 63-character signature.

---

### Task 1: Product catalogue and entitlement semantics

**Files:**
- Create: `lib/billing/catalogue.ts`
- Create: `lib/billing/status.ts`
- Test: `lib/__tests__/billing-catalogue.test.ts`

**Interfaces:**
- Produces: `type BillingProductKey = 'teardown' | 'copilot' | 'editing'`
- Produces: `interface BillingProduct { key: BillingProductKey; name: string; summary: string; priceLabel: string; mode: 'payment' | 'subscription'; minPriceCents?: number }`
- Produces: `const BILLING_PRODUCTS: readonly BillingProduct[]`
- Produces: `variantIdFor(key: BillingProductKey, env?: Record<string, string | undefined>): string | null`
- Produces: `type SubscriptionStatus = 'none' | 'on_trial' | 'active' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired'`
- Produces: `isSubscriptionStatus(value: unknown): value is SubscriptionStatus`
- Produces: `hasPremiumAccess(status: SubscriptionStatus): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { BILLING_PRODUCTS, variantIdFor } from '@/lib/billing/catalogue';
import { hasPremiumAccess, isSubscriptionStatus } from '@/lib/billing/status';

describe('billing catalogue', () => {
  it('pins the spec prices verbatim', () => {
    const byKey = Object.fromEntries(BILLING_PRODUCTS.map((p) => [p.key, p]));
    expect(byKey.teardown.priceLabel).toBe('$19');
    expect(byKey.teardown.mode).toBe('payment');
    expect(byKey.copilot.priceLabel).toBe('$9 / month');
    expect(byKey.copilot.mode).toBe('subscription');
    expect(byKey.editing.minPriceCents).toBe(15000);
    expect(byKey.editing.mode).toBe('payment');
  });

  it('reads variant ids from the environment and reports a missing one as null', () => {
    expect(variantIdFor('copilot', { LEMONSQUEEZY_VARIANT_COPILOT: ' 42 ' })).toBe('42');
    expect(variantIdFor('copilot', {})).toBeNull();
    expect(variantIdFor('copilot', { LEMONSQUEEZY_VARIANT_COPILOT: '' })).toBeNull();
  });

  it('grants access for every paid-first state and denies the terminal two', () => {
    for (const status of ['on_trial', 'active', 'past_due', 'cancelled', 'paused'] as const) {
      expect(hasPremiumAccess(status), status).toBe(true);
    }
    for (const status of ['none', 'unpaid', 'expired'] as const) {
      expect(hasPremiumAccess(status), status).toBe(false);
    }
  });

  it('rejects values Lemon Squeezy never sends', () => {
    expect(isSubscriptionStatus('trialing')).toBe(false);
    expect(isSubscriptionStatus(undefined)).toBe(false);
    expect(isSubscriptionStatus('active')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/billing-catalogue.test.ts`
Expected: FAIL — `Cannot find module '@/lib/billing/catalogue'`.

- [ ] **Step 3: Implement the two modules**

`lib/billing/catalogue.ts` — a `readonly` array of the three products with the labels above, plus `variantIdFor` reading `LEMONSQUEEZY_VARIANT_TEARDOWN` / `_COPILOT` / `_EDITING` from the passed env or `process.env`, trimmed, empty → `null`. Keep it free of `server-only`: `/pricing` renders the same labels.

`lib/billing/status.ts` — the eight-value union, the guard, and `hasPremiumAccess` as a `switch` returning `true` for the five D2 states and `false` for the other three (exhaustive, so a new status is a type error).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/billing-catalogue.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/billing/catalogue.ts lib/billing/status.ts lib/__tests__/billing-catalogue.test.ts
git commit -m "feat: add billing product catalogue and subscription state semantics"
```

---

### Task 2: Webhook signature verification

**Files:**
- Create: `lib/billing/signature.ts`
- Test: `lib/__tests__/billing-signature.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `function verifyLemonSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean`
- Produces: `function hasWebhookSecret(env?: Record<string, string | undefined>): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyLemonSignature } from '@/lib/billing/signature';

const SECRET = 'whsec_test_0123456789abcdef';
const BODY = JSON.stringify({ meta: { event_name: 'order_created' } });
const sign = (body: string, secret = SECRET) => createHmac('sha256', secret).update(body).digest('hex');

describe('verifyLemonSignature', () => {
  it('accepts an HMAC over the exact raw body', () => {
    expect(verifyLemonSignature(BODY, sign(BODY), SECRET)).toBe(true);
  });
  it('accepts uppercase hex and surrounding whitespace', () => {
    expect(verifyLemonSignature(BODY, `  ${sign(BODY).toUpperCase()}\n`, SECRET)).toBe(true);
  });
  it('rejects a tampered body', () => {
    expect(verifyLemonSignature(`${BODY} `, sign(BODY), SECRET)).toBe(false);
  });
  it('rejects a signature made with another secret', () => {
    expect(verifyLemonSignature(BODY, sign(BODY, 'other'), SECRET)).toBe(false);
  });
  it('rejects a missing header, an empty secret, and a short signature without throwing', () => {
    expect(verifyLemonSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyLemonSignature(BODY, sign(BODY), '')).toBe(false);
    expect(verifyLemonSignature(BODY, sign(BODY).slice(0, 63), SECRET)).toBe(false);
    expect(verifyLemonSignature(BODY, 'zz'.repeat(32), SECRET)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/billing-signature.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `verifyLemonSignature`**

Compute `createHmac('sha256', secret).update(rawBody).digest()`, decode the trimmed/lower-cased header with `Buffer.from(hex, 'hex')`, and `timingSafeEqual` **after** an explicit length comparison (Node throws on unequal lengths). Return `false` for a missing header, an empty secret, or a header that is not 64 hex characters. This is the same shape as `lib/cms/secret-core.ts`, which hashes both sides first; here the digest is already the compared value, so only the length guard is needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/billing-signature.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/billing/signature.ts lib/__tests__/billing-signature.test.ts
git commit -m "feat: verify Lemon Squeezy webhook signatures with a timing-safe compare"
```

---

### Task 3: Payload to normalised event

**Files:**
- Create: `lib/billing/events.ts`
- Test: `lib/__tests__/billing-events.test.ts`
- Fixture: `test/fixtures/lemonsqueezy-webhooks.ts`

**Interfaces:**
- Consumes: `hasPremiumAccess`, `SubscriptionStatus`, `isSubscriptionStatus` (Task 1).
- Produces: `interface NormalisedBillingEvent { eventId: string; eventName: string; kind: 'order' | 'subscription' | 'ignored'; userId: string | null; payload: Record<string, unknown> }`
- Produces: `function normaliseBillingEvent(body: unknown): NormalisedBillingEvent`
- Produces: `function billingEventIgnoredReason(event: NormalisedBillingEvent): string | null`

**Handled event names, and nothing else:** `order_created`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_payment_failed`, `subscription_payment_success`, `subscription_payment_recovered`.

- [ ] **Step 1: Write the fixture, then the failing test**

`test/fixtures/lemonsqueezy-webhooks.ts` exports four builders shaped like the documented payload (JSON:API object, `meta.event_name`, `meta.custom_data`, `data.id`, `data.type`, `data.attributes`): `orderCreated({ userId, variantId, total })`, `subscriptionCreated({ userId, status })`, `subscriptionUpdated({ status })`, `notALemonPayload()`.

```ts
import { describe, expect, it } from 'vitest';
import { billingEventIgnoredReason, normaliseBillingEvent } from '@/lib/billing/events';
import { notALemonPayload, orderCreated, subscriptionCreated } from '@/test/fixtures/lemonsqueezy-webhooks';

const UUID = '10000000-0000-4000-8000-000000000001';

describe('normaliseBillingEvent', () => {
  it('normalises an order into a credits payload', () => {
    const event = normaliseBillingEvent(orderCreated({ userId: UUID, variantId: '111', total: 1900 }));
    expect(event.kind).toBe('order');
    expect(event.userId).toBe(UUID);
    expect(event.payload).toMatchObject({ kind: 'order', lemonOrderId: '5001', total: 1900, currency: 'USD', aiCredits: 0 });
  });

  it('normalises a subscription and keeps its status verbatim', () => {
    const event = normaliseBillingEvent(subscriptionCreated({ userId: UUID, status: 'active' }));
    expect(event.kind).toBe('subscription');
    expect(event.payload).toMatchObject({ kind: 'subscription', lemonSubscriptionId: '9001', status: 'active' });
  });

  it('marks a non-UUID user id as unusable instead of throwing', () => {
    const event = normaliseBillingEvent(orderCreated({ userId: 'user_12345' }));
    expect(event.userId).toBeNull();
    expect(billingEventIgnoredReason(event)).toBe('missing_user_id');
  });

  it('marks an unknown event name as ignored', () => {
    const event = normaliseBillingEvent({ meta: { event_name: 'license_key_created', custom_data: { user_id: UUID } }, data: { id: '1', type: 'license-keys', attributes: {} } });
    expect(event.kind).toBe('ignored');
    expect(billingEventIgnoredReason(event)).toBe('unhandled_event');
  });

  it('does not throw on a body that is not a Lemon Squeezy payload', () => {
    const event = normaliseBillingEvent(notALemonPayload());
    expect(event.kind).toBe('ignored');
    expect(event.userId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/billing-events.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `normaliseBillingEvent`**

A pure function over `unknown`. It never throws: read `meta.event_name`, `meta.custom_data.user_id`, `data.id`, `data.type`, `data.attributes` through narrow guards. A `user_id` that is not a UUID v4-shaped string (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`) becomes `null`, which is Review Focus item 2. Build the RPC payload with exactly these keys: `kind`, `lemonCustomerId`, `lemonOrderId`, `lemonSubscriptionId`, `variantId`, `productName`, `status`, `total`, `currency`, `aiCredits`, `testMode`, `occurredAt`. `aiCredits` is `0` for every product shipped by this plan; the column and its RPC path exist so the D3 follow-on spec does not need a second migration.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/billing-events.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/billing/events.ts lib/__tests__/billing-events.test.ts test/fixtures/lemonsqueezy-webhooks.ts
git commit -m "feat: normalise Lemon Squeezy webhook payloads into billing events"
```

---

### Task 4: Billing schema, RLS, and the bridge function

**Files:**
- Create: `supabase/migrations/20261113000300_billing.sql`
- Test: `supabase/tests/billing.test.sql`

**Interfaces:**
- Consumes: nothing (SQL only).
- Produces: tables `public.billing_customers`, `public.billing_orders`, `public.billing_subscriptions`, `public.billing_events`; private table `private.billing_settings`; function `public.apply_billing_event(text, text, text, jsonb) → jsonb`.
- Produces for Task 5: the RPC returns `{"applied": boolean, "duplicate": boolean}` and raises SQLSTATE `28000` with message `billing_bridge_unauthorized` when the bridge secret digest does not match.

- [ ] **Step 1: Write the failing pgTAP test**

```sql
begin;
select plan(9);
select has_table('public', 'billing_orders', 'billing_orders exists');
select has_table('public', 'billing_subscriptions', 'billing_subscriptions exists');
select has_table('public', 'billing_events', 'billing_events exists');
select is((select rowsecurity from pg_tables where schemaname='public' and tablename='billing_orders'), true, 'billing_orders has RLS');
select is((select rowsecurity from pg_tables where schemaname='public' and tablename='billing_events'), true, 'billing_events has RLS');
select is((select count(*) from pg_policies where schemaname='public' and tablename='billing_orders'), 1::bigint, 'billing_orders has exactly one policy');
select is((select prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='apply_billing_event'), true, 'apply_billing_event is security definer');
select is((select count(*) from information_schema.role_table_grants where table_schema='public' and table_name='billing_events'), 0::bigint, 'no role may read billing_events directly');
select throws_ok($$ select public.apply_billing_event('wrong-secret','e1','order_created','{}'::jsonb) $$, '28000', 'billing_bridge_unauthorized', 'a wrong bridge secret raises 28000');
select * from finish();
rollback;
```

- [ ] **Step 2: Run it against the local database to verify it fails**

Run: `npx supabase db reset --local && npx supabase test db --local`
Expected: FAIL — `public.billing_orders` does not exist. (Owner-run; Docker required. pgTAP is not wired into CI, matching the existing `supabase/tests/*.sql` note.)

- [ ] **Step 3: Write the migration**

Idempotent throughout (`if not exists`, `drop policy if exists`, `create or replace`), wrapped in `begin; … commit;`, matching the house style of `20261025000100_cms_schema.sql`:

- `public.billing_customers (user_id uuid primary key references auth.users(id) on delete cascade, lemon_customer_id text not null unique, email text not null default '', test_mode boolean not null default false, created_at, updated_at)`.
- `public.billing_orders (id bigint generated by default as identity primary key, user_id uuid not null references auth.users(id) on delete cascade, lemon_order_id text not null unique, lemon_customer_id text not null default '', variant_id text not null default '', product_name text not null default '', total integer not null default 0 check (total >= 0), currency text not null default 'USD', status text not null default 'paid', ai_credits integer not null default 0 check (ai_credits >= 0), test_mode boolean not null default false, occurred_at timestamptz not null default now(), inserted_at timestamptz not null default now())`.
- `public.billing_subscriptions (id bigint generated by default as identity primary key, user_id uuid not null references auth.users(id) on delete cascade, lemon_subscription_id text not null unique, lemon_customer_id text not null default '', variant_id text not null default '', status text not null check (status in ('on_trial','active','paused','past_due','unpaid','cancelled','expired')), renews_at timestamptz, ends_at timestamptz, test_mode boolean not null default false, occurred_at timestamptz not null default now(), updated_at timestamptz not null default now())`.
- `public.billing_events (event_id text primary key, event_name text not null, user_id uuid, outcome text not null check (outcome in ('applied','duplicate','ignored')), received_at timestamptz not null default now())`.
- Indexes: `billing_orders_user_id_idx`, `billing_subscriptions_user_id_idx`.
- `alter table … enable row level security` on all four. One policy each on the three user tables: `for select to authenticated using (user_id = (select auth.uid()))`. **No** insert/update/delete policies anywhere — the bridge function is the only writer. No policy at all on `billing_events`.
- `create schema if not exists private;` then `private.billing_settings (key text primary key, value text not null)` holding `bridge_secret_sha256`. Revoke all from `anon, authenticated`; no policy. The **owner** inserts the digest after the migration, from the SQL editor, with the value produced by `printf %s "$BILLING_BRIDGE_SECRET" | shasum -a 256`:
  `insert into private.billing_settings (key, value) values ('bridge_secret_sha256', '<hex>') on conflict (key) do update set value = excluded.value;`
  An absent row means every webhook call raises `28000`, which is the fail-closed direction. Task 12 §3 and §7 repeat this in the runbook.
- `public.billing_secret_matches(candidate text)` — `security definer`, `set search_path = ''`, returns boolean, comparing `encode(extensions.digest(candidate,'sha256'),'hex')` to the stored value. Supabase installs `pgcrypto` into the `extensions` schema, so the function names it explicitly instead of adding `extensions` to `search_path`.
- `public.apply_billing_event(p_bridge_secret text, p_event_id text, p_event_name text, p_payload jsonb)` — `security definer`, `set search_path = ''`, body: raise `28000`/`billing_bridge_unauthorized` when the secret fails; `insert into public.billing_events … on conflict (event_id) do nothing` and return `{applied:false, duplicate:true}` when zero rows were inserted; otherwise upsert the order or subscription from `p_payload`, then return `{applied:true, duplicate:false}`.
- `revoke all on function public.apply_billing_event(text,text,text,jsonb) from public;` and `grant execute … to anon, authenticated;`. Same for `billing_secret_matches` (revoke from public, grant to anon, authenticated).

- [ ] **Step 4: Re-run the pgTAP test**

Run: `npx supabase db reset --local && npx supabase test db --local`
Expected: PASS, 10 assertions (9 planned plus the `throws_ok`).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261113000300_billing.sql supabase/tests/billing.test.sql
git commit -m "feat: add billing tables, RLS, and the privileged event bridge"
```

---

### Task 5: Billing store

**Files:**
- Create: `lib/billing/store.ts`
- Test: `lib/__tests__/billing-store.test.ts`

**Interfaces:**
- Consumes: `apply_billing_event` (Task 4), `NormalisedBillingEvent` (Task 3).
- Produces: `type ApplyResult = 'applied' | 'duplicate' | 'ignored'`
- Produces: `interface BillingStore { applyEvent(event: NormalisedBillingEvent): Promise<ApplyResult>; getEntitlement(userId: string): Promise<Entitlement> }`
- Produces: `interface Entitlement { plan: 'none' | 'copilot'; status: SubscriptionStatus; aiCredits: number; currentPeriodEnd: string | null }`
- Produces: `function createSupabaseBillingStore(clientFactory: () => Promise<SupabaseClient>): BillingStore`
- Produces: `function setBillingStoreForTesting(store: BillingStore | null): void` and `async function getBillingStore(): Promise<BillingStore>` (mirrors `setRateLimitStoreForTesting` in `lib/rate-limit.ts`).
- Produces: `function isBillingConfigured(env?: Record<string, string | undefined>): boolean` — true only when Supabase is configured **and** `LEMONSQUEEZY_WEBHOOK_SECRET` and `BILLING_BRIDGE_SECRET` are non-empty.

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseBillingStore, isBillingConfigured } from '@/lib/billing/store';
import { orderCreated } from '@/test/fixtures/lemonsqueezy-webhooks';
import { normaliseBillingEvent } from '@/lib/billing/events';

const rpc = vi.fn();
vi.mock('server-only', () => ({}));

afterEach(() => vi.clearAllMocks());

const client = async () => ({ rpc }) as never;

describe('supabase billing store', () => {
  it('maps a duplicate RPC reply to duplicate without retrying', async () => {
    rpc.mockResolvedValue({ data: { applied: false, duplicate: true }, error: null });
    const store = createSupabaseBillingStore(client);
    const result = await store.applyEvent(normaliseBillingEvent(orderCreated({})));
    expect(result).toBe('duplicate');
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('throws so the route can answer 500 and let Lemon Squeezy retry when the RPC errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'connection reset' } });
    await expect(createSupabaseBillingStore(client).applyEvent(normaliseBillingEvent(orderCreated({})))).rejects.toThrow(/connection reset/);
  });

  it('reports an ignored event without calling the database', async () => {
    const store = createSupabaseBillingStore(client);
    const result = await store.applyEvent(normaliseBillingEvent({ meta: { event_name: 'license_key_created' } }));
    expect(result).toBe('ignored');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('is 503-worthy until both secrets exist', () => {
    expect(isBillingConfigured({})).toBe(false);
    expect(isBillingConfigured({ LEMONSQUEEZY_WEBHOOK_SECRET: 'a' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/__tests__/billing-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the store**

`applyEvent` short-circuits `kind === 'ignored'` before any I/O, otherwise calls `client.rpc('apply_billing_event', { p_bridge_secret, p_event_id, p_event_name, p_payload })`, throws a `BillingUnavailableError` on `error`, and maps `data.duplicate ? 'duplicate' : 'applied'`. `getEntitlement(userId)` selects the latest non-test subscription and sums `ai_credits` from non-test orders through the **session** client, so RLS scopes it — no privileged read. `getBillingStore` returns a module-level instance built on `createSupabaseServerClient` from `lib/supabase/server.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/__tests__/billing-store.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/billing/store.ts lib/__tests__/billing-store.test.ts
git commit -m "feat: add the billing store seam over the privileged event bridge"
```

---

### Task 6: Webhook route

**Files:**
- Create: `app/api/webhooks/lemonsqueezy/route.ts`
- Test: `test/next/lemonsqueezy-webhook.test.ts`
- Modify: `lib/api-catalog.ts` (add group `webhooks`), `lib/openapi.ts` (add operation), `test/fixtures/next-api-methods.json` (add entry)

**Interfaces:**
- Consumes: `verifyLemonSignature` (Task 2), `normaliseBillingEvent` (Task 3), `getBillingStore` / `isBillingConfigured` / `setBillingStoreForTesting` (Task 5).
- Produces: `POST /api/webhooks/lemonsqueezy` → `200 {received:true, outcome:'applied'|'duplicate'|'ignored'}`, `400` unreadable JSON, `401` bad signature, `413` body over `1_048_576` bytes, `503` when `isBillingConfigured()` is false, `500` when the store throws.

- [ ] **Step 1: Write the failing test**

```ts
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { orderCreated } from '@/test/fixtures/lemonsqueezy-webhooks';

const SECRET = 'whsec_test_0123456789abcdef';
const BODY = orderCreated({ userId: '10000000-0000-4000-8000-000000000001' });
const raw = JSON.stringify(BODY);
const sign = (body: string) => createHmac('sha256', SECRET).update(body).digest('hex');

let POST: (request: Request) => Promise<Response>;
const applyEvent = vi.fn();

function post({ body = raw, signature = sign(raw), headers = {} }: { body?: string; signature?: string | null; headers?: Record<string, string> } = {}) {
  return POST(new Request('https://researchwith.me/api/webhooks/lemonsqueezy', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-event-name': 'order_created', ...(signature === null ? {} : { 'x-signature': signature }), ...headers },
    body,
  }));
}

beforeEach(async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fake.supabase.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  vi.stubEnv('LEMONSQUEEZY_WEBHOOK_SECRET', SECRET);
  vi.stubEnv('BILLING_BRIDGE_SECRET', 'bridge_test_secret');
  vi.resetModules();
  ({ POST } = await import('@/app/api/webhooks/lemonsqueezy/route'));
  const store = await import('@/lib/billing/store');
  store.setBillingStoreForTesting({ applyEvent, getEntitlement: vi.fn() });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('POST /api/webhooks/lemonsqueezy', () => {
  it('accepts a correctly signed order', async () => {
    applyEvent.mockResolvedValue('applied');
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, outcome: 'applied' });
  });
  it('rejects a missing and a wrong signature with 401', async () => {
    expect((await post({ signature: null })).status).toBe(401);
    expect((await post({ signature: sign('other body') })).status).toBe(401);
  });
  it('is 503, not 500, when the deployment has no billing secrets', async () => {
    vi.stubEnv('LEMONSQUEEZY_WEBHOOK_SECRET', '');
    vi.resetModules();
    ({ POST } = await import('@/app/api/webhooks/lemonsqueezy/route'));
    expect((await post()).status).toBe(503);
  });
  it('acknowledges an unhandled event with 200 so Lemon Squeezy stops retrying', async () => {
    const other = JSON.stringify({ meta: { event_name: 'license_key_created' }, data: { id: '1', type: 'license-keys', attributes: {} } });
    expect((await post({ body: other, signature: sign(other) })).status).toBe(200);
  });
  it('rejects an unreadable JSON body with 400', async () => {
    expect((await post({ body: 'not json', signature: sign('not json') })).status).toBe(400);
  });
  it('rejects an oversized body with 413 before hashing it', async () => {
    const huge = 'x'.repeat(1_048_577);
    expect((await post({ body: huge, signature: sign(huge) })).status).toBe(413);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/next/lemonsqueezy-webhook.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/webhooks/lemonsqueezy/route'`.

- [ ] **Step 3: Implement the route and register the API surface**

Route body order is load-bearing: `503` if `!isBillingConfigured()` → read the `content-length` header and reject over `1_048_576` → `413` → `const raw = await request.text()` and reject again if `raw.length > 1_048_576` (a body may arrive without a length header) → `413` → `verifyLemonSignature(raw, request.headers.get('x-signature'), secret)` → `401` → `JSON.parse` in `try/catch` → `400` → `normaliseBillingEvent` → `getBillingStore().applyEvent` → `200`, or `console.error` + `500`. Export `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`. No `isSameOrigin` (server-to-server, no Origin header) and **no rate limit** — every hit would cost a KV write against the shared 1,000/day budget (`docs/codebase/CONCERNS.md`), and the HMAC plus the 1 MB cap already bound the work.

In `lib/api-catalog.ts` add `{ id: 'webhooks', name: 'Billing webhook', path: '/api/webhooks', description: 'Receive signed Lemon Squeezy billing events. A webhook signing secret is required.' }`. In `lib/openapi.ts` add one operation, `group: 'webhooks'`, `method: 'post'`, `path: '/api/webhooks/lemonsqueezy'`, `operationId: 'receiveLemonSqueezyWebhook'`, `security: [{ WebhookSignature: [] }]`, responses 200/400/401/413/500/503 via the existing `json()` and `errors()` helpers, plus a `WebhookSignature` entry in `OPENAPI_DOCUMENT.components.securitySchemes`. Append `{ "path": "/api/webhooks/lemonsqueezy", "method": "POST" }` to `test/fixtures/next-api-methods.json` in sorted position.

- [ ] **Step 4: Run the new tests plus the two contract suites**

Run: `npx vitest run test/next/lemonsqueezy-webhook.test.ts test/contracts/baseline.test.ts lib/__tests__/api-catalog.test.ts`
Expected: PASS. The contract suites prove the route inventory and the OpenAPI document agree.

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks lib/api-catalog.ts lib/openapi.ts test/fixtures/next-api-methods.json test/next/lemonsqueezy-webhook.test.ts
git commit -m "feat: receive signed Lemon Squeezy billing webhooks"
```

---

### Task 7: Entitlement read endpoint

**Files:**
- Create: `app/api/billing/entitlement/route.ts`
- Test: `test/next/billing-entitlement.test.ts`
- Modify: `lib/api-catalog.ts`, `lib/openapi.ts`, `test/fixtures/next-api-methods.json`

**Interfaces:**
- Consumes: `getBillingStore`, `getDashboardUser`.
- Produces: `GET /api/billing/entitlement` → `200 { entitlement: Entitlement }`, `401` signed out, `503` unconfigured, `500` store failure. `Cache-Control: no-store` via `noStoreHeaders()`.

- [ ] **Step 1: Write the failing test**

Three `it` blocks, each stubbing `next/headers` cookies and `@/lib/billing/store`: (a) signed out → `401`; (b) signed in with `getEntitlement` resolving `{ plan: 'copilot', status: 'active', aiCredits: 0, currentPeriodEnd: null }` → `200` and a body that deep-equals `{ entitlement: { plan: 'copilot', status: 'active', aiCredits: 0, currentPeriodEnd: null } }` with `cache-control` containing `no-store`; (c) store rejecting → `500`. Load the route with `loadRoute` from `test/next/support.ts` after `vi.stubEnv` for the Supabase URL, publishable key, and both secrets.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/next/billing-entitlement.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the route and register it**

`getDashboardUser()` first (it already returns `null` in demo mode, which is the right 401 for an endpoint that reports someone's purchases). Then `getBillingStore().getEntitlement(user.id)` inside `try/catch` with `console.error` + generic 500. Add the `billing` group to `lib/api-catalog.ts` (`{ id: 'billing', name: 'Billing', path: '/api/billing', description: 'Read the signed-in account’s plan and purchase credits. A session is required.' }`), the `getBillingEntitlement` operation with `security: [{ SessionCookie: [] }]`, and the fixture line `{ "path": "/api/billing/entitlement", "method": "GET" }`.

- [ ] **Step 4: Run test and contracts**

Run: `npx vitest run test/next/billing-entitlement.test.ts test/contracts/baseline.test.ts lib/__tests__/api-catalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/billing/entitlement lib/api-catalog.ts lib/openapi.ts test/fixtures/next-api-methods.json test/next/billing-entitlement.test.ts
git commit -m "feat: expose the signed-in account entitlement"
```

---

### Task 8: Checkout creation

**Files:**
- Create: `lib/billing/checkout.ts`
- Create: `app/api/billing/checkout/route.ts`
- Test: `lib/__tests__/billing-checkout.test.ts`, `test/next/billing-checkout.test.ts`
- Modify: `lib/api-catalog.ts`, `lib/openapi.ts`, `test/fixtures/next-api-methods.json`

**Interfaces:**
- Consumes: `variantIdFor`, `BillingProductKey` (Task 1), `getDashboardUser`.
- Produces: `function createCheckout(input: { userId: string; email: string; product: BillingProductKey; redirectUrl: string; env?: Record<string, string | undefined>; fetchImpl?: typeof fetch }): Promise<{ url: string }>` — throws `CheckoutNotConfiguredError` when the variant ID or API key is unset, `CheckoutUnavailableError` on a non-2xx or missing `data.attributes.url`.
- Produces: `POST /api/billing/checkout` → `201 { url }`, `400` unknown product, `401` signed out, `403` cross-site, `415` non-JSON, `429` over 10/min, `502` LS failure, `503` unconfigured.

- [ ] **Step 1: Write the failing unit test**

Assert the exact request Lemon Squeezy receives, since the JSON:API envelope is where this integration breaks:

```ts
const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { attributes: { url: 'https://researchwithme.lemonsqueezy.com/checkout/buy/abc' } } }), { status: 201 }));
await createCheckout({ userId: '10000000-0000-4000-8000-000000000001', email: 'reader@example.org', product: 'copilot', redirectUrl: 'https://researchwith.me/dashboard/account', env: { LEMONSQUEEZY_API_KEY: 'ls_key', LEMONSQUEEZY_VARIANT_COPILOT: '42', LEMONSQUEEZY_TEST_MODE: '1' }, fetchImpl });
const [url, init] = fetchImpl.mock.calls[0];
expect(url).toBe('https://api.lemonsqueezy.com/v1/checkouts');
expect(init.headers).toMatchObject({ Accept: 'application/vnd.api+json', 'Content-Type': 'application/vnd.api+json', Authorization: 'Bearer ls_key' });
const body = JSON.parse(init.body);
expect(body.data.type).toBe('checkouts');
expect(body.data.attributes.test_mode).toBe(true);
expect(body.data.attributes.checkout_data).toEqual({ email: 'reader@example.org', custom: { user_id: '10000000-0000-4000-8000-000000000001' } });
expect(body.data.attributes.product_options.redirect_url).toBe('https://researchwith.me/dashboard/account');
expect(body.data.relationships).toEqual({ store: { data: { type: 'stores', id: '77' } }, variant: { data: { type: 'variants', id: '42' } } });
```

The fake env above must therefore also carry `LEMONSQUEEZY_STORE_ID: '77'` and `NEXT_PUBLIC_SITE_URL: 'https://researchwith.me'`. Further cases in the same file: a missing variant throws `CheckoutNotConfiguredError`; a 422 reply throws `CheckoutUnavailableError`; `test_mode` is `false`, not `undefined`, when `LEMONSQUEEZY_TEST_MODE` is unset.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/__tests__/billing-checkout.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `createCheckout`, then the route**

`createCheckout` resolves the variant through `variantIdFor` (never from input), requires `LEMONSQUEEZY_API_KEY` and `LEMONSQUEEZY_STORE_ID`, posts the envelope above, and tolerates a body already shaped as `{ data: { attributes: { url } } }`. The route: `isSameOrigin` → `403`; `getDashboardUser` → `401`; `rateLimit(clientKey(request, 'billing:checkout'), 10, 60_000)` → `429`; `readJsonBody` → `415`; validate `product` against `BILLING_PRODUCTS` → `400`; `createCheckout({ …, redirectUrl: new URL('/dashboard/account', process.env.NEXT_PUBLIC_SITE_URL || 'https://researchwith.me').toString() })` → `201 { url }`; `CheckoutNotConfiguredError` → `503` (Review Focus item 4), `CheckoutUnavailableError` → `502`. Register the `createBillingCheckout` operation (`security: [{ SessionCookie: [] }]`, request body `{ product: string enum [teardown, copilot, editing] }`) and the fixture line `{ "path": "/api/billing/checkout", "method": "POST" }`.

- [ ] **Step 4: Run tests and contracts**

Run: `npx vitest run lib/__tests__/billing-checkout.test.ts test/next/billing-checkout.test.ts test/contracts/baseline.test.ts lib/__tests__/api-catalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/billing/checkout.ts app/api/billing/checkout lib/api-catalog.ts lib/openapi.ts test/fixtures/next-api-methods.json lib/__tests__/billing-checkout.test.ts test/next/billing-checkout.test.ts
git commit -m "feat: create Lemon Squeezy checkouts for signed-in readers"
```

---

### Task 9: CSP, Lemon.js, and the checkout button

**Files:**
- Modify: `next.config.ts:33-45` (`cspDirectives`)
- Create: `components/billing/LemonSqueezyScript.tsx`
- Create: `components/billing/CheckoutButton.tsx`
- Test: `lib/__tests__/billing-csp.test.ts`, `lib/__tests__/checkout-button.test.tsx`

**Interfaces:**
- Consumes: `BILLING_PRODUCTS` (Task 1), `POST /api/billing/checkout` (Task 8).
- Produces: `export default function CheckoutButton({ product, label, className }: { product: BillingProductKey; label: string; className?: string })`.
- Produces: `export default function LemonSqueezyScript(): ReactElement` — a `next/script` with `src="https://app.lemonsqueezy.com/js/lemon.js"` and `strategy="afterInteractive"`.

- [ ] **Step 1: Write both failing tests**

`billing-csp.test.ts` imports `nextConfig` and asserts the `/:path*` header list contains a `Content-Security-Policy` whose `script-src` includes `https://app.lemonsqueezy.com` and whose `frame-src` includes `https://*.lemonsqueezy.com`, and that `default-src` is still `'self'`.

`checkout-button.test.tsx` runs under `// @vitest-environment jsdom`, stubs `fetch` to return `{ url: 'https://researchwithme.lemonsqueezy.com/checkout/buy/abc' }`, sets `window.LemonSqueezy = { Url: { Open: vi.fn() } }`, clicking the button calls `LemonSqueezy.Url.Open` once with that URL, and with `window.LemonSqueezy` deleted the click hands the URL to `window.location.assign` instead (spying on `assign` — jsdom will not navigate, and asserting on `location.href` would pass for the wrong reason). Also assert a failed fetch renders an inline `role="alert"` message and does not navigate.

- [ ] **Step 2: Run both to verify they fail**

Run: `npx vitest run lib/__tests__/billing-csp.test.ts lib/__tests__/checkout-button.test.tsx`
Expected: FAIL — the CSP assertions and both component modules are missing.

- [ ] **Step 3: Implement**

`next.config.ts`: add `https://app.lemonsqueezy.com` as a trailing token on the `script-src` line (both the dev and production branches) and insert `"frame-src 'self' https://*.lemonsqueezy.com"` immediately after `script-src`. Leave every other directive untouched — `img-src`, `connect-src`, `form-action`, `frame-ancestors` stay as they are.

`CheckoutButton`: `'use client'`, `useState` for `pending` and `error`, `fetch('/api/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product }) })`, then open the overlay when `window.LemonSqueezy?.Url?.Open` exists and `window.location.assign(url)` otherwise. Declare the global on `window` in a local `global.d.ts`-style interface inside the file rather than `any`. Disable the button while pending and expose `aria-busy`. Use existing primitives for the button surface (`components/primitives/`) rather than raw classes.

- [ ] **Step 4: Run both tests**

Run: `npx vitest run lib/__tests__/billing-csp.test.ts lib/__tests__/checkout-button.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts components/billing lib/__tests__/billing-csp.test.ts lib/__tests__/checkout-button.test.tsx
git commit -m "feat: load Lemon.js on billing surfaces and allow the checkout overlay"
```

---

### Task 10: `/pricing`

**Files:**
- Create: `app/pricing/page.tsx`
- Create: `.impeccable/surfaces/app-pricing-page-tsx.md`
- Modify: `app/sitemap.ts` (`staticRoutes`), `components/BlogFooter.tsx` (one link)
- Test: `lib/__tests__/pricing-page.test.tsx`

**Interfaces:**
- Consumes: `BILLING_PRODUCTS`, `CheckoutButton`, `LemonSqueezyScript`, `getDashboardUser`.
- Produces: the route `/pricing`, which renders one card per product with the exact `priceLabel` from Task 1.

- [ ] **Step 1: Write the failing test**

`renderToStaticMarkup` the page (mocking `@/components/BlogHeader`, `@/components/BlogFooter`, and `@/lib/cms/auth` as the existing page tests do) and assert: the three product names appear; `$19`, `$9 / month` and `$150` appear; the page contains a link back to `/about`; and the words `paywall`, `free trial`, and `cancel anytime` **do not** appear (`cancel anytime` is a promise this plan does not implement). Also assert `sitemap()` includes a `/pricing` entry.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/__tests__/pricing-page.test.tsx`
Expected: FAIL — `@/app/pricing/page`.

- [ ] **Step 3: Implement the page and its brief**

Server component: `<BlogHeader />`, a `<section>` per product from `BILLING_PRODUCTS`, each ending in `<CheckoutButton product={key} label="…" />` when signed in and a `/login?next=/pricing` link when not (reuse `getDashboardUser`, exactly as `components/BlogHeader.tsx` does). Mount `<LemonSqueezyScript />` once. Copy states plainly what each purchase is and that the archive itself stays free — no "Pro"/"Premium" badge on any reading surface, per D3. Add `/pricing` to `staticRoutes` with `priority: 0.6, changeFrequency: 'monthly'` and one footer link labelled `Pricing`.

Write `.impeccable/surfaces/app-pricing-page-tsx.md` in the same frontmatter and section shape as `.impeccable/surfaces/app-bookmarks-page-tsx.md`, with `primary_target: "app/pricing/page.tsx"`, Mode `Persuade`, and a Checks section naming: signed-out state, signed-in state, a failed checkout, a 320 px reflow, and a keyboard-only purchase.

- [ ] **Step 4: Run the test and the surface-brief suite**

Run: `npx vitest run lib/__tests__/pricing-page.test.tsx lib/__tests__/surface-briefs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/pricing .impeccable/surfaces/app-pricing-page-tsx.md app/sitemap.ts components/BlogFooter.tsx lib/__tests__/pricing-page.test.tsx
git commit -m "feat: add the pricing page and its surface brief"
```

---

### Task 11: `/dashboard/account`

**Files:**
- Create: `app/dashboard/account/page.tsx`
- Create: `.impeccable/surfaces/app-dashboard-account-page-tsx.md`
- Test: `lib/__tests__/account-page.test.tsx`

**Interfaces:**
- Consumes: `getBillingStore().getEntitlement`, `getDashboardUser`, `hasPremiumAccess`, `BILLING_PRODUCTS`.
- Produces: the route `/dashboard/account`, which lives outside the `(studio)` group so a reader can reach it — exactly like `app/dashboard/access/page.tsx`.

- [ ] **Step 1: Write the failing test**

Render with a stubbed `getBillingStore` returning (a) `plan: 'none'`, `status: 'none'`, `aiCredits: 0` → the page shows "No purchases yet" and links to `/pricing`; (b) `plan: 'copilot'`, `status: 'active'` → shows `Active`; (c) `status: 'expired'` → shows an ended state and a link to `/pricing`, and **not** the word `Active`; (d) `status: 'past_due'` → shows access retained with a payment-warning note (D2). Assert `robots` is `noindex` and that no `CheckoutButton` renders for an already-active subscriber.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/__tests__/account-page.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the page and brief**

Server component under `app/dashboard/account/page.tsx` with `export const dynamic = 'force-dynamic'` and a `robots: { index: false, follow: false, nocache: true }` metadata block copied from `app/dashboard/layout.tsx`. Render the plan, status, and credit balance; a `Manage billing` link that is **absent** until Task 12 documents the customer-portal URL source (do not invent one); and `<LemonSqueezyScript />`. States are text, not colour alone.

The surface brief `app-dashboard-account-page-tsx.md` takes Mode `Operate`, `primary_target: "app/dashboard/account/page.tsx"`, and a Checks section naming: no purchases, active, past due, expired, a signed-out visit (redirected by the layout), and 320 px reflow.

- [ ] **Step 4: Run the test and the brief suite**

Run: `npx vitest run lib/__tests__/account-page.test.tsx lib/__tests__/surface-briefs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/account .impeccable/surfaces/app-dashboard-account-page-tsx.md lib/__tests__/account-page.test.tsx
git commit -m "feat: show a customer their plan and purchases"
```

---

### Task 12: Configuration, docs, and the go-live runbook

**Files:**
- Modify: `.env.example` (replace the `# --- Billing / receipts ---` block), `docs/deployment.md` (§4 credential inventory, §6.5 runtime secrets), `README.md` (routes table), `CHANGELOG.md` (`[Unreleased] → Added`), `PRODUCT.md` ("Implementation Status")
- Create: `docs/billing.md`

**Interfaces:**
- Produces: the eight environment names below, documented once and referenced everywhere.

| Name | Kind |
|---|---|
| `LEMONSQUEEZY_API_KEY` | Worker secret |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Worker secret |
| `BILLING_BRIDGE_SECRET` | Worker secret — also a row in `private.billing_settings` |
| `LEMONSQUEEZY_STORE_ID` | runtime var |
| `LEMONSQUEEZY_VARIANT_TEARDOWN` / `_COPILOT` / `_EDITING` | runtime var |
| `LEMONSQUEEZY_TEST_MODE` | runtime var, `1` in previews |

- [ ] **Step 1: Write the failing check**

Run: `grep -n "no paid tiers, subscriptions, or invoicing" .env.example`
Expected: one match — the paragraph this task replaces. After the edit the same grep must return nothing, and `grep -c LEMONSQUEEZY .env.example` must be at least 7.

- [ ] **Step 2: Edit `.env.example`**

Replace the whole `# --- Billing / receipts ---` block (which currently says no payment provider is read anywhere) with the eight names above, each on its own line, every secret left empty, and a three-line note that the bridge secret must also be inserted into `private.billing_settings` by the migration's owner step.

- [ ] **Step 3: Write `docs/billing.md`**

Eight short sections, in the voice of `docs/supabase-cms.md`:

1. **What is sold** — the three products with the spec's prices, and the scope note that no reading surface is gated by this work.
2. **Money path** — Lemon Squeezy (MoR) → Payoneer USD receiving account → DBBL BDT withdrawal. Owner dashboard work; no code, no repository change.
3. **Privileged write path (D1)** — why the webhook cannot use RLS, what the bridge secret defends and what it does not, and the rotation procedure (set the Worker secret, then update the `private.billing_settings` row, in that order).
4. **Event handling (D6)** — the eight handled names, idempotency, why unknown names return 200.
5. **Subscription states (D2)** — the five access states and the two terminal ones, with the reason for each.
6. **Test mode (D7)** — `LEMONSQUEEZY_TEST_MODE`, `test_mode` columns, and that production reads filter them out.
7. **Owner runbook** — apply `20261113000300_billing.sql`, insert the bridge digest, create the webhook in the LS dashboard pointing at `/api/webhooks/lemonsqueezy` with the same signing secret, then the go-live order from the spec's Phase 6: test mode on → buy each product with an LS test card → confirm the row and the `200` in the webhook log → simulate a failed payment → confirm `past_due` → switch to production keys last.
8. **Not in scope** — the three follow-on specs from the Scope split table, including the note that Phase 5's Calendly/Tally routing is Zapier configuration and belongs in that runbook, not in this repository.

- [ ] **Step 4: Update the four existing documents and verify**

`docs/deployment.md` §4 gains the eight names with source and storage; §6.5 gains the three `wrangler secret put` lines. `README.md` gains two rows in the routes table (`/pricing`, `/dashboard/account`) and the eight names in the environment table. `CHANGELOG.md` gains four `Added` bullets. `PRODUCT.md` "Implementation Status" loses "no paid tiers" and gains one sentence: reading remains free; paid products are sold through Lemon Squeezy and the archive was not gated.

Then run the full gate.

- [ ] **Step 5: Run the complete quality gate and commit**

Run: `npm run quality`
Expected: `tsc` 0 errors; ESLint 0 errors; every Vitest file passes, including the 9 new ones; Impeccable source scan reports 0 findings.

```bash
git add .env.example docs/billing.md docs/deployment.md README.md CHANGELOG.md PRODUCT.md
git commit -m "docs: document Lemon Squeezy billing configuration and go-live"
```

---

## Self-review

**Spec coverage.** Every phase of both blueprints, mapped:

| Spec item | Task |
|---|---|
| Phase 1 (Payoneer/DBBL, store, API keys) | Task 12 §2 and §7 (owner-run; no code) |
| Phase 2 (three products, variant IDs) | Task 1 (labels, keys), Task 8 (server-side variant mapping) |
| Phase 3.1 (Lemon.js) | Task 9 |
| Phase 3.2 (overlay, not redirect) | Task 9 |
| Phase 3.3 (`checkout[custom][user_id]`) | Task 8 — sent as `checkout_data.custom.user_id`, the documented API form, not the URL-parameter form |
| Phase 4.1 (`lemon_squeezy_customer_id`, `subscription_status`, `subscription_plan`, `ai_credits`) | Task 4 (`billing_customers.lemon_customer_id`, `billing_subscriptions.status`, `billing_orders.ai_credits`) |
| Phase 4.2 (webhook endpoint, four events) | Task 6 — plus the four payment sub-events the blueprint omits |
| Phase 4.3 (signature verification) | Task 2, Task 6 |
| Phase 5 (Zapier/Calendly/Tally) | Out of scope, documented in Task 12 §8 |
| Phase 6 (test mode, test cards, dunning) | Task 12 §7 |
| Agentic Phase 1 (branch, baseline) | Done before Task 1: `git switch -c arena/db82d2a3-researchwithme` on `e00c58e`; `npm run quality` green |
| Agentic Phase 2.1 (schema) | Task 4 |
| Agentic Phase 2.2 (scripts in `app/layout.tsx`) | Task 9 — deliberately **not** in the root layout (D4) |
| Agentic Phase 2.3 (checkout button, TDD) | Task 9 |
| Agentic Phase 2.4 (webhook, TDD) | Tasks 2, 3, 5, 6 |

Two spec departures, both forced by the codebase and recorded rather than silently skipped: no Prisma (the repository has no ORM; migrations are SQL) and no variant ID in a checkout URL (the API form in Task 8 is what Lemon Squeezy documents; the blueprint's URL-parameter example never reached the checkout API).

**Step scan.** Every step names one action with a runnable check. No step says "handle edge cases" or "add validation".

**Type consistency.** `BillingProductKey` (T1) → `createCheckout` (T8) → `CheckoutButton` (T9). `SubscriptionStatus` (T1) → `Entitlement` (T5) → `/api/billing/entitlement` (T7) → `/dashboard/account` (T11). `NormalisedBillingEvent` (T3) → `BillingStore.applyEvent` (T5) → webhook (T6). `ApplyResult` (T5) → the webhook's `outcome` field (T6). The RPC signature in T4 (`p_bridge_secret, p_event_id, p_event_name, p_payload`) matches the call in T5 exactly.

**Review Focus.** All five have an owning test: (1) T5 `duplicate` + T6 idempotent reply; (2) T3 `missing_user_id` + T6 200; (3) T3 `notALemonPayload` + T6 400/200; (4) T8 `CheckoutNotConfiguredError` → 503; (5) T6 413 before hashing.

**Proportion.** Twelve tasks, roughly one page each, against two spec documents totalling about 210 lines. Code appears as signatures and as test assertions carrying the spec's values — no implementation bodies except the SQL column list in T4, which the tests there cannot express.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-11-13-lemon-squeezy-billing-core.md`. Please review it.
