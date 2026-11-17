# External Integrations

> Snapshot updated post-remediation on branch `arena/d0437759-researchwithme` (`2026-11-17`).

## Core Sections (Required)

### 1) Integration Inventory

| System | Type | Purpose | Auth model | Criticality | Evidence |
|--------|------|---------|------------|-------------|----------|
| **Supabase** (Postgres, Auth, Storage) | DB / Auth / Object Storage | Primary CMS (`posts`, `comments`), author directory (`profiles`), editor RBAC (`editors`), writer applications (`author_applications`), billing ledger (`billing_*`), API keys & usage (`api_keys`, `api_usage_*`), editorial LinkedIn state (`linkedin_tokens`, `linkedin_events`, `linkedin_posts`), image buckets (`blog-images`, `profile-images`), OAuth/magic-link login | Publishable/anon key + cookie SSR JWT (`@supabase/ssr`); privileged ops via `SECURITY DEFINER` RPCs + shared bridge secrets (`BILLING_BRIDGE_SECRET`, `API_BRIDGE_SECRET`, `LINKEDIN_BRIDGE_SECRET`) or `is_editor_in_chief()`; zero service-role key in runtime | **High** | `lib/supabase/{config,server,client,storage}.ts`, `lib/cms/supabase-store.ts`, `supabase/migrations/*.sql` |
| **Cloudflare Workers / KV / Native Rate Limiting** | Edge Runtime / KV / DNS | Primary OpenNext Worker (`researchwithme`) + bound isolated RPC Worker (`researchwithme-assistant` via `ASSISTANT` binding), OpenNext incremental + tag cache (`NEXT_INC_CACHE_KV`, `NEXT_TAG_CACHE_KV` only), zero-KV-write native Workers Rate Limiting bindings (`API_BURST_LIMITER` `2001`, `APP_RATE_LIMITER` `2002`), DNS-AID SVCB record publisher (`api.cloudflare.com/client/v4`). Legacy `cloudflare-pages/` mirror retired. | Worker bindings in `wrangler.jsonc`; Bearer `CLOUDFLARE_API_TOKEN` for deploys & `scripts/dns-aid-cloudflare.mjs` | **High** | `wrangler.jsonc`, `open-next.config.ts`, `lib/rate-limit.ts`, `lib/api/burst.ts`, `scripts/dns-aid-cloudflare.mjs` |
| **Google Gemini (`@google/genai`)** | LLM API (optional AI Gateway proxy) | Grounded research Q&A synthesis (`gemini-2.5-flash` default) via bound `workers/assistant/` RPC Worker (`ASSISTANT`) with in-process fallback | `GEMINI_API_KEY` (optional custom `baseUrl` via `AI_GATEWAY_BASE_URL`) | **Medium** | `lib/assistant/service.ts`, `workers/assistant/src/index.ts`, `app/api/research-assistant/route.ts` |
| **Lemon Squeezy** | Payments / MoR API + Webhooks | Hosted checkout creation (`POST https://api.lemonsqueezy.com/v1/checkouts`) and order/subscription webhooks (`POST /api/webhooks/lemonsqueezy`) for digital toolkits (`teardown` $19, `stat-tables` $5; retained pre-launch `copilot` subscription scaffolding) | Bearer `LEMONSQUEEZY_API_KEY` outbound; HMAC-SHA256 `X-Signature` (`LEMONSQUEEZY_WEBHOOK_SECRET`) inbound | **Medium** | `lib/billing/{catalogue,checkout,store}.ts`, `app/api/billing/{checkout,entitlement}/route.ts`, `app/api/webhooks/lemonsqueezy/route.ts` |
| **Resend** | Transactional Email API | Sends 5 React Email templates (`welcome`, `verify-email`, `password-reset`, `security-alert`, `support-reply`), syncs templates (`scripts/sync-templates.ts`) | Bearer `RESEND_API_KEY`; `RESEND_WEBHOOK_SECRET` for inbound webhooks | **Medium** | `lib/email/{send,scenarios,render,components}.ts`, `emails/*.tsx`, `scripts/sync-templates.ts` |
| **LinkedIn v2 API** (`linkedin.com/oauth/v2`, `api.linkedin.com/v2`) | OAuth 2.0 + Social Publishing API | Automated company-page UGC posts restricted strictly to **editorial posts** (`publication_type = 'editorial'`, `status = 'published'`), hardened with HMAC-SHA256 webhook verification, signed OAuth `state` cookie CSRF guard, `requireEditorInChief()` RBAC, per-ciphertext KDF salt (`v2:`), bridge-secret RPCs, and durable `linkedin_posts` deduplication | OAuth 2.0 (`LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`), AES-256-GCM encrypted tokens (`ENCRYPTION_SECRET`), `LINKEDIN_COMPANY_URN`, `LINKEDIN_BRIDGE_SECRET`, `LINKEDIN_WEBHOOK_SECRET` | **Medium** | `lib/linkedin/{client,token-store,automation,monitoring,article-extractor}.ts`, `app/api/admin/linkedin/*`, `app/api/webhooks/article-published/route.ts`, `app/api/cron/linkedin-batch/route.ts` |
| **GitHub Actions** | CI & Scheduled Cron | Quality workflow (`quality.yml`), PR title check (`pr-title.yml`), hourly LinkedIn batch trigger (`linkedin-automation.yml` calling `/api/cron/linkedin-batch` with `CRON_SECRET`) | GitHub secrets (`CRON_SECRET`, `PRODUCTION_URL`) | **Medium** | `.github/workflows/*.yml` |
| **External Agent & Discovery Standards** | Outbound / Inbound HTTP Protocols | MCP Streamable HTTP (`/mcp`), A2A (`/api/a2a`, `/.well-known/agent-card.json`), RFC 9421 Web Bot Auth (`/.well-known/http-message-signatures-directory`, `scripts/web-bot-fetch.ts`), RFC 8414 / 9728 OAuth discovery (`lib/oauth-discovery.ts`), Cloudflare DoH DNSSEC check (`scripts/verify-dns-aid.mjs`) | Ed25519 JWK (`WEB_BOT_AUTH_PRIVATE_JWK`), `rwm_*` Bearer keys on `/mcp` `ask_archive` & `/api/v1/*`, public discovery endpoints | **Medium** | `lib/{mcp,a2a,web-bot-auth,oauth-discovery,api-catalog,openapi}.ts`, `scripts/verify-dns-aid.mjs` |
| **Scholarly Link Targets (ORCID, GitHub, Crossref/DOI, arXiv)** | Identity Providers & Bibliographic References | ORCID & GitHub OAuth identity verification for `apply_as_author` (`auth.identities` check in Supabase); outbound links/citation metadata on article pages | Supabase Auth OAuth (`custom:orcid`, `github`) | **Low** | `supabase/migrations/20261114000100_verify_application_identity.sql`, `lib/scholarly/`, `app/post/[slug]/page.tsx` |

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| **Supabase PostgreSQL** (`public.*`) | Authoritative relational store: `posts`, `comments`, `editors`, `profiles`, `author_applications`, `billing_orders`, `billing_subscriptions`, `billing_events`, `api_keys`, `api_usage_monthly`, `api_usage_events`, `linkedin_tokens`, `linkedin_events` | `lib/supabase/{server,client}.ts`, `lib/cms/supabase-store.ts`, `lib/billing/store.ts`, `lib/api/{key-store,ledger}.ts`, `lib/linkedin/{token-store,monitoring}.ts` | 2 broken migrations (`20261113000200` inserts non-existent `editors.{role,display_name,created_at}`; `20261115_linkedin_events` references non-existent `profiles.id`); `linkedin_*` RLS requires `service_role` while app uses anon key | `supabase/migrations/*.sql` |
| **Supabase Storage** (`blog-images`, `profile-images`) | Public WebP/JPEG media storage (`blog-images` 512 KB cap, editor-write; `profile-images` 100 KB cap, owner-write) | `lib/supabase/storage.ts`, `components/cms/MarkdownEditor.tsx`, `app/write/page.tsx` | Public buckets rely strictly on Storage RLS policies applied in migrations `20261028000200`, `20261113000100`, `20261113000200` | `lib/supabase/storage.ts`, `supabase/migrations/20261113000200_reconcile_after_cleanup.sql` |
| **Cloudflare KV** (1 shared namespace `8d2dc8f0b1bb4839962ae63df8296b31`) | Bound simultaneously as `NEXT_INC_CACHE_KV`, `NEXT_TAG_CACHE_KV`, and `RATE_LIMIT_KV` (also used by `cloudflare-pages/`) | `@opennextjs/cloudflare` (`open-next.config.ts`), `lib/rate-limit.ts`, `cloudflare-pages/src/server/dispatch.ts` | Free-plan 1,000 writes/day limit shared across ISR cache writes, tag cache, and IP rate limits; key exhaustion causes silent fallback to per-isolate memory | `wrangler.jsonc`, `cloudflare-pages/wrangler.jsonc`, `lib/rate-limit.ts` |
| **Cloudflare Rate Limiting Binding** (`API_BURST_LIMITER`) | Per-API-key burst cap (`30` requests / `60s`, `namespace_id: "2001"`) | `lib/api/burst.ts` | Falls back to KV/memory limiter when binding unavailable (e.g., local dev) | `wrangler.jsonc`, `lib/api/burst.ts` |
| **Local JSON Filesystem** (`RWM_DATA_DIR/cms-{posts,comments}.json`, `billing-*.json`) | Development/demo/test fallback when Supabase is unset and local mode is permitted | `lib/cms/local-store.ts`, `lib/billing/store.ts` | Explicitly blocked in production (`NODE_ENV === 'production'`, `CF_PAGES`, `VERCEL`, `WORKERS_CI`); atomic temp-file rename used locally | `lib/cms/store.ts`, `lib/cms/local-store.ts` |
| **Browser `localStorage`** | Reader preferences (Zustand `preferences-store`), writer draft autosave (`rwm_writer_draft`), saved bookmarks/reading state | `lib/stores/preferences-store.ts`, `lib/storage.ts`, `app/write/page.tsx` | Client-only; lost across devices/cleared storage | `lib/stores/preferences-store.ts`, `app/write/page.tsx` |

### 3) Secrets and Credentials Handling

- **Credential sources:** Environment variables (`process.env.*`) and Cloudflare Worker secrets/bindings (`getCloudflareContext().env` via `@opennextjs/cloudflare`), configured in `.env.example` (partial) and `.env.production` (public vars only).
- **Hardcoding checks:**
  - **No secret keys** (`GEMINI_API_KEY`, `RESEND_API_KEY`, `LEMONSQUEEZY_API_KEY`, `BILLING_BRIDGE_SECRET`, `API_BRIDGE_SECRET`, `WEB_BOT_AUTH_PRIVATE_JWK`, `ENCRYPTION_SECRET`, `CRON_SECRET`, `LINKEDIN_CLIENT_SECRET`) are committed in source files.
  - **Live Supabase project reference hardcoded:** `bxyjjbclaklzjxeumeat` (plus publishable key `sb_publishable_q60_37x_6B7c9U6R6z8fRA_4o2o5kS4`) is committed in `.env.production`, `lib/oauth-metadata.ts`, and `.mcp.json`.
  - **Fixed KDF salt:** `lib/crypto.ts` derives AES-256-GCM keys via `scryptSync(secret, 'researchwithme-linkedin-salt', 32)` using a static hardcoded salt.
  - **9 runtime env vars missing from `.env.example`:** `API_BRIDGE_SECRET`, `API_FREE_MONTHLY_REQUESTS`, `AI_GATEWAY_BASE_URL`, `ENCRYPTION_SECRET`, `CRON_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`, `LINKEDIN_COMPANY_URN`.
- **Rotation / lifecycle notes:** `[TODO]` Secret rotation cadence, Cloudflare secret deployment automation, and Lemon Squeezy / Supabase webhook secret rotation procedures are not documented in the repository.

### 4) Reliability and Failure Behavior

- **Retry / backoff behavior:**
  - *Resend (`lib/email/send.ts`):* Retries HTTP `429` and `5xx` up to 3 attempts (`400ms` / `1200ms` backoff, respecting `Retry-After`).
  - *LinkedIn (`lib/linkedin/retry.ts`):* Implements exponential backoff helper (`withRetry`, up to 3 attempts, 1s base delay, jitter, retryable HTTP 429/5xx) and circuit breaker (`CircuitBreaker`), used in `lib/linkedin/automation.ts`.
  - *Gemini / Lemon Squeezy / Supabase / Cloudflare DNS:* No automatic client-side retry loop; callers handle errors explicitly (API v1 refunds reserved quota on Gemini failure via `lib/api/ledger.ts`).
- **Timeout policy:**
  - *Gemini (`lib/assistant/service.ts` & `workers/assistant/src/index.ts`):* `25_000 ms` `AbortSignal.timeout`.
  - *OAuth discovery (`lib/oauth-discovery.ts`):* `3_000 ms` `AbortSignal.timeout`, with 5-minute positive cache and 30-second negative cache.
  - *Lemon Squeezy / LinkedIn / Resend / Supabase:* Rely on platform default fetch timeouts (`[TODO]` confirm Cloudflare Worker subrequest timeout expectations).
- **Fallback behavior:**
  - *Assistant Worker binding (`lib/assistant/service.ts`):* Automatically falls back from `env.ASSISTANT` RPC to direct `@google/genai` SDK call when the binding is absent (current production state since binding is commented out in `wrangler.jsonc`).
  - *Rate limiter (`lib/rate-limit.ts`):* Falls back from `RATE_LIMIT_KV` to in-memory `Map` on KV errors.
  - *CMS store (`lib/cms/store.ts`):* Fails closed with HTTP `503` in production if Supabase is misconfigured/unreachable; local JSON fallback is strictly dev/test only.

### 5) Observability for Integrations

- **Logging around external calls:** `console.error` / `console.warn` / `console.log` in route handlers and integration wrappers (`lib/email/send.ts`, `lib/cms/supabase-store.ts`, `lib/linkedin/monitoring.ts`, `app/api/webhooks/lemonsqueezy/route.ts`).
- **Database audit tables:**
  - `public.billing_events` records idempotent Lemon Squeezy webhook processing (`supabase/migrations/20261113000300_billing.sql`).
  - `public.api_usage_events` & `public.api_usage_monthly` track metered API v1 requests, status (`reserved`/`succeeded`/`refunded`), and idempotency keys (`20261114000200_api_keys.sql`).
  - `public.linkedin_events` intended to log LinkedIn API outcomes (`20261115_linkedin_events.sql`, currently blocked by RLS mismatch).
- **Metrics / tracing coverage:** None configured (no OpenTelemetry, Sentry, Datadog, or Cloudflare Analytics Engine binding in `wrangler.jsonc`).
- **Missing visibility gaps:**
  - No structured JSON logging or request correlation propagation outside API v1 `X-Request-Id`.
  - No alerting on Cloudflare KV daily write quota saturation (`1,000 writes/day`).
  - No dead-letter queue for failed Resend sends or LinkedIn webhook/cron runs.
  - No health-check endpoint reporting downstream connectivity (Supabase, Gemini, KV, Lemon Squeezy).

### 6) Evidence

- `wrangler.jsonc`
- `cloudflare-pages/wrangler.jsonc`
- `workers/assistant/wrangler.jsonc`
- `.env.example`
- `.env.production`
- `.mcp.json`
- `lib/supabase/{config,server,client,storage}.ts`
- `lib/assistant/service.ts`
- `lib/billing/{catalogue,checkout,store}.ts`
- `lib/api/{authenticate,burst,key-store,keys,ledger,answers}.ts`
- `lib/email/{send,scenarios,render,components}.ts`
- `lib/linkedin/{client,token-store,automation,monitoring,retry}.ts`
- `lib/crypto.ts`
- `lib/rate-limit.ts`
- `lib/oauth-discovery.ts`
- `lib/oauth-metadata.ts`
- `lib/web-bot-auth.ts`
- `scripts/dns-aid-cloudflare.mjs`
- `scripts/verify-dns-aid.mjs`
- `scripts/sync-templates.ts`
- `.github/workflows/linkedin-automation.yml`
- `supabase/migrations/*.sql`

## Extended Sections (Optional)

### Outbound External Endpoint Catalog

| Integration | Endpoint(s) Called | Source File |
|-------------|--------------------|-------------|
| Supabase Auth / PostgREST / Storage | `${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/*`, `/rest/v1/*`, `/storage/v1/*`, `/.well-known/oauth-authorization-server` | `lib/supabase/server.ts`, `lib/oauth-discovery.ts` |
| Google Gemini (or AI Gateway) | `@google/genai` SDK (`models.generateContent`, optional `AI_GATEWAY_BASE_URL`) | `lib/assistant/service.ts`, `workers/assistant/src/index.ts` |
| Lemon Squeezy | `POST https://api.lemonsqueezy.com/v1/checkouts` | `lib/billing/checkout.ts` |
| Resend | `resend.emails.send(...)`, `resend.templates.*` | `lib/email/send.ts`, `scripts/sync-templates.ts` |
| LinkedIn | `https://www.linkedin.com/oauth/v2/authorization`, `POST https://www.linkedin.com/oauth/v2/accessToken`, `POST https://api.linkedin.com/v2/ugcPosts`, `GET https://api.linkedin.com/v2/me` | `lib/linkedin/client.ts`, `app/api/admin/linkedin/{auth,callback}/route.ts` |
| Cloudflare API & DoH | `https://api.cloudflare.com/client/v4/zones/*`, `https://cloudflare-dns.com/dns-query` | `scripts/dns-aid-cloudflare.mjs`, `scripts/verify-dns-aid.mjs` |
