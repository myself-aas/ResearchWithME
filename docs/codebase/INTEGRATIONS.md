# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type | Purpose | Auth model | Criticality | Evidence |
|--------|------|---------|------------|-------------|----------|
| **Supabase — Postgres** | Database (via `@supabase/supabase-js` PostgREST) | CMS posts, comments, editor allowlist | Publishable/anon key + RLS; session cookie for editors | **High** — production CMS | `lib/cms/supabase-store.ts`, `supabase/migrations/20261025000100_cms_schema.sql` |
| **Supabase — Auth** | Identity provider | Editor sign-in: email/password, magic link, Google, GitHub, ORCID (custom OIDC) | PKCE via `@supabase/ssr`; cookie-backed session | **High** — gates the studio | `middleware.ts`, `app/auth/callback/route.ts`, `lib/supabase/oauth.ts` |
| **Supabase — Storage** | Object storage | `blog-images` public bucket for article covers | Browser upload with editor-only RLS policy; 5 MB / 5 MIME types | Med | `lib/supabase/storage.ts`, `supabase/migrations/20261025000200_cms_storage.sql` |
| **Supabase — Realtime** | WebSocket (logical replication) | Live refresh of the studio and article comments | Publishable key; channels | Low — progressive enhancement | `lib/cms/use-cms.ts:41-43`, `components/ArticleDiscussion.tsx:63-65` |
| **Google Gemini** | LLM API (`@google/genai`) | Research-assistant answers; author avatar SVG generation | `GEMINI_API_KEY` env (server only) | Low — has a deterministic fallback | `app/api/research-assistant/route.ts:144`, `app/api/author-avatar/route.ts:4` |
| **Hugging Face Space** | Inference endpoint (`@gradio/client`) | Qwen 2.1 AVIF cover-image generation, endpoint `/generate_avif` | `HF_TOKEN` env **or** an operator-supplied token in the request body | Low | `app/api/generate/route.ts:2,57-60` |
| **Cloudflare KV** | Key-value cache | OpenNext incremental cache + tag cache (one namespace, two bindings) | Wrangler binding `NEXT_INC_CACHE_KV` / `NEXT_TAG_CACHE_KV` | **High** — serves cached pages | `open-next.config.ts`, `wrangler.jsonc` |
| **Cloudflare Workers** | Runtime/host | Production server for the whole app | `account_id` + `routes` custom domains | **High** | `wrangler.jsonc` |
| **Cloudflare Worker self-reference** | Service binding | OpenNext's memory queue re-renders stale pages | `WORKER_SELF_REFERENCE` service binding (production only) | Med | `wrangler.jsonc` `services`, `open-next.config.ts` |
| **Supabase Database Webhook → `/api/revalidate`** | Inbound webhook | Cache eviction after out-of-band DB writes | `x-revalidate-secret` header, timing-safe compare | Low — optional | `app/api/revalidate/route.ts:19-21`, `lib/cms/secret.ts` |
| **`localStorage`** | Browser storage | Reading list, liked posts, newsletter preference, saved HF space/token | None (same-origin browser) | Low | `lib/storage.ts`, `components/cms/QwenCoverGenerator.tsx:82-83` |

**API gateway / service mesh / proxy:** there is no gateway or mesh. The app is itself the only proxy — the browser never calls Gemini or Hugging Face directly; both are reached through the app's own `/api/author-avatar` and `/api/generate` handlers, which is what keeps `GEMINI_API_KEY` and `HF_TOKEN` server-side. Cloudflare is the edge in front of the Worker (`wrangler.jsonc` `routes`).

There is **no** message queue, event bus, APM agent, or third-party analytics. The only queue is OpenNext's in-memory queue backed by the Worker self-reference (`open-next.config.ts:5`).

Outbound call sites total 3 external ones: `ai.models.generateContent` (×2 routes) and `Client.connect` + `client.predict` (×1 route). Every other `fetch(` in the codebase targets the app's own `/api/*` routes (verified across `app/`, `components/`, `lib/`).

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| Supabase Postgres (`public.posts`, `public.comments`, `public.editors`, `public.editor_memberships`) | System of record for CMS content | `lib/cms/supabase-store.ts` only | RLS is the sole authorization boundary; there is no service-role escape hatch | `supabase/migrations/*.sql`, `lib/cms/supabase-store.ts` |
| Supabase Storage `blog-images` | Public article cover images | `lib/supabase/storage.ts` (browser client) | Bucket is public-read by design; objects are permanent unless deleted | `supabase/migrations/20261025000200_cms_storage.sql` |
| Cloudflare KV `researchwithme-opennext-cache` | Rendered-page cache and revalidation tags | OpenNext runtime (`open-next.config.ts`) | Eventually consistent — a revalidation can take ~60 s; shared 1,000 writes/day with Worker Previews | `open-next.config.ts:8-14`, `wrangler.jsonc` comments |
| `data/articles.json`, `data/comments.json` | Legacy seed/runtime catalogue | `lib/db.ts` | Two competing article write paths; `data/articles.json` is committed but `saveArticles()` rewrites it | `lib/db.ts:6-8`, `.gitignore` |
| `data/cms-posts.json`, `data/cms-comments.json` | Demo-mode CMS archive | `lib/cms/local-store.ts` | Git-ignored; **cannot persist on the Worker's read-only filesystem** | `.gitignore`, `README.md` |
| `data/submissions.json` | Manuscript submissions, capped at 500 records | `lib/submissions.ts:19-20` | Same Worker-filesystem problem; silently capped, oldest dropped | `lib/submissions.ts:87` |
| Browser `localStorage` | Reader preferences + saved HF credentials | `lib/storage.ts`, `components/cms/QwenCoverGenerator.tsx` | No expiry, no size cap on the HF entries; readable by any script on the origin | `lib/storage.ts:50-57` (`readStringArray` caps at 500) |

### 3) Secrets and Credentials Handling

- **Credential sources:** environment variables only. `.env.example` documents 7; the code reads 14 distinct names (full list in [STACK.md](./STACK.md) §5). Production server-only values are Cloudflare Worker **secrets**; `NEXT_PUBLIC_*` values are build inputs.
- **Committed public values:** `.env.production` ships `NEXT_PUBLIC_SUPABASE_URL=https://bxyjjbclaklzjxeumeat.supabase.co` and a `sb_publishable_…` key. This is **intentional and safe by design** — publishable keys are meant for the browser and every table is RLS-protected. The file's own header says: *"Do not add service-role keys, provider secrets, or other secrets to this file."*
- **Hardcoding checks:** clean. A scan for `service_role`, `sb_secret`, `SUPABASE_SERVICE`, `sk-…`, `AIza…`, and `hf_…` across `app/ lib/ components/ scripts/ supabase/ docs/ .env* wrangler.jsonc` found only: a `placeholder="hf_xxxx…"` string in `components/cms/QwenCoverGenerator.tsx:258`, a `grant all … to service_role` SQL statement in `supabase/migrations/20261025000300_cms_storage.sql:11`, and a prose line in `docs/deployment.md:240`. **No live secret material is committed.**
- **Infrastructure identifiers are committed in plaintext:** Cloudflare `account_id` (`74d241df…`) and the KV namespace id (`8d2dc8f0…`) in `wrangler.jsonc`. These are not secrets but they do identify the account.
- **One secret does reach the browser:** an operator may paste a Hugging Face user access token into the cover generator, which persists it to `localStorage` under `rwm_hf_token` (`components/cms/QwenCoverGenerator.tsx:173`) and sends it in the request body as `customToken` (line 137). `localStorage` has no expiry and is readable by any script running on the origin.
- **Rotation / lifecycle:** `[TODO]` — no rotation procedure is documented for any credential. `docs/deployment.md` §4 is a complete credential inventory with where each value comes from and where it is stored, but does not describe rotation cadence or revocation.

### 4) Reliability and Failure Behavior

- **Retry/backoff behavior:** **none.** No retry loop exists on any outbound call. The only `retry` strings in the codebase are `Retry-After` headers the app *sends* on 429.
- **Timeout policy:** **not configured anywhere.** `grep -rn "AbortSignal\|AbortController\|signal:\|timeout" app/api lib` returns nothing outside tests. Outbound calls rely on the platform's own limits.
- **Circuit-breaker:** none.
- **Fallback behavior:** present and deliberate on the read paths —
  - Supabase read fails → empty result, page renders from the bundled catalogue (`lib/cms/read.ts`).
  - Gemini missing/failing → deterministic catalogue-grounded answer plus a `notice` field (`app/api/research-assistant/route.ts:152-160`).
  - Gemini avatar fails → a locally generated domain-themed SVG (`app/api/author-avatar/route.ts:88-119`).
  - Local JSON unwritable → 503 with an actionable message (`lib/cms/local-store.ts:38-40`, `lib/submissions.ts:93-97`).
  - `/api/generate` has **no** fallback: a Space failure returns 500.
- **Rate limiting:** in-memory per-isolate, applied to 9 of 18 routes. Per-scope limits per 60 s window: `cms:create` 20, `cms:update` 40, `cms:delete` 20, `cms:comment-delete` 30, `comments` 8, `articles` 10, `likes` 30, `assistant` 12, `revalidate` 60 (`lib/rate-limit.ts`, call sites via grep).
- **CSRF posture:** writes check `isSameOrigin()` (`lib/cms/http.ts:6-28`), which allows requests with **no** `Origin` header (for non-browser clients) and matches against `Host` plus `NEXT_PUBLIC_SITE_URL`. Applied on `POST /api/cms/posts`, `POST /api/comments`, and the other CMS write routes.

### 5) Observability for Integrations

- **Logging around external calls:** yes, but minimal and unstructured. `console.error`/`console.warn` at 19 sites; the assistant logs only `error.message` rather than the error object (`app/api/research-assistant/route.ts:153`); `/api/generate` logs the full error object (`app/api/generate/route.ts:106`).
- **Metrics/tracing coverage:** Cloudflare-level only. `wrangler.jsonc` enables `observability` with `head_sampling_rate: 1`, invocation logs, persisted traces, and issue detection. There is **no application-level metrics emission** (no counters, histograms, or custom log fields).
- **Missing visibility gaps:**
  - No latency or error-rate instrumentation around Gemini, the HF Space, or Supabase calls.
  - No request IDs or correlation IDs, so a reader report cannot be tied to a log line.
  - Rate-limiter rejections are returned to the client but not logged, so abuse is invisible server-side.
  - `observability.redact_query_string: false` persists query strings; `/api/revalidate` accepts `?secret=` as a fallback, so a webhook configured that way would write its secret into Cloudflare logs (`app/api/revalidate/route.ts:41`).
  - No alerting configuration is present in the repository.

### 6) Evidence

- `lib/supabase/config.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts` — credential handling and client strategy
- `lib/cms/supabase-store.ts` — the only Postgres access layer
- `lib/supabase/storage.ts`, `lib/supabase/oauth.ts` — Storage upload limits and provider/scopes map
- `supabase/migrations/20261025000100_cms_schema.sql`, `…000200_cms_storage.sql`, `…000300_cms_storage.sql`, `…20261028000100_editor_allowlist.sql` — schema, RLS, storage policies, allowlist RPC
- `app/api/research-assistant/route.ts`, `app/api/author-avatar/route.ts`, `app/api/generate/route.ts` — the three external API clients
- `open-next.config.ts`, `wrangler.jsonc` — KV cache, service binding, observability config
- `.env.example`, `.env.production` — env template and committed public values
- `docs/deployment.md` §4 — credential inventory; `docs/supabase-cms.md` — security model
- `docs/codebase/.codebase-scan.txt` — ENVIRONMENT VARIABLE TEMPLATES section

## Extended Sections

### Endpoint-by-endpoint catalog (own API surface)

| Endpoint | Methods | Auth | Rate limit | `runtime` | `dynamic` |
|---|---|---|---|---|---|
| `/api/articles` | GET, POST | none | POST: 10/min | `nodejs` | — |
| `/api/articles/[id]` | PATCH | none | 30/min | `nodejs` | `force-dynamic` |
| `/api/auth/session` | GET, POST, DELETE | none (sets own cookie) | none | — | — |
| `/api/auth/verify-institutional` | POST | none | none | — | — |
| `/api/author-avatar` | POST | none | none | — | — |
| `/api/authors`, `/api/authors/[id]` | GET | none | none | — | — |
| `/api/cms/posts` | GET, POST | `requireEditor` | POST: 20/min | `nodejs` | `force-dynamic` |
| `/api/cms/posts/[id]` | PATCH, DELETE | `requireEditor` | 40 / 20 per min | `nodejs` | `force-dynamic` |
| `/api/cms/comments` | GET only | `requireEditor` | none | `nodejs` | `force-dynamic` |
| `/api/cms/comments/[id]` | DELETE | `requireEditor` | 30/min | `nodejs` | `force-dynamic` |
| `/api/comments` | GET, POST | origin check | POST: 8/min | `nodejs` | `force-dynamic` |
| `/api/generate` | GET, POST | **none** | **none** | — | — |
| `/api/papers`, `/api/papers/[slug]` | GET | none | none | — | `force-dynamic` |
| `/api/research-assistant` | POST | none | 12/min | `nodejs` | `force-dynamic` |
| `/api/revalidate` | POST | shared secret | 60/min | `nodejs` | `force-dynamic` |
| `/api/submissions` | POST | none | **none** | `nodejs` | `force-dynamic` |
| `/auth/callback` | GET | PKCE code | n/a | — | `force-dynamic` |

Robots excludes `/api/`, `/dashboard`, `/login` from crawling (`app/robots.ts:8`).

### Auth flow (Supabase PKCE)

`startOAuthSignIn(provider, next)` → `signInWithOAuth({ skipBrowserRedirect: true })` → `window.location.assign(data.url)` (same-tab, so the PKCE verifier and session share a browser context) → provider → `/auth/callback?code=…&next=…` → `safeNextPath()` sanitises `next` → `exchangeCodeForSession(code)` → redirect. Any failure redirects back to `/login?error_description=…` with `Cache-Control: no-store`. Providers map as `google`→`google`, `github`→`github`, `orcid`→`custom:orcid` with scopes `openid email profile`, `read:user user:email`, `openid` respectively (`lib/supabase/oauth.ts:9-20`).

Signing in grants **reader** access only; studio access requires a row in `public.editors`, checked by the `public.is_editor()` SECURITY DEFINER RPC (`supabase/migrations/20261028000100_editor_allowlist.sql`, `lib/cms/auth.ts:56`).

---

## Updated 2026-11-08

Corrections to the table and notes above:

- **Rate limiting is no longer per-isolate.** `lib/rate-limit.ts` takes a
  pluggable store; `RATE_LIMIT_KV` is bound in `wrangler.jsonc` and used when
  present, giving counters shared across isolates that survive eviction. Keys
  are namespaced `rl:` and written with a TTL, so there is no sweeper. The
  memory store is the local-dev fallback and evicts one key at a time rather
  than clearing every client. Limits are unchanged, plus `submissions` 5/min
  and `generate` 10/min, which were previously unlimited.
- **Hugging Face credentials are environment-only.** The operator-supplied space
  name and token were removed from `QwenCoverGenerator`; `customSpaceName` and
  `customToken` no longer exist. Nothing is written to `localStorage` for this
  integration any more.
- **`/api/author-avatar` is editor-gated for model output.** Anonymous callers
  receive the deterministic SVG without a Gemini call.
- **`public.editor_memberships` no longer exists** in the Supabase schema; the
  only allowlist table is `public.editors`.
- **GitHub Actions `Deploy` is on `main`** at `.github/workflows/deploy.yml`:
  a preview version per pull request, production after `Quality` passes. It
  requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as Actions
  secrets, and Workers Builds must be turned off to avoid double deploys.
- **`/api/submissions`** now enforces a same-origin check and a rate limit.
