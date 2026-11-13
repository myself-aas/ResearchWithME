# External Integrations

> Regenerated 2026-11-13 against `944f45c`. Supersedes the earlier version and its appendices.

## Core Sections (Required)

### 1) Integration Inventory

| System | Type | Purpose | Auth model | Criticality | Evidence |
|--------|------|---------|------------|-------------|----------|
| Supabase Postgres | DB via `@supabase/supabase-js` (PostgREST + RPC) | Posts, comments, editors, profiles, writer applications, legacy counters | Publishable key + RLS; session cookie for editors; **no service-role key in the app** | High | `lib/cms/supabase-store.ts`, `lib/legacy/supabase-store.ts`, `supabase/migrations/` |
| Supabase Auth | IdP (PKCE, `@supabase/ssr`) | Sign-in: email/password, Google. Identity links: GitHub (`read:user user:email`), ORCID (`custom:orcid`, `openid`) | Cookie session, refreshed in `middleware.ts` | High | `lib/supabase/oauth.ts:7-22`, `app/auth/callback/route.ts` |
| Supabase Storage | Object store | `blog-images` public bucket, 5 MB, jpeg/png/webp/avif/gif | Editor-only write policy | Med | `lib/supabase/storage.ts:5-6`, `supabase/migrations/20261028000200_cms_storage.sql` |
| Supabase Realtime | WebSocket | Live studio lists and article comment threads | Publishable key | Low | `lib/cms/use-cms.ts:41`, `components/ArticleDiscussion.tsx:63` |
| Google Gemini | LLM (`@google/genai`) | Research assistant (public, rate-limited); avatar SVG (editor + `forceAi` only) | `GEMINI_API_KEY` Worker secret | Low (deterministic fallback) | `app/api/research-assistant/route.ts:145`, `app/api/author-avatar/route.ts:145` |
| Hugging Face Space | Gradio (`@gradio/client`) | Cover image generation (`/api/generate`, editor-only) | `HF_SPACE_NAME` + `HF_TOKEN` Worker secrets only | Low | `app/api/generate/route.ts` |
| Resend | Email API | 6 scenarios (welcome, verify-email, password-reset, security-alert, billing-receipt, support-reply), optional hosted templates via `RESEND_TPL_*` | `RESEND_API_KEY`; sends are skipped without it | **Not wired in production.** No `app/` route imports `lib/email`. Only `scripts/sync-templates.ts`, `scripts/verify-emails.ts` and the Pages target's `RuntimeServices` reference it | `lib/email/send.ts:95`, `lib/email/scenarios.ts` |
| Cloudflare Workers | Host | Production runtime (`researchwithme`, apex + `www` custom domains) | `account_id` in `wrangler.jsonc` | High | `wrangler.jsonc` |
| Cloudflare KV | KV | ISR incremental cache, tag cache, rate-limit counters (one namespace, three bindings) | Wrangler bindings | High | `wrangler.jsonc`, `open-next.config.ts`, `lib/rate-limit.ts` |
| Worker self-reference | Service binding | OpenNext memory queue re-renders stale pages | `WORKER_SELF_REFERENCE` (not in previews) | Med | `wrangler.jsonc` `services` |
| Supabase webhook → `/api/revalidate` | Inbound webhook | Cache eviction after out-of-band DB writes | `x-revalidate-secret` header, timing-safe compare; `?secret=` also accepted | Low | `app/api/revalidate/route.ts:19-39`, `lib/cms/secret*.ts` |
| Browser `localStorage` | Client storage | Reading list, digest prefs (zustand `persist`), theme | none | Low | `lib/stores/preferences-store.ts`, `lib/storage.ts` |

There is no API gateway, message bus, APM agent or analytics SDK. The browser never calls Gemini, Hugging Face or Resend directly. Every server-credential call goes through an app route. The app also *publishes* discovery endpoints: `/.well-known/api-catalog` (RFC 9727), `/openapi.json`, `/api-docs`, `/llms.txt`, `/index.md`.

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| `public.posts`, `public.comments` | CMS content (comments are append-only) | `lib/cms/supabase-store.ts` | RLS is the only authorisation boundary | `20261025000100_cms_schema.sql` |
| `public.editors` | Studio allowlist; read by `public.is_editor()` | RPC from `lib/cms/auth.ts` | `is_editor()` errors fail closed | `20261028000100_editor_allowlist.sql`, `20261108000100_consolidate_editor_allowlist.sql` |
| `public.author_applications` | Writer applications; `apply_as_author` / `review_author_application` RPCs | `app/api/dashboard/applications/*` | Approval writes `editors` | `20261108000300_author_applications.sql` |
| `public.profiles` | Public author directory; bylines resolve from *published* profiles only | `lib/cms/authors.ts`, `lib/author-directory.ts` | `orcid`/`github` columns are self-declared | `20261108000400_author_profiles.sql`, `…000500_restrict_profile_writes.sql` |
| `public.legacy_articles`, `public.legacy_comments` | Durable likes/comments for seed articles | `lib/legacy/supabase-store.ts` | — | `20261110000100_legacy_interactions.sql` |
| Storage `blog-images` | Cover images | `lib/supabase/storage.ts` | Public-read by design | migration above |
| KV `8d2dc8f0…` | Page cache, tags, rate limits | OpenNext; `lib/rate-limit.ts` | Eventually consistent (~60 s); shared 1,000 writes/day incl. previews | `open-next.config.ts` comment |
| `data/*.json` (+ gitignored `cms-*.json`) | Local/demo mode only | `lib/db.ts`, `lib/cms/local-store.ts`, `lib/legacy/local-store.ts` | Can't persist on the Worker FS | `README.md` |

### 3) Secrets and Credentials Handling

- **Sources:** environment only. Server secrets are Worker secrets (`wrangler secret put`). `NEXT_PUBLIC_*` are build inputs. `.env.example` lists 20 names, including `RATE_LIMIT_KV`, which is actually a binding.
- **Committed public values:** `.env.production` holds only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. This is intentional: the publishable key is browser-safe under RLS.
- **Committed identifiers (not secrets):** Cloudflare `account_id` and KV namespace id in `wrangler.jsonc`.
- **Hard-coding:** `git grep` for `service_role|sb_secret|sk-|AIza|hf_[A-Za-z]` over source finds no live secrets. HF credentials can no longer come from the browser (`customToken` was removed).
- **Rotation/lifecycle:** `[TODO]`. `docs/deployment.md` lists every credential and where it lives, but no rotation procedure exists in the repo.

### 4) Reliability and Failure Behavior

- **Timeouts:** Gemini calls use `AbortSignal.timeout(MODEL_TIMEOUT_MS)`. The HF Space call uses a 60 s `withTimeout()` race that rejects but doesn't cancel the Gradio call. Supabase calls have no explicit timeout.
- **Retries / circuit breakers:** none. `Retry-After` is only *sent* on 429s.
- **Fallbacks:** CMS read failure → empty, legacy failure → bundled seeds, Gemini failure → deterministic cited answer, avatar → deterministic SVG, email without key → `skipped`. `/api/generate` → generic 502.
- **Rate limits** (per client key per 60 s): `cms:create` 20, `cms:update` 40, `cms:delete` 20, `cms:comment-delete` 30, `comments` 8, `likes` 30, `assistant` 12, `author-avatar` 6, `generate` 10, `author:apply` 5, `author:review` 30, `revalidate` 60. KV-backed in production (fails open on KV read error), memory locally.
- **Client key:** in the production Next build, the first `x-forwarded-for` entry, then `x-real-ip` (`lib/rate-limit.ts` `clientKey`). The Pages build prefers `cf-connecting-ip` (`cloudflare-pages/src/server/http.ts:17`). See CONCERNS.
- **CSRF:** `isSameOrigin()` on studio/application/comment writes and `/api/generate`. Not applied to `/api/research-assistant` or the likes `PATCH /api/articles/[id]`.

### 5) Observability for Integrations

- `wrangler.jsonc` enables Workers observability: logs, invocation logs, traces, and issues, at 100% sampling with persistence.
- The app logs with `console.error/warn` only. It emits no metrics, latency timing or request IDs, and doesn't log rate-limit rejections.
- `observability.redact_query_string: false`, while `/api/revalidate` still reads `?secret=`. A webhook configured with a query-string secret would write that secret to Cloudflare logs.
- No alerting config is in the repository. `[TODO]`

### 6) Evidence

- `lib/supabase/{config,server,client,oauth,storage}.ts`, `lib/cms/supabase-store.ts`, `lib/legacy/supabase-store.ts`
- `supabase/migrations/*.sql` (tables and RPCs above: `git grep "create table if not exists public."`)
- `app/api/{research-assistant,author-avatar,generate,revalidate}/route.ts`
- `lib/email/{send,scenarios}.ts`, `emails/*.tsx`, `git grep -l lib/email` (no `app/` hits)
- `wrangler.jsonc`, `open-next.config.ts`, `lib/rate-limit{,-core}.ts`, `cloudflare-pages/src/server/http.ts`
- `.env.example`, `.env.production`, `docs/deployment.md`

## Extended Sections

### Own API surface (Next build, production)

| Endpoint | Methods | Guard | Rate limit |
|---|---|---|---|
| `/api/articles` | GET | — | — |
| `/api/articles/[id]` | GET, PATCH (like) | — | PATCH: `likes` 30 |
| `/api/authors`, `/api/authors/[id]` | GET | — | — |
| `/api/papers`, `/api/papers/[slug]` | GET | — | — |
| `/api/comments` | GET, POST | origin | POST: 8 |
| `/api/research-assistant` | POST | — | 12 |
| `/api/author-avatar` | POST | Gemini only for editors with `forceAi` | 6 |
| `/api/generate` | GET, POST | origin + `requireEditor` | 10 |
| `/api/cms/posts` | GET, POST | `requireEditor` (+ origin on POST) | POST: 20 |
| `/api/cms/posts/[id]` | GET, PATCH, DELETE | `requireEditor` (+ origin on PATCH/DELETE) | PATCH 40 / DELETE 20 |
| `/api/cms/comments` | GET | `requireEditor` | — |
| `/api/cms/comments/[id]` | DELETE | `requireEditor` + origin | 30 |
| `/api/dashboard/applications` | GET, POST | session + origin | 5 |
| `/api/dashboard/applications/[id]` | POST | `requireEditor` + origin | 30 |
| `/api/revalidate` | POST | shared secret | 60 |

`/auth/callback` exchanges the PKCE code and sanitises `next` with `safeNextPath()` (`lib/safe-redirect.ts`).
