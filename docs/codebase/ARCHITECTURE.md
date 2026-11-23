# Architecture

> 2026-11-20 update: storefront, payment integration, and product CLI bundles removed. File counts and earlier validation results below remain historical snapshot measurements; see `docs/commerce-retirement.md`.

> Snapshot updated post-remediation on branch `arena/d0437759-researchwithme` (`2026-11-17`).

## Core Sections (Required)

### 1) Architectural Style

- **Primary style:** Modular monolith (Next.js 15 App Router full-stack web application + Route Handler APIs) deployed to Cloudflare Workers via `@opennextjs/cloudflare` (`wrangler.jsonc`), paired with the bound isolated RPC Worker (`workers/assistant/` via `ASSISTANT` service binding). The legacy `cloudflare-pages/` mirror has been retired.
- **Why this classification:** All core domains (editorial CMS, reader experience, metered Assistant API v1, MCP/A2A/WebMCP agent protocols, Resend email, and editorial-only LinkedIn automation) live in one repository under `app/` and `lib/`, share one `package.json`, and run inside a single Worker bundle (`wrangler.jsonc`), separated internally into domain packages under `lib/` rather than independent microservices.
- **Primary constraints:**
  1. **Zero service-role key in application runtime:** The application intentionally avoids shipping `SUPABASE_SERVICE_ROLE_KEY` in the web runtime. Privileged backend writes (API key authentication/quota debiting, author applications, editorial classification, and editorial LinkedIn token/event/dedup persistence) run through PostgreSQL `SECURITY DEFINER` RPCs guarded by shared bridge secrets (`API_BRIDGE_SECRET`, `LINKEDIN_BRIDGE_SECRET`) or session-scoped `auth.uid()` / `is_editor_in_chief()` checks (`supabase/migrations/20261114000200_api_keys.sql`, `20261116000100_editorial_publication_type.sql`, `20261116000200_linkedin_editorial_bridge.sql`).
  2. **Cloudflare Workers edge runtime limits:** No persistent local filesystem in production, strict per-request CPU/memory budgets, awaited or `ctx.waitUntil()` background work, and KV reserved strictly for OpenNext incremental/tag caches (`NEXT_INC_CACHE_KV`, `NEXT_TAG_CACHE_KV`) while general IP rate limiting (`APP_RATE_LIMITER`) and `/api/v1` burst limiting (`API_BURST_LIMITER`) use native Cloudflare Workers Rate Limiting bindings with zero KV writes.
  3. **Dual human + agent surface:** Every published article is served both as SSR/ISR HTML for browsers and as machine-readable Markdown/JSON via content negotiation (`Accept: text/markdown` -> `/agent-markdown`), `/llms.txt`, `/index.md`, `/openapi.json`, `/mcp` (Streamable HTTP JSON-RPC), `/api/a2a`, `/.well-known/*`, and client-side `public/webmcp.js`.

### 2) System Flow

#### A. Public Read & Content-Negotiation Flow
```text
HTTP Request -> middleware.ts (Accept: text/markdown rewrite?)
  ├─ text/markdown on public route -> app/agent-markdown/route.ts -> lib/cms/catalogue.ts -> Markdown Response
  └─ browser HTML -> app/post/[slug]/page.tsx (revalidate=30)
       -> getCachedArticleCatalogue() (unstable_cache tag: "articles", 30s)
       -> lib/cms/read.ts -> getPublicCmsStore() (Supabase anon OR local JSON store)
       -> React RSC + JSON-LD + Client interactions (likes, comments, ResearchAssistant)
```

#### B. Authenticated Metered Assistant API v1 & MCP Flow
```text
POST /api/v1/assistant/answers (or POST /mcp tool "ask_archive")
  -> lib/api/authenticate.ts (verify rwm_<43 base64url> format -> SHA-256 hash -> RPC authenticate_api_key with API_BRIDGE_SECRET)
  -> lib/api/burst.ts (Cloudflare API_BURST_LIMITER 30 req/60s OR KV/memory fallback)
  -> lib/api/answers.ts (validate question + idempotency key -> reserve quota via RPC reserve_api_quota)
  -> lib/assistant/service.ts
       ├─ env.ASSISTANT RPC binding (workers/assistant, currently commented out in wrangler.jsonc)
       └─ fallback: direct @google/genai (gemini-2.5-flash) against getCachedArticleCatalogue()
  -> lib/api/ledger.ts (finalize_api_usage on success OR refund_api_usage on failure)
  -> JSON response with X-Request-Id, X-Quota-Limit/Remaining/Reset, X-Idempotency-Replayed
```

#### C. Editorial CMS Write & Cache Revalidation Flow
```text
POST /api/cms/posts -> isSameOrigin() -> requireEditor() (Supabase session + RPC is_editor / is_editor_in_chief)
  -> rateLimit() -> readJsonBody() -> normalizePostInput() -> resolvePublishableAuthor()
  -> editorial check (publicationType === 'editorial' requires isEditorInChief; DB trigger enforces too)
  -> getCmsStore() (Supabase authenticated RLS client OR local JSON atomic rename)
  -> revalidateArticlePaths() (revalidateTag('articles') + revalidatePath for /, /post/[slug], /llms.txt, /index.md, /sitemap.xml)
```


### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| Edge Middleware (`middleware.ts`) | `Accept: text/markdown` rewrite to `/agent-markdown`; `/dashboard/:path*` session gate + login redirect; `Vary: Accept` header | Database writes, CMS mutations, API key auth | `middleware.ts` |
| App Router Pages & Layouts (`app/**/page.tsx`, `layout.tsx`) | Route-level data fetching, `generateMetadata`, JSON-LD injection, role redirects (`/dashboard/layout.tsx`, `dashboard/(studio)/layout.tsx`) | Raw SQL, secret credential handling, direct third-party HTTP mutations | `app/page.tsx`, `app/post/[slug]/page.tsx`, `app/dashboard/layout.tsx` |
| Route Handlers (`app/api/**`, `app/mcp/`, `app/.well-known/**`) | HTTP method routing, CSRF/same-origin checks, rate limits, auth guards, input decoding, HTTP error translation | Reusable domain math, persistence internals, React rendering | `app/api/cms/posts/route.ts`, `app/api/v1/assistant/answers/route.ts`, `app/mcp/route.ts` |
| Domain Stores & Services (`lib/cms/`, `lib/api/`, `lib/assistant/`, `lib/email/`, `lib/linkedin/`) | Store interfaces (`CmsStore`), schema normalization, DB/RPC wrappers, cryptographic primitives, provider integrations, caching | Next.js page JSX, browser DOM APIs (enforced by `import 'server-only'` in 14 core modules) | `lib/cms/store.ts`, `lib/api/answers.ts`, `lib/assistant/service.ts` |
| Protocol & Discovery Layer (`lib/mcp.ts`, `lib/a2a.ts`, `lib/openapi.ts`, `lib/web-bot-auth.ts`, `lib/oauth-discovery.ts`, `lib/api-catalog.ts`) | Machine-readable specifications, JSON-RPC MCP dispatch, A2A agent card & task handling, RFC 9421 Web Bot Auth directory signing, RFC 8414/9728 OAuth discovery | Direct database mutations outside injected callbacks | `lib/mcp.ts`, `lib/a2a.ts`, `lib/web-bot-auth.ts`, `lib/oauth-discovery.ts` |
| UI & Design System (`components/`, `tokens/`, `styles/`) | Accessible React components, token-driven CSS variables, DaisyUI theme mapping, visual editors (`PostEditor` / `PlateBodyEditor`), charts, motion | Server secrets, direct Supabase admin queries | `components/primitives/`, `tokens/scripts/build.mjs`, `app/globals.css` |
| Database & Security Boundary (`supabase/migrations/`) | Relational schema, Row-Level Security (RLS), `SECURITY DEFINER` RPCs with locked `search_path = ''`, triggers, Storage bucket limits | Application HTML/JSON presentation | `supabase/migrations/*.sql` |
| Secondary Mirror (`cloudflare-pages/`) | Vite SSR rendering + Pages Functions route dispatcher for a subset of routes | Separate source of truth for CMS/article types | `cloudflare-pages/src/server/dispatch.ts`, `cloudflare-pages/src/routes.tsx` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| **Adapter / Strategy (`CmsStore`)** | `lib/cms/store.ts`, `lib/cms/supabase-store.ts`, `lib/cms/local-store.ts` | Transparently switches between Supabase Postgres (production) and atomic-rename local JSON files (local dev/tests) behind one `CmsStore` interface |
| **Bridge-Secret `SECURITY DEFINER` RPC** | `supabase/migrations/20261114000200_api_keys.sql`, `lib/api/{key-store,ledger}.ts` | Executes privileged system mutations from Workers using only the anon/publishable key + an explicit bridge secret (`API_BRIDGE_SECRET`), avoiding shipping `SUPABASE_SERVICE_ROLE_KEY` |
| **Fail-Closed Production Guard** | `lib/cms/store.ts`, `scripts/check-production-env.mjs`, `lib/cms/auth.ts` | Refuses local-filesystem CMS fallback in production (`NODE_ENV === 'production'`, `CF_PAGES`, `VERCEL`, `WORKERS_CI`); enforces `is_editor()` / `is_editor_in_chief()` server-side |
| **Reserve-Execute-Finalize/Refund Ledger** | `lib/api/answers.ts`, `lib/api/ledger.ts`, `supabase/migrations/20261114000200_api_keys.sql` | Prevents double-billing and lost quota during metered Gemini API calls with 24h idempotency keys (`api_usage_events`) |
| **Sliding/Fixed Window Rate Limiting with Runtime Backend Auto-Selection** | `lib/rate-limit.ts`, `lib/rate-limit-core.ts`, `lib/api/burst.ts` | Uses Cloudflare native `API_BURST_LIMITER` or `RATE_LIMIT_KV` on Workers, falling back to an in-memory `Map` in Node dev/tests |
| **Pure-Function Metric / Protocol Separation** | `lib/dashboard/metrics.ts`, `lib/rate-limit-core.ts`, `lib/mcp.ts`, `lib/a2a.ts` | Isolates deterministic logic (injected `now`, injected callbacks) from Next.js/Cloudflare I/O for fast unit testing |
| **Cached Read-Through Catalogue with Tag Revalidation** | `lib/cms/catalogue.ts`, `lib/cms/revalidate.ts` | Wraps published article reads in `unstable_cache(..., ['articles'], { revalidate: 30, tags: ['articles'] })` and invalidates on CMS writes or `/api/revalidate` |

### 5) Known Architectural Risks

- **Broken LinkedIn automation architecture (confirmed first-class feature, editorial posts only):** `lib/linkedin/token-store.ts` and `lib/linkedin/monitoring.ts` query RLS-protected `linkedin_tokens` and `linkedin_events` using `getSupabasePublicClient()` (anon key), contradicting the repo's zero-service-role pattern because `20261115_linkedin_*.sql` grants write/read access ONLY to `service_role`. Additionally, `app/api/webhooks/article-published/route.ts` lacks signature verification, checks `table === 'articles'` instead of `'posts'`, does not filter for `publication_type = 'editorial'`, and leaves `handleArticlePublished()` unawaited (killed by Cloudflare Workers on response close).
- **Divergent dual Cloudflare deployment (`cloudflare-pages/` vs root Worker; confirmed target: OpenNext Worker only):** `cloudflare-pages/src/server/dispatch.ts` and `registry.ts` reimplement API routing separately from `app/api/` and already omit metered API v1, API keys, LinkedIn, MCP `ask_archive`, `/motion`, and the role dashboards (`/desk`, `/writing`, `/reading`, `/account`). Confirmed best-practice direction is retiring `cloudflare-pages/` in favor of the OpenNext Worker.
- **Single shared KV namespace across cache and rate limits (confirmed target: native Workers Rate Limiting bindings):** `wrangler.jsonc` maps `NEXT_INC_CACHE_KV`, `NEXT_TAG_CACHE_KV`, and `RATE_LIMIT_KV` to one namespace (`8d2dc8f0b1bb4839962ae63df8296b31`). Cache purges or write bursts from rate-limiting share the same 1,000 writes/day free-plan quota; budget-friendly best practice moves rate limiting onto native Cloudflare Rate Limiting bindings (zero KV writes).
- **Unwired RPC Worker (`workers/assistant/`; confirmed target: deploy & bind in production):** `lib/assistant/service.ts` supports offloading Gemini calls to `env.ASSISTANT`, but the service binding is commented out in `wrangler.jsonc`, so all LLM latency executes directly inside the main Next.js Worker isolate.
- **Duplicate Rich-Text Editors (confirmed target: `platejs` only):** Both `@mdxeditor/editor` (in `/dashboard/(studio)`) and `platejs` + 5 `@platejs/*` packages (in `/write`) coexist as independent editing stacks for Markdown posts; confirmed direction is removing `@mdxeditor/editor` and standardizing on `platejs`.
- **v3.4 Prisma blueprint vs active Supabase stack (confirmed active target roadmap):** Five root files (`ResearchWithME-v3.4-*`) specify an 83-model Prisma/PostgreSQL architecture confirmed by the owner as the active target roadmap, though zero Prisma runtime code exists in commit `027c746`.

### 6) Evidence

- `middleware.ts`
- `wrangler.jsonc`
- `open-next.config.ts`
- `app/layout.tsx`
- `app/agent-markdown/route.ts`
- `app/api/cms/posts/route.ts`
- `app/api/v1/assistant/answers/route.ts`
- `app/mcp/route.ts`
- `app/api/webhooks/article-published/route.ts`
- `lib/cms/store.ts`
- `lib/cms/catalogue.ts`
- `lib/cms/auth.ts`
- `lib/api/answers.ts`
- `lib/api/authenticate.ts`
- `lib/api/burst.ts`
- `lib/api/ledger.ts`
- `lib/assistant/service.ts`
- `lib/linkedin/token-store.ts`
- `lib/linkedin/automation.ts`
- `cloudflare-pages/src/server/dispatch.ts`
- `workers/assistant/src/index.ts`
- `supabase/migrations/20261120000100_retire_commerce.sql`
- `supabase/migrations/20261114000200_api_keys.sql`
- `supabase/migrations/20261116000100_editorial_publication_type.sql`

## Extended Sections (Optional)

### Async / Event Topology

```text
1. Hourly LinkedIn Batch Cron (GitHub Actions)
   .github/workflows/linkedin-automation.yml (cron: "0 * * * *")
     -> curl GET /api/cron/linkedin-batch (Bearer CRON_SECRET)
     -> lib/linkedin/automation.ts -> LinkedIn v2 UGC Posts API (broken: no posted filter + anon-key RLS conflict)

2. Article Published Webhook (Intended Supabase Database Webhook)
   Supabase Webhook -> POST /api/webhooks/article-published (NO signature verification; expects table==='articles' instead of 'posts')
                    -> unawaited handleArticlePublished() -> LinkedIn API

3. On-Demand Cache Revalidation
   CMS mutation OR POST /api/revalidate (Bearer REVALIDATE_SECRET)
     -> lib/cms/revalidate.ts -> revalidateTag('articles') + revalidatePath(...)

4. Transactional Email Dispatch
   Caller -> lib/email/send.ts -> Resend REST API (retry on 429/5xx, up to 3 attempts, 400ms/1200ms backoff)
```

### Failure-Mode & Resilience Posture

- **Catalogue / Supabase read outage:** `lib/cms/catalogue.ts` caches published articles for 30s; `getPublicCmsStore()` throws `CmsUnavailableError` (HTTP `503`) if Supabase is configured and unreachable (never silently falls back to local JSON in production).
- **Gemini AI outage / timeout:** `lib/assistant/service.ts` enforces a `25_000 ms` `AbortSignal.timeout`; metered API v1 (`lib/api/answers.ts`) automatically calls `refund_api_usage` so failed upstream Gemini calls do not consume monthly quota.
- **Cloudflare KV failure:** `lib/rate-limit.ts` catches KV read/write errors and falls back to the in-memory `Map` limiter (per-isolate, non-global) rather than crashing requests.
- **Email delivery outage:** `lib/email/send.ts` retries transient 429/5xx responses with exponential backoff (respecting `Retry-After`) and skips real sends in local dev unless `EMAIL_ALLOW_LOCAL_TEST=true`.
- **OAuth issuer discovery failure:** `lib/oauth-discovery.ts` caches issuer checks for 5 minutes (negative cache 30s) with a 3s timeout, falling back gracefully on `/.well-known/oauth-protected-resource`.
