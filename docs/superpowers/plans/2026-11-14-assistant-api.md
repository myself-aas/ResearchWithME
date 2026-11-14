# Assistant API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A key-authenticated, rate-limited, metered HTTP API and MCP tool for the ResearchWithMe Assistant, with the model call running in a dedicated Cloudflare Worker.

**Architecture:** Route handlers under `/api/v1/` in the existing OpenNext site Worker authenticate a hashed API key, apply an approximate burst limit (Workers Rate Limiting binding) and an exact monthly allowance (one Postgres function that also provides idempotency), retrieve matching articles, then call `researchwithme-assistant` over a service binding. Without the binding the same pure function runs in-process, so `next dev` and unit tests need no Cloudflare runtime.

**Tech Stack:** Next.js 15 App Router on `@opennextjs/cloudflare` 1.20.14, Wrangler 4.154.0, TypeScript, Supabase Postgres (RLS, `plpgsql`), Web Crypto, `@google/genai`, Vitest 3.

**Spec:** `docs/superpowers/specs/2026-11-14-assistant-api-spec.md`. Contract: `docs/assistant-api.md`. Decision record: `docs/decisions/ADR-001-assistant-api-worker-and-rate-limiting.md`.

## Global Constraints

- `npm run quality` passes before every commit. Conventional commit messages.
- No `service_role` key. Privileged writes go through `security definer` functions gated by `public.billing_secret_matches`.
- A raw API key appears in exactly one place: the `201` body of key creation. Never in logs, the database, or another response.
- Every `/api/v1/*` and `/api/account/api-keys*` error uses `apiError()` from `lib/api/errors.ts`.
- `POST /api/research-assistant` keeps its response shape (`mode: 'catalog' | 'model'`, string `error`) and its 12-per-minute IP limit.
- Migrations are idempotent SQL in `supabase/migrations/`. Do not apply to the live project without the owner's say-so.
- No deploys, secrets, or Cloudflare resource creation without the owner's say-so.
- UI work reads `PRODUCT.md` and `DESIGN.md` first, uses colour tokens only, and updates the matching `.impeccable/surfaces/` brief.
- English only, no emoji, no invented statistics (`truthful-copy`, `english-only` tests).

## Review Focus

| # | Failure the tests would otherwise miss | Pinned to |
|---|---|---|
| R1 | The raw key is persisted or logged | Task 5, test "stores only the hash" |
| R2 | A retried request is charged twice | Task 9, test "replays without a second claim" |
| R3 | A failed request still uses allowance | Task 9, test "releases the claim when the assistant throws" |
| R4 | A missing or throwing limiter binding lets everything through | Task 8, test "falls back to the store when the binding throws" |
| R5 | The legacy route changes shape during the extraction | Task 1, test "legacy response shape is unchanged" |

## Scope

Modules M1 to M5 of the spec. M6 (paid credit pack) is a separate plan, written only after the spec's go/no-go gate is met. Each task below leaves working, tested software.

## How each installed skill is applied

| Skill | Where it is used |
|---|---|
| `spec-driven-development` | The spec, its capability map and its approval gate (Task 0) |
| `api-and-interface-design` | Contract first, one error shape, idempotency, additive versioning (Tasks 2, 7, 9) |
| `nodejs-backend-patterns` | Boundary validation, structured logs, no wildcard CORS, health of dependencies as `503` (Tasks 2, 9) |
| `cloudflare` | Product choice: Workers, service binding, Rate Limiting binding, KV fallback, observability; Wrangler because a config exists (Tasks 8, 10) |
| `nextjs-on-cloudflare` | Keep OpenNext; no vinext migration |
| `workers-development` | Local run with `npm run preview` and `wrangler dev`; Local Explorer at `/cdn-cgi/local/explorer` to inspect KV (Tasks 8, 10) |
| `workers-profiling` | After deploy, on the owner's confirmation of account, Worker and version (Task 12) |
| `cloudflare-email-service` | Not in V1. Recorded as deferred with its prerequisite (Task 12 notes) |
| `gateway-workers` | Not applicable: covers Zero Trust Gateway Forward policies only |
| `prisma-client-api` | Not applicable: the repository uses Supabase clients and SQL functions |
| `playwright` | CLI-driven end-to-end check (Task 12) |
| `documentation-and-adrs` | ADR-001, CHANGELOG, drift check between `docs/assistant-api.md` and the code (Task 12) |
| `documentation-writer` | The four-part structure of `docs/assistant-api.md` |
| `design-doc-mermaid` | The flowchart, sequence, state and ER diagrams, each parsed before being added |
| `repo-intake-and-plan` | Its scan found only `README.md` and `scripts/`; it targets Python research repositories, so the command inventory in the spec was taken from `package.json` instead |
| `writing-plans` | This document |

## File map

| Path | Responsibility |
|---|---|
| `lib/assistant/types.ts` | `AssistantArticle`, `AssistantAnswer`, `AssistantCitation` |
| `lib/assistant/retrieve.ts` | Rank catalogue posts for a query; map a post to an `AssistantArticle` |
| `lib/assistant/compose.ts` | Catalogue answer, prompt, `composeAnswer`. Imports nothing from Next or Cloudflare |
| `lib/assistant/generate.ts` | `createGeminiGenerator` |
| `lib/assistant/service.ts` | `answerQuestion`: binding or in-process |
| `lib/api/errors.ts` | `apiError`, `ApiErrorCode` |
| `lib/api/keys.ts` | Key format, generation, hashing, bearer parsing |
| `lib/api/key-store.ts` | `ApiKeyStore` (Supabase and memory) |
| `lib/api/ledger.ts` | `ApiLedger` (Supabase and memory) |
| `lib/api/burst.ts` | `checkBurst` |
| `lib/api/authenticate.ts` | `authenticateApiRequest` |
| `app/api/v1/assistant/answers/route.ts`, `app/api/v1/usage/route.ts` | Public API |
| `app/api/account/api-keys/route.ts`, `app/api/account/api-keys/[keyId]/route.ts` | Key management |
| `components/account/ApiKeys.tsx` | Key list and create/revoke controls on the account page |
| `workers/assistant/{wrangler.jsonc,tsconfig.json,src/index.ts}` | Assistant Worker |
| `supabase/migrations/20261114000100_api_keys.sql` | Tables, RLS, functions |

---

### Task 0: Owner decisions (gate)

No code. The spec says implementation starts only after approval.

- [ ] Owner confirms or changes: free allowance (100 per month), burst limit (30 per 60 s), reuse of `BILLING_BRIDGE_SECRET`, whether a catalogue-only answer uses allowance (spec: yes), AI Gateway now or later, mirroring into `cloudflare-pages/` (spec: no).
- [ ] Record the answers under "Open questions" in the spec and set its status to Approved.

---

### Task 1: Extract the Assistant core (M1)

**Files:** Create `lib/assistant/types.ts`, `lib/assistant/retrieve.ts`, `lib/assistant/compose.ts`, `lib/assistant/generate.ts`. Modify `app/api/research-assistant/route.ts`. Test `lib/__tests__/assistant-core.test.ts`.

**Interfaces**

Consumes: `BlogPost` from `lib/blog-data`, `cleanText` from `lib/validation`.

Produces:

```ts
// types.ts
export interface AssistantArticle { id: string; slug: string; title: string; author: string; category: string; summary: string; keyTakeaways: string[]; artifact: string | null }
export interface AssistantAnswer { answer: string; mode: 'MODEL' | 'CATALOG'; notice: string | null }
export interface AssistantCitation { id: string; slug: string; title: string; author: string; category: string; url: string }
// retrieve.ts
export function rankArticles(query: string, posts: BlogPost[], max?: number): BlogPost[];   // max defaults to 3; scoring and threshold exactly as the route has today
export function toAssistantArticle(post: BlogPost): AssistantArticle;
export function toCitation(article: AssistantArticle, siteUrl: string): AssistantCitation;
// compose.ts
export const MODEL_TIMEOUT_MS = 20_000;
export const MAX_ANSWER_CHARS = 20_000;
export type Generate = (prompt: string, signal: AbortSignal) => Promise<string>;
export function catalogAnswer(query: string, articles: AssistantArticle[]): string;
export function buildPrompt(query: string, articles: AssistantArticle[]): string;
export function composeAnswer(input: { query: string; articles: AssistantArticle[] }, generate: Generate | null): Promise<AssistantAnswer>;
// generate.ts
export function createGeminiGenerator(env: { GEMINI_API_KEY?: string; GEMINI_MODEL?: string; AI_GATEWAY_BASE_URL?: string }): Generate | null;  // null without a key
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { composeAnswer, catalogAnswer } from '@/lib/assistant/compose';
import { rankArticles } from '@/lib/assistant/retrieve';

const article = { id: 'a1', slug: 'replication', title: 'Replication in practice', author: 'A. Writer', category: 'Research Reviews', summary: 'What a rerun showed.', keyTakeaways: ['Seeds matter'], artifact: null };

describe('composeAnswer', () => {
  it('returns the model text in MODEL mode', async () => {
    const out = await composeAnswer({ query: 'replication', articles: [article] }, async () => 'Model text');
    expect(out).toEqual({ answer: 'Model text', mode: 'MODEL', notice: null });
  });
  it('falls back to the catalogue answer when the generator throws', async () => {
    const out = await composeAnswer({ query: 'replication', articles: [article] }, async () => { throw new Error('boom'); });
    expect(out.mode).toBe('CATALOG');
    expect(out.answer).toBe(catalogAnswer('replication', [article]));
    expect(out.notice).toBe('The language model was unavailable, so this answer was assembled directly from the catalog.');
  });
  it('treats an empty model reply as a failure', async () => {
    expect((await composeAnswer({ query: 'q', articles: [article] }, async () => '   ')).mode).toBe('CATALOG');
  });
  it('uses the catalogue with no notice when there is no generator', async () => {
    expect(await composeAnswer({ query: 'q', articles: [] }, null)).toMatchObject({ mode: 'CATALOG', notice: null });
  });
  it('caps the model reply at 20000 characters', async () => {
    expect((await composeAnswer({ query: 'q', articles: [article] }, async () => 'x'.repeat(30_000))).answer).toHaveLength(20_000);
  });
});

describe('rankArticles', () => {
  it('ignores stop words and short terms', () => {
    expect(rankArticles('what is the', [])).toEqual([]);
  });
});
```

Add a route test in the same file, R5: mock `@/lib/cms/catalogue` to return `[]` and `@/lib/rate-limit` to allow; `POST` with `{ query: 'x-ray' }` and no `GEMINI_API_KEY`; expect status 200 and `Object.keys(body).sort()` to equal `['answer', 'citations', 'mode']` with `body.mode === 'catalog'`.

- [ ] **Step 2:** `npx vitest run lib/__tests__/assistant-core.test.ts`. Expected: FAIL, modules not found.
- [ ] **Step 3: Implement.** Move `STOP_WORDS`, the scoring loop and the two answer templates out of the route unchanged. `composeAnswer` passes `AbortSignal.timeout(MODEL_TIMEOUT_MS)` to `generate`. The route keeps its own validation and limiter, calls `rankArticles`, `composeAnswer(…, createGeminiGenerator(process.env))`, and maps `MODEL`/`CATALOG` to the lowercase values it returns today, omitting `notice` when null. `createGeminiGenerator` passes `httpOptions.baseUrl` only when `AI_GATEWAY_BASE_URL` is set; before setting that variable anywhere, read the AI Gateway provider page for Google AI Studio and confirm the base URL form.
- [ ] **Step 4:** Run the file again. Expected: PASS. Then `npm run quality`.
- [ ] **Step 5:** `git commit -m "refactor: extract the assistant core from the route"`

---

### Task 2: One error shape

**Files:** Create `lib/api/errors.ts`. Test `lib/__tests__/api-errors.test.ts`.

**Interfaces.** Produces:

```ts
export type ApiErrorCode = 'INVALID_REQUEST' | 'UNAUTHENTICATED' | 'UNSUPPORTED_MEDIA_TYPE' | 'IDEMPOTENCY_KEY_REUSED'
  | 'IDEMPOTENCY_IN_FLIGHT' | 'RATE_LIMITED' | 'QUOTA_EXHAUSTED' | 'UPSTREAM_UNAVAILABLE' | 'INTERNAL';
export const API_ERROR_STATUS: Record<ApiErrorCode, number>;   // 400, 401, 415, 422, 409, 429, 429, 503, 500
export function apiError(code: ApiErrorCode, message: string, init?: { details?: unknown; headers?: HeadersInit }): Response;
```

- [ ] **Step 1: Failing test**

```ts
it('serialises the shape, status and headers', async () => {
  const res = apiError('RATE_LIMITED', 'Too many requests. Retry after 12 seconds.', { details: { retryAfterSeconds: 12 }, headers: { 'Retry-After': '12' } });
  expect(res.status).toBe(429);
  expect(res.headers.get('Retry-After')).toBe('12');
  expect(res.headers.get('Cache-Control')).toBe('no-store');
  expect(await res.json()).toEqual({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Retry after 12 seconds.', details: { retryAfterSeconds: 12 } } });
});
it('omits details when none are given', async () => {
  expect(await apiError('UNAUTHENTICATED', 'A valid API key is required.').json()).toEqual({ error: { code: 'UNAUTHENTICATED', message: 'A valid API key is required.' } });
});
```

- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** `git commit -m "feat: add the api error shape"`

---

### Task 3: Key format and hashing

**Files:** Create `lib/api/keys.ts`. Test `lib/__tests__/api-keys.test.ts`.

**Interfaces.** Produces:

```ts
export const MAX_ACTIVE_KEYS = 5;
export const KEY_PATTERN: RegExp;                      // /^rwm_[A-Za-z0-9_-]{43}$/
export function generateApiKey(randomBytes?: (n: number) => Uint8Array): { key: string; prefix: string };  // 32 random bytes, base64url; prefix = first 12 characters of key
export function hashApiKey(key: string): Promise<string>;   // lowercase hex SHA-256 via crypto.subtle
export function parseBearer(header: string | null): string | null;   // the key, or null unless the header is exactly "Bearer <KEY_PATTERN>"
```

- [ ] **Step 1: Failing tests**

```ts
it('generates a key that matches the pattern, with a 12-character prefix', () => {
  const { key, prefix } = generateApiKey(() => new Uint8Array(32));
  expect(key).toBe('rwm_' + 'A'.repeat(43));
  expect(prefix).toBe('rwm_AAAAAAAA');
});
it('hashes to hex SHA-256', async () => {
  expect(await hashApiKey('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
it.each([[null], ['Bearer'], ['Basic abc'], ['Bearer rwm_short'], ['bearer rwm_' + 'A'.repeat(43) + ' x']])('rejects %s', (h) => {
  expect(parseBearer(h)).toBeNull();
});
it('accepts a well-formed header', () => {
  expect(parseBearer('Bearer rwm_' + 'A'.repeat(43))).toBe('rwm_' + 'A'.repeat(43));
});
```

- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. **Step 4:** Run. PASS.
- [ ] **Step 5:** `git commit -m "feat: add api key generation and hashing"`

---

### Task 4: Migration

**Files:** Create `supabase/migrations/20261114000100_api_keys.sql`. Test `lib/__tests__/api-migration.test.ts` (static checks on the SQL text, as other migration tests in the repository do; if none exist, follow `billing` precedent and keep the checks below).

**Interfaces.** Produces these database objects:

- `public.api_keys (id uuid pk default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, name text not null check (char_length(name) between 1 and 60), prefix text not null, key_hash text not null unique, created_at timestamptz not null default now(), last_used_at timestamptz, revoked_at timestamptz)`. RLS on. Policies for `authenticated`: select, insert and update where `user_id = (select auth.uid())`. No delete policy. A trigger rejects an insert when the user already has 5 rows with `revoked_at is null`, and rejects an update that changes anything other than `revoked_at` from null to a timestamp.
- `public.api_requests (id uuid pk default gen_random_uuid(), key_id uuid not null references public.api_keys on delete cascade, user_id uuid not null, idempotency_key text not null, request_hash text not null, status text not null default 'claimed' check (status in ('claimed','completed')), mode text, response jsonb, created_at timestamptz not null default now(), completed_at timestamptz, unique (key_id, idempotency_key))`. RLS on, no policies.
- `public.api_usage_periods (user_id uuid not null references auth.users on delete cascade, period_start date not null, requests_used integer not null default 0 check (requests_used >= 0), primary key (user_id, period_start))`. RLS on, no policies.
- Functions, all `security definer`, `set search_path = ''`, execute granted to `anon, authenticated`, each raising `42501` unless `public.billing_secret_matches(p_bridge_secret)`:
  - `api_key_lookup(p_bridge_secret text, p_key_hash text) returns jsonb`: `{ keyId, userId }` for a key with `revoked_at is null`, else `null`; sets `last_used_at = now()` when it is null or older than one hour.
  - `api_request_claim(p_bridge_secret text, p_key_id uuid, p_idempotency_key text, p_request_hash text, p_included integer) returns jsonb`: body below.
  - `api_request_complete(p_bridge_secret text, p_request_id uuid, p_mode text, p_response jsonb) returns void`: sets `status = 'completed'`, `completed_at = now()`.
  - `api_request_release(p_bridge_secret text, p_request_id uuid) returns void`: deletes the row if `status = 'claimed'` and decrements that user's current period by 1, not below 0.
  - `api_usage(p_bridge_secret text, p_user_id uuid) returns integer`: `requests_used` for the current UTC month, 0 when absent.
  - `api_requests_prune() returns integer`: deletes completed rows older than 24 hours. No secret; execute revoked from `anon, authenticated`. Scheduled by the owner with `pg_cron` or run from the Supabase dashboard.

The claim function, in full, because its ordering is the design:

```sql
create or replace function public.api_request_claim(
  p_bridge_secret text, p_key_id uuid, p_idempotency_key text, p_request_hash text, p_included integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_id uuid;
  v_row public.api_requests;
  v_period date := date_trunc('month', timezone('utc', now()))::date;
  v_used integer;
begin
  if not public.billing_secret_matches(p_bridge_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select user_id into v_user from public.api_keys where id = p_key_id and revoked_at is null;
  if v_user is null then
    return jsonb_build_object('status', 'UNKNOWN_KEY');
  end if;

  insert into public.api_requests (key_id, user_id, idempotency_key, request_hash)
  values (p_key_id, v_user, p_idempotency_key, p_request_hash)
  on conflict (key_id, idempotency_key) do nothing
  returning id into v_id;

  if v_id is null then
    select * into v_row from public.api_requests
     where key_id = p_key_id and idempotency_key = p_idempotency_key for update;
    if v_row.request_hash <> p_request_hash then
      return jsonb_build_object('status', 'MISMATCH');
    end if;
    if v_row.status = 'completed' then
      return jsonb_build_object('status', 'REPLAY', 'response', v_row.response);
    end if;
    if v_row.created_at > now() - interval '2 minutes' then
      return jsonb_build_object('status', 'IN_FLIGHT');
    end if;
    -- An abandoned claim was already counted. Take it over without counting again.
    update public.api_requests set created_at = now() where id = v_row.id;
    select requests_used into v_used from public.api_usage_periods where user_id = v_user and period_start = v_period;
    return jsonb_build_object('status', 'CLAIMED', 'requestId', v_row.id, 'used', coalesce(v_used, 0));
  end if;

  if p_included >= 1 then
    insert into public.api_usage_periods as u (user_id, period_start, requests_used)
    values (v_user, v_period, 1)
    on conflict (user_id, period_start) do update set requests_used = u.requests_used + 1
      where u.requests_used < p_included
    returning u.requests_used into v_used;
  end if;

  if v_used is null then
    delete from public.api_requests where id = v_id;
    return jsonb_build_object('status', 'QUOTA_EXHAUSTED', 'used', greatest(p_included, 0));
  end if;

  return jsonb_build_object('status', 'CLAIMED', 'requestId', v_id, 'used', v_used);
end;
$$;
```

- [ ] **Step 1: Failing test.** Read the file and assert it contains `create table if not exists public.api_keys`, `enable row level security` three times, `security definer` six times, `set search_path = ''` six times, and does not contain `service_role`.
- [ ] **Step 2:** Run. FAIL (file missing). **Step 3:** Write the migration; every statement idempotent (`if not exists`, `create or replace`, `drop policy if exists` then `create policy`). **Step 4:** Run. PASS.
- [ ] **Step 5: Database check (ask first).** On a Supabase branch or local stack, apply the migration twice (second run must be a no-op), insert a key for a test user, then with the bridge secret call `api_request_claim` three times with `p_included = 2` and keys `k1`, `k2`, `k3`. Expected statuses: `CLAIMED` used 1, `CLAIMED` used 2, `QUOTA_EXHAUSTED`. Call `k1` again with the same hash: `IN_FLIGHT`. Complete `k1`, call again: `REPLAY`. Call `k1` with another hash: `MISMATCH`. Release `k2`: `api_usage` returns 1. Run the Supabase advisors and resolve any finding on the new objects.
- [ ] **Step 6:** `git commit -m "feat: add api key, request ledger and usage tables"`

---

### Task 5: Key store and key management routes (M2)

**Files:** Create `lib/api/key-store.ts`, `app/api/account/api-keys/route.ts`, `app/api/account/api-keys/[keyId]/route.ts`. Test `lib/__tests__/api-key-store.test.ts`, `lib/__tests__/api-key-routes.test.ts`.

**Interfaces**

Consumes: `generateApiKey`, `hashApiKey`, `MAX_ACTIVE_KEYS` (Task 3); `apiError` (Task 2); `createSupabaseServerClient` from `lib/supabase/server`; `getDashboardUser` from `lib/cms/auth`.

Produces:

```ts
export interface ApiKeyRecord { id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null }
export interface ApiKeyIdentity { keyId: string; userId: string }
export interface ApiKeyStore {
  list(userId: string): Promise<ApiKeyRecord[]>;
  create(userId: string, input: { name: string; prefix: string; keyHash: string }): Promise<ApiKeyRecord | 'LIMIT_REACHED'>;
  revoke(userId: string, keyId: string): Promise<boolean>;
  lookup(keyHash: string): Promise<ApiKeyIdentity | null>;
}
export function createMemoryApiKeyStore(): ApiKeyStore;
export function createSupabaseApiKeyStore(clientFactory: () => Promise<SupabaseClient>): ApiKeyStore;  // list/create/revoke through RLS as the signed-in user; lookup through rpc('api_key_lookup')
export function getApiKeyStore(): ApiKeyStore;                     // Supabase when configured, else memory
export function setApiKeyStoreForTesting(store: ApiKeyStore | null): void;
```

Routes: `GET` lists, `POST { name }` creates and returns `201` with the record plus `key`, `DELETE` returns `204` or `404`-shaped `INVALID_REQUEST`. All three return `401 UNAUTHENTICATED` without a session and reject a cross-origin `Origin` header.

- [ ] **Step 1: Failing tests**

```ts
it('stores only the hash', async () => {                         // R1
  const store = createMemoryApiKeyStore();
  const create = vi.spyOn(store, 'create');
  const log = vi.spyOn(console, 'log'); const err = vi.spyOn(console, 'error');
  setApiKeyStoreForTesting(store);
  const res = await POST(new Request('http://localhost/api/account/api-keys', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'laptop' }) }));
  const body = await res.json();
  expect(res.status).toBe(201);
  expect(body.key).toMatch(KEY_PATTERN);
  const stored = create.mock.calls[0][1];
  expect(stored).toEqual({ name: 'laptop', prefix: body.key.slice(0, 12), keyHash: await hashApiKey(body.key) });
  expect(JSON.stringify([...log.mock.calls, ...err.mock.calls])).not.toContain(body.key);
  expect(JSON.stringify(await (await GET()).json())).not.toContain(body.key);
});
it('refuses a sixth active key', async () => { /* create 5, sixth returns 400 INVALID_REQUEST with message 'You can have at most 5 active keys. Revoke one first.' */ });
it('a revoked key no longer resolves', async () => { /* create, lookup returns identity, revoke returns true, lookup returns null */ });
it('one user cannot revoke another user\'s key', async () => { /* revoke('user-b', keyOfA) returns false */ });
it('returns 401 without a session', async () => { /* getDashboardUser mocked to null; status 401, code UNAUTHENTICATED */ });
```

Write the four commented tests out in full with those exact expectations; they are abbreviated here only because each is three lines against the memory store.

- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. **Step 4:** Run. PASS. `npm run quality`.
- [ ] **Step 5:** `git commit -m "feat: add api key management routes"`

---

### Task 6: API keys on the account page

**Files:** Create `components/account/ApiKeys.tsx`. Modify `app/dashboard/account/page.tsx`, `.impeccable/surfaces/app-dashboard-account-page-tsx.md`. Test `lib/__tests__/api-keys-ui.test.tsx`.

**Interfaces.** Consumes: the three routes of Task 5. Produces: `export default function ApiKeys(props: { initialKeys: ApiKeyRecord[]; monthlyIncluded: number; used: number | null })`, a client component.

Design constraints, from `DESIGN.md` and the existing account page: one section headed "API keys" at the same level as the existing sections; a table (name, prefix, created, last used, status) that reflows to stacked rows at 320 px; one primary action "Create key"; the new key appears once in a read-only field with a "Copy" button and the sentence "This key is shown once. Store it now."; revoke asks for confirmation inline, not in a modal; empty state "No keys yet. Create one to call the Assistant API."; `used === null` renders "—", never 0; targets at least 44 px; colour tokens only.

- [ ] **Step 1: Failing tests.** Render with no keys: the empty-state sentence is present. Render with `used: null`: the text "—" is present and "0 of" is not. Simulate a successful create (mock `fetch` to return `201` with `key: 'rwm_' + 'A'.repeat(43)`): the key is in a read-only input and the "shown once" sentence is present; after "Done" the key is no longer in the document.
- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement; load `initialKeys` and usage in the page's server component. **Step 4:** Run. PASS. Check 320 px overflow and axe (light and dark) with the screenshot scripts used for the dashboards.
- [ ] **Step 5:** Update the surface brief. `npm run quality`. `git commit -m "feat: manage api keys from the account page"`

---

### Task 7: Request ledger client (M3)

**Files:** Create `lib/api/ledger.ts`. Test `lib/__tests__/api-ledger.test.ts`.

**Interfaces.** Produces:

```ts
export interface Usage { requestsUsed: number; requestsIncluded: number; requestsRemaining: number; resetsAt: string }
export type ClaimResult =
  | { status: 'CLAIMED'; requestId: string; usage: Usage }
  | { status: 'REPLAY'; response: unknown }
  | { status: 'IN_FLIGHT' } | { status: 'MISMATCH' } | { status: 'UNKNOWN_KEY' }
  | { status: 'QUOTA_EXHAUSTED'; usage: Usage };
export interface ApiLedger {
  claim(input: { keyId: string; idempotencyKey: string; requestHash: string; included: number }): Promise<ClaimResult>;
  complete(requestId: string, mode: 'MODEL' | 'CATALOG', response: unknown): Promise<void>;
  release(requestId: string): Promise<void>;
  usage(userId: string, included: number): Promise<Usage>;
}
export class LedgerUnavailableError extends Error {}
export function monthlyIncluded(env?: Record<string, string | undefined>): number;   // API_FREE_MONTHLY_REQUESTS as a non-negative integer, default 100
export function periodReset(now?: Date): string;                                     // first instant of next UTC month, ISO
export function createMemoryLedger(now?: () => Date): ApiLedger;                     // same semantics as the SQL, for tests and next dev
export function createSupabaseLedger(clientFactory: () => Promise<SupabaseClient>): ApiLedger;  // rpc calls; an rpc error throws LedgerUnavailableError
export function getLedger(): ApiLedger; export function setLedgerForTesting(l: ApiLedger | null): void;
```

- [ ] **Step 1: Failing tests** (memory ledger, clock fixed at `2026-11-14T12:00:00Z`)

```ts
it('counts exactly to the allowance', async () => {
  const l = createMemoryLedger(now);
  const a = await l.claim({ keyId: 'k', idempotencyKey: 'i1', requestHash: 'h', included: 2 });
  const b = await l.claim({ keyId: 'k', idempotencyKey: 'i2', requestHash: 'h', included: 2 });
  const c = await l.claim({ keyId: 'k', idempotencyKey: 'i3', requestHash: 'h', included: 2 });
  expect(a).toMatchObject({ status: 'CLAIMED', usage: { requestsUsed: 1, requestsRemaining: 1, resetsAt: '2026-12-01T00:00:00.000Z' } });
  expect(b).toMatchObject({ status: 'CLAIMED', usage: { requestsUsed: 2, requestsRemaining: 0 } });
  expect(c).toMatchObject({ status: 'QUOTA_EXHAUSTED', usage: { requestsUsed: 2, requestsRemaining: 0 } });
});
it('reports in-flight, then replay, then mismatch', async () => { /* claim i1; claim i1 again -> IN_FLIGHT; complete; claim i1 -> REPLAY with the stored response; claim i1 with hash 'other' -> MISMATCH */ });
it('release returns the unit', async () => { /* claim, release, usage().requestsUsed === 0 */ });
it('takes over a claim older than two minutes without counting again', async () => { /* advance clock 121 s; claim i1 -> CLAIMED, requestsUsed still 1 */ });
it('maps an rpc error to LedgerUnavailableError', async () => { /* rpc resolves { data: null, error: { message: 'connection reset' } } */ });
it('reads the allowance from the environment', () => {
  expect(monthlyIncluded({})).toBe(100);
  expect(monthlyIncluded({ API_FREE_MONTHLY_REQUESTS: '250' })).toBe(250);
  expect(monthlyIncluded({ API_FREE_MONTHLY_REQUESTS: '-3' })).toBe(100);
});
```

- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. **Step 4:** Run. PASS.
- [ ] **Step 5:** `git commit -m "feat: add the api request ledger client"`

---

### Task 8: Burst limiter

**Files:** Create `lib/api/burst.ts`. Modify `wrangler.jsonc`. Test `lib/__tests__/api-burst.test.ts`.

**Interfaces.** Consumes: `rateLimit` from `lib/rate-limit`, `getCloudflareContext`. Produces:

```ts
export interface RateLimitBindingLike { limit(options: { key: string }): Promise<{ success: boolean }> }
export const BURST_LIMIT = 30; export const BURST_WINDOW_SECONDS = 60;
export function checkBurst(keyId: string, binding?: RateLimitBindingLike | null): Promise<{ allowed: boolean; retryAfter: number }>;
// binding defaults to env.API_BURST_LIMITER; when it denies, retryAfter is BURST_WINDOW_SECONDS (the binding reports nothing more precise)
```

`wrangler.jsonc`, top level and inside `previews`:

```jsonc
"ratelimits": [
  { "name": "API_BURST_LIMITER", "namespace_id": "2001", "simple": { "limit": 30, "period": 60 } }
]
```

- [ ] **Step 1: Failing tests**

```ts
it('denies when the binding denies', async () => {
  expect(await checkBurst('k1', { limit: async () => ({ success: false }) })).toEqual({ allowed: false, retryAfter: 60 });
});
it('keys the binding by key id', async () => {
  const limit = vi.fn(async () => ({ success: true }));
  await checkBurst('k1', { limit });
  expect(limit).toHaveBeenCalledWith({ key: 'k1' });
});
it('falls back to the store when the binding throws', async () => {          // R4
  setRateLimitStoreForTesting(createMemoryRateLimitStore());
  const broken = { limit: async () => { throw new Error('binding down'); } };
  for (let i = 0; i < 30; i++) expect((await checkBurst('k2', broken)).allowed).toBe(true);
  expect((await checkBurst('k2', broken)).allowed).toBe(false);
});
it('falls back to the store when there is no binding', async () => { /* same loop with binding null */ });
```

- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement and edit `wrangler.jsonc`. Confirm `namespace_id` `2001` is unused in the account (`ratelimits` namespaces are shared account-wide). **Step 4:** Run. PASS. `npx wrangler deploy --dry-run` must accept the config; if `previews` rejects `ratelimits`, remove it there and note that previews use the KV fallback.
- [ ] **Step 5:** `git commit -m "feat: add the api burst limiter"`

---

### Task 9: Public routes (M3 complete)

**Files:** Create `lib/api/authenticate.ts`, `lib/assistant/service.ts` (in-process path only in this task), `app/api/v1/assistant/answers/route.ts`, `app/api/v1/usage/route.ts`. Test `lib/__tests__/api-v1-answers.test.ts`, `lib/__tests__/api-v1-usage.test.ts`.

**Interfaces**

Consumes: Tasks 1, 2, 3, 5, 7, 8; `getArticleCatalogue` from `lib/cms/catalogue`; `SITE_URL` from `lib/seo`.

Produces:

```ts
// authenticate.ts
export function authenticateApiRequest(request: Request): Promise<{ ok: true; identity: ApiKeyIdentity } | { ok: false; response: Response }>;
// Order: per-IP limit of 60 per 60 s under scope 'api-auth' (429 RATE_LIMITED) -> parseBearer -> hashApiKey -> store.lookup. Any miss: 401 UNAUTHENTICATED,
// message 'A valid API key is required.', header WWW-Authenticate: Bearer.

// service.ts
export interface AssistantInput { query: string; articles: AssistantArticle[] }
export function answerQuestion(input: AssistantInput): Promise<AssistantAnswer>;
export function setAssistantForTesting(fn: ((input: AssistantInput) => Promise<AssistantAnswer>) | null): void;
```

`POST /api/v1/assistant/answers`, in this order: authenticate; `checkBurst(identity.keyId)`; content type (`415`); read at most 8192 bytes and parse (`400`); `query` via `cleanText(…, 600)` (`400`, message 'query must be 1 to 600 characters.'); `Idempotency-Key` must match `/^[A-Za-z0-9_-]{8,128}$/` when present (`400`), else generate `auto_` plus a UUID; `requestHash = sha256(JSON.stringify({ query }))`; `ledger.claim`; map `REPLAY` to `200` with the stored body, `IN_FLIGHT` to `409`, `MISMATCH` to `422`, `QUOTA_EXHAUSTED` to `429` with `details.resetsAt`, `UNKNOWN_KEY` to `401`; `rankArticles`; `answerQuestion`; build the body of `docs/assistant-api.md` with `id = 'req_' + requestId without hyphens, first 16 characters`; `ledger.complete`; return `200`. Any throw after the claim: `ledger.release`, then `503 UPSTREAM_UNAVAILABLE` for `LedgerUnavailableError` or a catalogue failure, else `500 INTERNAL`. Log one JSON line per request: `{ event: 'api.answer', requestId, keyId, mode, status, ms }`.

`GET /api/v1/usage`: authenticate, burst check, `ledger.usage`, return `{ plan: 'FREE', ...usage }`.

- [ ] **Step 1: Failing tests** (memory key store with one key, memory ledger, `setAssistantForTesting`)

```ts
it('answers with a valid key', async () => {
  const res = await POST(req({ query: 'replication' }));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ mode: 'CATALOG', notice: null, usage: { requestsUsed: 1, requestsIncluded: 100, requestsRemaining: 99 } });
  expect(body.id).toMatch(/^req_[0-9a-f]{16}$/);
});
it('refuses a missing key before reading the body', async () => {
  const r = new Request(URL, { method: 'POST', body: '{not json' });
  const res = await POST(r);
  expect(res.status).toBe(401);
  expect((await res.json()).error.code).toBe('UNAUTHENTICATED');
  expect(r.bodyUsed).toBe(false);
});
it('replays without a second claim', async () => {                           // R2
  const assistant = vi.fn(async () => ({ answer: 'A', mode: 'CATALOG' as const, notice: null }));
  setAssistantForTesting(assistant);
  const first = await (await POST(req({ query: 'q' }, { 'Idempotency-Key': 'abcdefgh' }))).json();
  const second = await (await POST(req({ query: 'q' }, { 'Idempotency-Key': 'abcdefgh' }))).json();
  expect(second).toEqual(first);
  expect(assistant).toHaveBeenCalledTimes(1);
  expect((await ledger.usage('user-a', 100)).requestsUsed).toBe(1);
});
it('rejects the same idempotency key with another body', async () => { /* second body { query: 'other' } -> 422 IDEMPOTENCY_KEY_REUSED */ });
it('releases the claim when the assistant throws', async () => {            // R3
  setAssistantForTesting(async () => { throw new Error('worker unreachable'); });
  const res = await POST(req({ query: 'q' }));
  expect(res.status).toBe(500);
  expect((await ledger.usage('user-a', 100)).requestsUsed).toBe(0);
});
it('returns QUOTA_EXHAUSTED with the reset date', async () => { /* API_FREE_MONTHLY_REQUESTS=1; second distinct request -> 429, code QUOTA_EXHAUSTED, details.resetsAt '2026-12-01T00:00:00.000Z' */ });
it('returns RATE_LIMITED with Retry-After', async () => { /* 31 requests on the memory limiter; the 31st -> 429, code RATE_LIMITED, header Retry-After present */ });
it('refuses a revoked key', async () => { /* revoke then POST -> 401 */ });
it.each([[{}, 400], [{ query: '' }, 400], [{ query: 'x'.repeat(601) }, 400]])('validates %j', async (b, s) => { expect((await POST(req(b))).status).toBe(s); });
```

- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. **Step 4:** Run. PASS. `npm run quality`.
- [ ] **Step 5:** `git commit -m "feat: add the versioned assistant api"`

---

### Task 10: Assistant Worker and service binding (M4)

**Files:** Create `workers/assistant/wrangler.jsonc`, `workers/assistant/tsconfig.json`, `workers/assistant/src/index.ts`. Modify `wrangler.jsonc` (add the binding), `lib/assistant/service.ts`, `tsconfig.json` (exclude `workers`), `package.json` (scripts `worker:assistant:dev`, `worker:assistant:check`, `worker:assistant:deploy`; append `worker:assistant:check` to `quality`). Test `lib/__tests__/assistant-service.test.ts`.

**Interfaces**

Consumes: `composeAnswer`, `createGeminiGenerator` (Task 1), imported by relative path from `../../../lib/assistant/`.

Produces:

```ts
// workers/assistant/src/index.ts
import { WorkerEntrypoint } from 'cloudflare:workers';
interface Env { GEMINI_API_KEY?: string; GEMINI_MODEL?: string; AI_GATEWAY_BASE_URL?: string }
export class AssistantService extends WorkerEntrypoint<Env> {
  async answer(input: unknown): Promise<AssistantAnswer>;   // validates input with parseAssistantInput, then composeAnswer
}
export default { fetch(): Response };                        // 404; the Worker has no public surface

// lib/assistant/compose.ts (addition)
export function parseAssistantInput(value: unknown): AssistantInput | null;   // query 1..600 chars; at most 4 articles; every string field capped at 4000 chars
// lib/assistant/service.ts (addition)
export interface AssistantBindingLike { answer(input: AssistantInput): Promise<unknown> }
export function parseAssistantAnswer(value: unknown): AssistantAnswer | null; // mode in MODEL|CATALOG, answer non-empty and capped at MAX_ANSWER_CHARS, notice string or null
```

`answerQuestion` uses `env.ASSISTANT` when present; a reply that fails `parseAssistantAnswer`, or a thrown error, falls back to the in-process path and logs `{ event: 'assistant.binding_fallback' }`.

`workers/assistant/wrangler.jsonc`: `name: "researchwithme-assistant"`, same `account_id` and `compatibility_date` as the site, `compatibility_flags: ["nodejs_compat"]`, `workers_dev: false`, `preview_urls: false`, no `routes`, `upload_source_maps: true`, `observability` with logs and traces enabled, `vars: { "GEMINI_MODEL": "<the site's current model id>" }`.

Site `wrangler.jsonc`, appended to `services`: `{ "binding": "ASSISTANT", "service": "researchwithme-assistant", "entrypoint": "AssistantService" }`.

- [ ] **Step 1: Failing tests**

```ts
it('uses the binding when present', async () => {
  const answer = vi.fn(async () => ({ answer: 'From worker', mode: 'MODEL', notice: null }));
  expect(await answerQuestion({ query: 'q', articles: [] }, { answer })).toEqual({ answer: 'From worker', mode: 'MODEL', notice: null });
});
it('falls back in-process when the binding throws', async () => {
  const out = await answerQuestion({ query: 'q', articles: [] }, { answer: async () => { throw new Error('down'); } });
  expect(out.mode).toBe('CATALOG');
});
it('rejects a malformed worker reply', () => {
  expect(parseAssistantAnswer({ answer: '', mode: 'MODEL', notice: null })).toBeNull();
  expect(parseAssistantAnswer({ answer: 'x', mode: 'OTHER', notice: null })).toBeNull();
});
it('caps what the worker accepts', () => {
  expect(parseAssistantInput({ query: 'q', articles: new Array(5).fill({}) })).toBeNull();
  expect(parseAssistantInput({ query: 'x'.repeat(601), articles: [] })).toBeNull();
});
```

(`answerQuestion` gains an optional second parameter for the binding, defaulting to the one from `getCloudflareContext()`.)

- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. **Step 4:** Run. PASS.
- [ ] **Step 5: Runtime check.** `npm run worker:assistant:check` (`wrangler types` then `tsc -p workers/assistant` then `wrangler deploy --dry-run -c workers/assistant/wrangler.jsonc`) exits 0. Start `npm run worker:assistant:dev` and `npm run preview` together; send one API request; the preview log must not contain `assistant.binding_fallback`. If local service bindings between the two dev sessions do not connect, record that in the task notes and rely on the deployed check in Task 12.
- [ ] **Step 6:** `npm run quality`. `git commit -m "feat: run the assistant model call in a dedicated worker"`

---

### Task 11: MCP tool `ask_archive` (M5)

**Files:** Modify `lib/mcp.ts`, `app/mcp/route.ts`, `lib/agent-auth.ts`, `app/auth.md/` source, `test/webmcp.test.mjs` only if it asserts the tool list. Test `lib/__tests__/mcp-ask-archive.test.ts`.

**Interfaces.** Consumes: `authenticateApiRequest`, `checkBurst`, the ledger, `rankArticles`, `answerQuestion`. Produces: `handleMcp(request, loadPosts, siteUrl, ask?)` where

```ts
export type AskArchive = (request: Request, query: string, rpcId: string | number) =>
  Promise<{ ok: true; text: string } | { ok: false; message: string }>;
```

`tools/list` returns both tools. `tools/call` with `name: 'ask_archive'` and `arguments.query` of 1 to 600 characters calls `ask`. On `ok: false` the result is `{ content: [{ type: 'text', text: message }], isError: true }` (a tool error, not a protocol error). The idempotency key is `mcp_` plus the JSON-RPC id, so a client retry of the same call is counted once. `SERVER_INFO.version` becomes `1.1.0`. `API_BEARER_SUPPORT` in `lib/agent-auth.ts` becomes `'api-key'`, and the prose in `/auth.md` says: API keys are accepted on `/api/v1/*` and for the MCP tool `ask_archive`; OAuth access tokens are still not accepted.

- [ ] **Step 1: Failing tests**

```ts
it('lists both tools', async () => { /* names equal ['search_reviews', 'ask_archive'] */ });
it('returns a tool error without a key', async () => {
  const res = await handleMcp(call('ask_archive', { query: 'q' }), async () => [], SITE, async () => ({ ok: false, message: 'A valid API key is required.' }));
  expect((await res.json()).result).toEqual({ content: [{ type: 'text', text: 'A valid API key is required.' }], isError: true });
});
it('returns the answer text', async () => { /* ask resolves { ok: true, text: 'Answer' }; result.content[0].text === 'Answer'; no isError */ });
it('search_reviews still needs no key', async () => { /* ask never called */ });
it('rejects a query over 600 characters', async () => { /* JSON-RPC error -32602 */ });
```

- [ ] **Step 2:** Run. FAIL. **Step 3:** Implement. **Step 4:** Run. PASS. `npm run quality` (includes `webmcp:test`).
- [ ] **Step 5:** `git commit -m "feat: add the ask_archive mcp tool"`

---

### Task 12: Reference, changelog, end-to-end check, release

**Files:** Modify `lib/openapi.ts` (operations `createAssistantAnswer`, `getApiUsage`, with the `bearerAuth` scheme and the error schema), `lib/api-catalog.ts` if it lists groups, `.impeccable/surfaces/app-api-docs-page-tsx.md` if the page gains a section, `docs/assistant-api.md`, `README.md`, `CHANGELOG.md`, `docs/decisions/ADR-001-…md`. Test: extend `lib/__tests__/api-catalog.test.ts`.

- [ ] **Step 1: Failing test.** `OPENAPI_DOCUMENT.paths['/api/v1/assistant/answers'].post.operationId === 'createAssistantAnswer'`; its responses include `200, 400, 401, 409, 415, 422, 429, 500, 503`; `components.securitySchemes.bearerAuth` is `{ type: 'http', scheme: 'bearer' }`.
- [ ] **Step 2:** Run. FAIL. **Step 3:** Add the operations. **Step 4:** Run. PASS.
- [ ] **Step 5: Documentation drift check.** For each of `docs/assistant-api.md` and the spec, compare `git log -1 --format=%H -- <doc>` with the last commit touching `lib/api`, `lib/assistant`, `app/api/v1`, `workers/assistant`. Re-read every limit, header, status code and example in the reference against the code; fix the document, not the code, unless the code is wrong. Remove the "proposed" banner only for parts that are deployed. Set ADR-001 to Accepted. Add the CHANGELOG entry under Unreleased, Added.
- [ ] **Step 6: End-to-end check with the `playwright` CLI skill.** Against `npm run preview` with a test Supabase project: open `/dashboard/account`, snapshot, create a key, copy it from the read-only field, call `POST /api/v1/assistant/answers` with `curl`, reload, snapshot, and confirm the usage figure went from 0 to 1. Save artefacts under `output/playwright/` (git-ignored; add the ignore line if absent). In this sandbox `npx playwright install` fails; set `RWM_CHROMIUM_PATH` to an existing Chromium as `test/playwright.config.ts` documents.
- [ ] **Step 7: Release (owner, ask first).** In order: apply the migration; `npm run worker:assistant:deploy`; `npx wrangler secret put GEMINI_API_KEY -c workers/assistant/wrangler.jsonc`; `npm run deploy`. Then with a real key: one `200`; a repeat with the same `Idempotency-Key` returns the same `id`; 40 requests in a loop produce at least one `429 RATE_LIMITED`; the Workers trace for one request shows both Workers. Roll back by redeploying the previous site version; the Assistant Worker and the tables can stay, since nothing else reads them.
- [ ] **Step 8: After a week of traffic.** Read p50/p99 CPU time for both Workers in Workers observability. If either is unexpectedly high, run `workers-profiling` after confirming account, Worker, environment and version with the owner. Query the ledger for distinct active accounts, accounts that reached the allowance, and the share of `CATALOG` answers; these are the inputs to the spec's go/no-go gate for the paid pack.
- [ ] **Step 9:** `npm run quality`. `git commit -m "docs: publish the assistant api reference"`

---

## Deferred, each needing its own plan

- **Paid credit pack (M6).** After the gate. Reuses `billing_orders.ai_credits`; adds a catalogue product, a credits column to the claim arithmetic, and `402`-style messaging. Not before the owner re-reads the payment provider's rules.
- **Email notices** with Cloudflare Email Service: `send_email` binding, html and text bodies, sender on a domain onboarded with `wrangler email sending enable`.
- **Queue-backed async answers**, a separate API hostname, OAuth bearer tokens.

## Self-review

- Spec coverage: success criteria 1 to 5 are tested in Task 9; 6 in Task 10; 7 in Task 11; 8 in Task 1; 9 in every task.
- Types: `AssistantAnswer.mode` is `'MODEL' | 'CATALOG'` everywhere except the legacy route's response, which maps to lowercase in Task 1. `ClaimResult` statuses match the strings the SQL returns.
- Known thin spots: Task 4's SQL is verified by hand on a branch, not in CI, as the billing migration is. Tasks 5, 7, 9 and 11 abbreviate some tests to a one-line description with exact expected values; write them out in full when executing. Task 10's local two-Worker check may not be possible and has a stated fallback.
- Unverified external facts the plan depends on: the AI Gateway base URL form (Task 1), whether `previews` accepts `ratelimits` (Task 8), and Cloudflare and payment-provider prices (spec only; no task depends on them).
