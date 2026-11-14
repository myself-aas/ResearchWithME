# Spec: Assistant API (V1)

Status: **Accepted on 2026-11-14 and implemented in the repository; not deployed.** The owner delegated the open questions to best practice; see "Decisions on the open questions".
Date: 2026-11-14
Plan: `docs/superpowers/plans/2026-11-14-assistant-api.md`
Design and reference: `docs/assistant-api.md`
Decision record: `docs/decisions/ADR-001-assistant-api-worker-and-rate-limiting.md`

## Assumptions

Correct any of these before implementation starts; each one changes the plan.

1. "API" means a versioned, key-authenticated HTTP API for people outside the
   site, in addition to the existing anonymous `POST /api/research-assistant`
   that the `/assistant` page calls. The existing route stays as it is.
2. "Trigger Cloudflare Workers" means the API hands the model call to a
   dedicated Worker through a service binding. The site itself already runs as
   a Worker (`researchwithme`, OpenNext), so this is a second Worker, not a
   move to Workers.
3. "MCP" means the existing server at `/mcp` gains a tool that asks the
   Assistant, backed by the same code as the HTTP API.
4. The free allowance is 100 answers per calendar month per account and the
   burst limit is 30 requests per 60 seconds per key. Both are placeholders
   for the owner to set.
5. Payment, if it is added, goes through the existing Lemon Squeezy
   integration. No second payment provider.
6. The OpenNext setup is kept. The `nextjs-on-cloudflare` skill says to
   preserve an existing OpenNext deployment unless the owner asks to migrate.

## Capability map

The request bundles five independently testable capabilities.

| Id | Module | Depends on | Ships alone? |
|----|--------|-----------|--------------|
| M1 | Assistant core: retrieval and answer composition extracted from the route into `lib/assistant/` | none | Yes: the existing route uses it, behaviour unchanged |
| M2 | API keys: issue, list, revoke; stored as SHA-256 hashes | none | Yes: keys exist but unlock nothing |
| M3 | Limits and metering: burst limiter, monthly quota, idempotent request ledger | M2 | Yes, with M1: `POST /api/v1/assistant/answers` works in-process |
| M4 | Assistant Worker: `researchwithme-assistant`, called over a service binding, holds the model key | M1 | Yes: the API switches from in-process to the Worker when the binding exists |
| M5 | MCP tool `ask_archive`, documentation, end-to-end check | M1, M3 | Yes |
| M6 | Paid credit pack (deferred, separate plan) | M3 and the go/no-go gate below | Not in V1 |

Build order: M1, M2, M3, M4, M5. Dependency direction is one way: routes
depend on `lib/api/*` and `lib/assistant/*`; `lib/assistant/*` depends on
nothing in `lib/api/*`; the Worker depends only on `lib/assistant/compose.ts`.

## Objective

A developer or an agent with an account can create an API key, send a
question, and receive an answer that cites published ResearchWithMe reviews,
subject to a burst limit and a monthly allowance that the owner controls.

Users: readers who script against the archive, and MCP clients. The archive
remains the only source the Assistant answers from.

## Tech stack

Next.js 15 App Router on OpenNext for Cloudflare (`@opennextjs/cloudflare`
1.20.14), Wrangler 4.154.0, TypeScript, Supabase Postgres with row-level
security, Vitest 3, `@google/genai`. New: one Cloudflare Worker
(`workers/assistant`), the Workers Rate Limiting binding, optionally AI
Gateway in front of the model provider.

Not used, with reasons:

- **Prisma.** The repository reads and writes through `@supabase/supabase-js`
  and SQL functions under row-level security. Adding an ORM for three tables
  would create a second data access path.
- **Gateway Workers.** That skill covers Workers invoked by a Cloudflare
  Gateway (Zero Trust) HTTP policy with the Forward action. A public API is
  not that.
- **Express or Fastify.** Route handlers already cover it. The
  `nodejs-backend-patterns` practices that apply are used: validation at the
  boundary, one error shape, structured logs, a health check, no wildcard
  CORS, no hard-coded secrets.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run quality` | Tokens, lint, typecheck, Vitest, DNS and WebMCP tests, source audit. Must pass before each commit. |
| `npx vitest run lib/__tests__/<file>` | One test file |
| `npm run preview` | OpenNext build served by workerd, with bindings |
| `npx wrangler deploy --dry-run -c workers/assistant/wrangler.jsonc` | Bundle check for the Assistant Worker |
| `npx wrangler dev -c workers/assistant/wrangler.jsonc` | Run the Assistant Worker locally |
| `npm run deploy` | Deploy the site Worker (owner only) |

## Project structure

```
lib/assistant/retrieve.ts      term scoring over the catalogue (moved from the route)
lib/assistant/compose.ts       prompt, catalogue answer, model answer; no Next or Cloudflare imports
lib/assistant/service.ts       picks the Worker binding or the in-process path
lib/api/errors.ts              the one error shape
lib/api/keys.ts                key format, generation, hashing
lib/api/key-store.ts           Supabase and memory stores for keys
lib/api/ledger.ts              claim, complete, release; quota arithmetic
lib/api/burst.ts               Rate Limiting binding with the KV limiter as fallback
lib/api/authenticate.ts        bearer header to key record
app/api/v1/assistant/answers/route.ts
app/api/v1/usage/route.ts
app/api/account/api-keys/route.ts
app/api/account/api-keys/[keyId]/route.ts
workers/assistant/             the second Worker: wrangler.jsonc, src/index.ts, tsconfig.json
supabase/migrations/20261114000100_api_keys.sql
lib/openapi.ts                 existing operation list behind /openapi.json and /api-docs; gains the v1 operations
docs/assistant-api.md, docs/decisions/
```

## Code style

Existing conventions apply: single quotes, two-space indent, pure logic in
`lib/` with tests in `lib/__tests__/`, `server-only` on modules that touch
secrets. API fields are camelCase; enum values are UPPER_SNAKE.

```ts
export type ApiErrorCode =
  | 'INVALID_REQUEST' | 'UNAUTHENTICATED' | 'UNSUPPORTED_MEDIA_TYPE'
  | 'IDEMPOTENCY_KEY_REUSED' | 'IDEMPOTENCY_IN_FLIGHT'
  | 'RATE_LIMITED' | 'QUOTA_EXHAUSTED' | 'UPSTREAM_UNAVAILABLE' | 'INTERNAL';

export function apiError(code: ApiErrorCode, message: string, init?: { details?: unknown; headers?: HeadersInit }): Response;
```

## Testing strategy

- Vitest unit tests for every `lib/api/*` and `lib/assistant/*` module, using
  memory stores. No database and no network in unit tests.
- Route tests call the exported `POST`/`GET` functions with `Request` objects.
- The migration is checked the way the billing migration is: applied to a
  Supabase branch or local stack, then exercised with SQL in the plan.
- The Worker's logic lives in `lib/assistant/compose.ts` and is unit tested
  there; `workers/assistant/src/index.ts` is a thin wrapper verified by a
  bundle dry run and one `wrangler dev` request.
- One end-to-end check against `npm run preview` with the `playwright` CLI
  skill: create a key in the account page, call the API, see the usage count
  change. In this sandbox the Playwright browser download is blocked; the
  recipe in the plan uses an existing Chromium binary.

## Boundaries

**Always**

- Store only the SHA-256 hash of a key. Show the raw key once, at creation.
- Authenticate before reading the body; rate limit before calling the model.
- Return every API error in the shape `{ "error": { "code", "message", "details"? } }`.
- Treat the model's output and the Worker's reply as untrusted: validate and
  cap them before returning.
- Keep `.impeccable/surfaces/` briefs in step with every route file added.

**Ask first**

- Creating Cloudflare resources or deploying (`wrangler deploy`, secrets,
  AI Gateway, a custom domain).
- Applying the migration to the live Supabase project.
- Any price, allowance, or limit shown to users.
- Mirroring the new routes into `cloudflare-pages/`.

**Never**

- Log or return a raw API key after creation.
- Add a `service_role` credential. Privileged writes go through
  secret-gated `security definer` functions, as billing does.
- Sell API access before the go/no-go gate is met.
- Let the Assistant answer from anything other than published articles.

## Can the API earn money?

Short answer: **it can charge, but it has nothing to charge for yet.**

What is checked, and how:

| Question | Finding | Source |
|----------|---------|--------|
| Is there content to answer from? | The live `public.posts` table had 0 rows when read on 2026-11-14. The Assistant answers only from published articles, so today every answer is "no direct match". | Read-only query on the Supabase project, 2026-11-14 |
| Is the same data already free? | Yes. `/api/articles`, the MCP tool `search_reviews`, the A2A endpoint and the feeds serve the catalogue without a key. The only part that could be paid is the composed, cited answer. | `app/api/articles/route.ts`, `lib/mcp.ts`, `lib/a2a.ts` |
| Is there demand evidence? | None. No API exists, so there are no keys, no usage, and no requests for one on record in the repository. | Repository |
| Can the payment provider sell it? | Probably. A prepaid pack of answers is a digital good that switches something on automatically, which is the test the withdrawn Co-Pilot membership failed (`docs/billing.md`). The orders table already carries `ai_credits`. **Not confirmed**: Lemon Squeezy's current prohibited-products page could not be re-read from this environment. | `lib/billing/catalogue.ts`, `docs/billing.md` |
| Can it be metered per call? | Reviews disagree on whether Lemon Squeezy supports usage-based billing; its API does list usage records. Prepaid packs avoid the question. | Web search, 2026-11-14 |
| What does a call cost? | Cloudflare: Workers Paid is reported as USD 5 per month including 10 million requests and 30 million CPU-milliseconds, then USD 0.30 per million requests and USD 0.02 per million CPU-milliseconds. One API call is two Worker invocations, so the platform cost per answer is far below a hundredth of a cent. The model call dominates. Its price for the configured model was **not verified**. | Third-party pricing pages citing Cloudflare, read 2026-11-14; confirm at developers.cloudflare.com before relying on it |
| What is left after fees? | Lemon Squeezy is reported to take 5% plus USD 0.50 per transaction. A USD 5 pack leaves USD 4.25. | Third-party reviews, read 2026-11-14 |

Worked example, with an assumed pack of 500 answers for USD 5: USD 4.25 after
fees is USD 0.0085 per answer. The pack makes money only if the model cost per
answer, including the retrieved context of up to four article summaries, is
below that. The fixed fee makes packs under about USD 5 poor value: on a USD 2
pack, fees take 30%.

**Go/no-go gate for M6 (paid pack).** All of these, measured, not estimated:

1. At least 25 published articles in the archive.
2. At least 10 distinct accounts that used a key in a 30-day window.
3. At least 3 accounts that hit the free allowance in that window.
4. The measured model cost per answer from the request ledger, and a pack
   price that leaves a margin after it.
5. The owner has re-read the payment provider's prohibited-products page and
   the model provider's terms for reselling output.

Until then the API is free with a hard allowance. That is also what produces
the numbers the gate asks for.

## Success criteria

1. `POST /api/v1/assistant/answers` with a valid key returns `200` with
   `answer`, `citations`, `mode` and `usage`; without a key, `401 UNAUTHENTICATED`.
2. The 31st request inside 60 seconds on one key returns `429 RATE_LIMITED`
   with `Retry-After` (burst limiting is approximate by design; see ADR-001).
3. The request after the monthly allowance is spent returns `429 QUOTA_EXHAUSTED`.
   The count is exact: 100 allowed means the 101st is refused.
4. Repeating a request with the same `Idempotency-Key` and body returns the
   stored response and uses no allowance; with a different body, `422`.
5. A revoked key is refused on the next request.
6. With the `ASSISTANT` binding present the model call runs in
   `researchwithme-assistant`; without it the same answer is produced in-process.
7. The MCP tool `ask_archive` returns the same answer for the same question
   and key, and counts against the same allowance.
8. `POST /api/research-assistant` and the `/assistant` page behave as before.
9. `npm run quality` passes.

## Out of scope (deferred)

- M6, the paid credit pack: separate plan after the gate.
- Streaming answers, async jobs through Queues, webhooks.
- OAuth bearer tokens from the Supabase authorization server (`lib/agent-auth.ts`
  states the API does not accept them; that stays true).
- A separate hostname such as `api.researchwith.me`.
- Email notices (key created, allowance nearly spent) through Cloudflare Email
  Service. The skill's prerequisite is a sending domain onboarded with
  `wrangler email sending enable`; that is an account action for the owner.
- CPU or heap profiling. `workers-profiling` needs a deployed Worker and the
  owner's confirmation of account, Worker and version. The plan records when to run it.
- Migrating the site from OpenNext to vinext.

## Decisions on the open questions (2026-11-14)

The owner asked for these to be settled by best practice rather than answering
each one. What was chosen and why:

1. **Limits: 100 answers per month and 30 requests per 60 seconds, kept.**
   Start low and raise on evidence: a limit is easy to raise and hard to lower
   once clients depend on it. Both are configuration, not code
   (`API_FREE_MONTHLY_REQUESTS`; `ratelimits` in `wrangler.jsonc`, which a test
   keeps equal to the fallback's constant). Revisit with the go/no-go figures
   in "Can the API earn money?".
2. **The API has its own secret, `API_BRIDGE_SECRET`; it does not reuse
   `BILLING_BRIDGE_SECRET`.** One secret per purpose: a leak of either does not
   open the other, and each rotates alone. The digest lives in
   `private.api_settings`, and the checking function is not executable by
   client roles. The cost is one more Worker secret and one more row to insert.
3. **The second Worker stays, off by default.** It is the only arrangement
   that can keep the model key out of the Worker that serves pages, and it is
   independently deployable. Its binding is commented out until the Worker is
   deployed, because `main` deploys automatically; until then the site answers
   in-process. The isolation is only real once `GEMINI_API_KEY` is removed
   from the site Worker, which also removes model answers from the fallback.

Questions 3 to 5 keep the spec's stated defaults: catalogue answers count, no
AI Gateway yet, no Pages mirror.

## Open questions (as first asked)

1. Free allowance and burst limit: are 100 per month and 30 per minute right?
2. May the API ledger reuse `BILLING_BRIDGE_SECRET`, or should it have its own secret?
3. Should a catalogue-only answer (model unavailable) use allowance? The spec says yes: it is still an answer with citations.
4. Is AI Gateway wanted from day one, or only once there is traffic to observe?
5. Should the new routes be mirrored into `cloudflare-pages/`? The dashboards were not.
