# Architecture

## Core Sections (Required)

### 1) Architectural Style

- **Primary style:** Next.js App Router with a **server/client split over an adapter (strategy) data layer**. Routes are feature-grouped under `app/`; the CMS is isolated behind a `CmsStore` interface with two interchangeable implementations.
- **Why this classification:** `lib/cms/types.ts:73-90` defines a `CmsStore` interface with 13 methods; `lib/cms/local-store.ts` (`kind: 'local'`) and `lib/cms/supabase-store.ts` (`kind: 'supabase'`) implement it; `lib/cms/store.ts` selects between them at runtime based on `isSupabaseConfigured`. Nothing above that layer knows which backend is live. This is not Clean/Hexagonal architecture — there are no `domain/` or `data/` directories, and `app/api/**/route.ts` files contain HTTP *and* orchestration logic directly.
- **Primary constraints shaping the design:**
  1. **Dual-mode operation.** The app must run with zero cloud credentials for review, and with Supabase in production. Every data path forks on `isSupabaseConfigured` (`lib/supabase/config.ts:32`).
  2. **Cloudflare Worker target.** No persistent writable filesystem, no long-lived process, no Images binding. This is why caching goes through KV (`open-next.config.ts`) and why the JSON fallback is documented as demo-only.
  3. **One canonical reader surface.** Published CMS rows are merged into the same URLs as the bundled catalogue rather than exposed at a separate `/blog` (`lib/cms/catalogue.ts`, `README.md` "Editorial CMS").

### 2) System Flow

**Flow A — public article read (`GET /post/[slug]`):**

```text
Reader -> app/post/[slug]/page.tsx (ISR, revalidate = 30)
       -> cache(getArticleCatalogue)            [lib/cms/catalogue.ts, React cache() dedupe]
       -> Promise.all(getPublishedCmsPosts, getCmsCommentCounts)   [lib/cms/read.ts]
       -> getPublicCmsStore()                   [lib/cms/store.ts]
            |-- Supabase configured: stateless anon client -> Postgres (RLS: status='published')
            |-- otherwise:           local JSON archive    [lib/cms/local-store.ts]
       -> merge: CMS rows first, then INITIAL_BLOG_POSTS, then data/articles.json (dedupe by slug)
       -> cmsPostToArticle() mapping            [lib/cms/mapping.ts]
       -> notFound() if no match -> app/not-found.tsx (real HTTP 404)
       -> MarkdownBody / AuthorProfileCard / ArticleDiscussion render
```

Six steps: (1) the route declares `export const revalidate = 30` and deliberately omits `generateStaticParams` so an unknown slug is a real 404 rather than a cached 200 shell (`app/post/[slug]/page.tsx:19-24`); (2) `cache(getArticleCatalogue)` dedupes the read between `generateMetadata` and the page body (`app/post/[slug]/page.tsx:27`); (3) `lib/cms/read.ts` wraps every read in try/catch and degrades to `[]` on failure; (4) `getPublicCmsStore()` returns a memoised store built on a **cookie-free** client so ISR pages never call `cookies()` and never become dynamic (`lib/supabase/server.ts:47-66`); (5) `lib/cms/catalogue.ts` merges three sources with CMS winning slug collisions; (6) `cmsPostToArticle` normalises a DB row into the `BlogPost` shape the reader already understands.

**Flow B — studio write (`POST /api/cms/posts`):**

```text
PostEditor -> cmsFetch('/api/cms/posts')       [lib/cms/client-api.ts]
          -> isSameOrigin(request)              [lib/cms/http.ts:6-28]   403 if cross-site
          -> requireEditor()                    [lib/cms/auth.ts:76-92]  401 unauth / 403 non-editor
          -> rateLimit(clientKey(req,'cms:create'), 20, 60_000)          429
          -> readJsonBody() -> normalizePostInput()  [lib/cms/schema.ts] 400 + fieldErrors
          -> slug collision check vs CMS store AND vs lib/db.ts catalogue 409
          -> getEditorCmsStore().createPost()   [session-scoped client, RLS re-enforces]
          -> revalidateArticle(slug) if published  [lib/cms/revalidate.ts]
          -> 201 { post, mode }
```

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| `middleware.ts` | Session-cookie refresh; `/dashboard/**` redirect to `/login` | Authorization decisions (that is `requireEditor`); anything outside `/dashboard/:path*` | `middleware.ts:47-49` |
| `app/**/page.tsx` | Route rendering, `generateMetadata`, 404 resolution | Writes; validation | `app/post/[slug]/page.tsx` |
| `app/api/**/route.ts` | HTTP: origin, rate limit, body parse, status mapping | Persistence details | `app/api/cms/posts/route.ts` |
| `lib/cms/schema.ts` | Input normalisation + field errors; `toPublicPostId`/`fromPublicPostId` namespacing | I/O | `lib/cms/schema.ts:87-166` |
| `lib/cms/store.ts` | Backend selection and memoisation | Queries | `lib/cms/store.ts` |
| `lib/cms/supabase-store.ts` | Row↔domain mapping, PostgREST calls, error translation | HTTP responses | `lib/cms/supabase-store.ts` |
| `lib/cms/local-store.ts` | Atomic JSON writes, in-process write serialisation | Concurrency across processes | `lib/cms/local-store.ts:64-70` |
| `lib/cms/read.ts` | Best-effort public reads with graceful degradation | Throwing to the page | `lib/cms/read.ts:6-19` |
| `lib/cms/auth.ts` | Editor gate; fails **closed** when the allowlist RPC errors | Route-level HTTP | `lib/cms/auth.ts:56-59` |
| `lib/supabase/config.ts` | Single source of truth for credentials + `isSupabaseConfigured` | Client construction | `lib/supabase/config.ts` |
| `lib/db.ts` | Legacy seed catalogue + JSON article/comment persistence | CMS posts (those are `lib/cms/`) | `lib/db.ts` |
| `supabase/migrations/` | Schema, RLS, triggers, `is_editor()` RPC | Application code | `supabase/migrations/*.sql` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| **Adapter / Strategy** | `CmsStore` interface (`lib/cms/types.ts:73`) with `createLocalCmsStore` / `createSupabaseCmsStore` | Lets the app run credential-free for review and on Supabase in production without changing callers |
| **Lazy module-level singleton** | `publicClient` (`lib/supabase/server.ts:44`), `browserClient` (`lib/supabase/client.ts:7`), `localStore`/`publicStore` (`lib/cms/store.ts:9-10`), `rateLimit` buckets (`lib/rate-limit.ts:3`) | Avoids re-creating clients per request; safe because these are cookie-free or request-scoped by construction |
| **Explicit request-scoped non-singleton** | `createSupabaseServerClient()` — *"Always create a new one per request — never cache it"* | The session client touches cookies; caching would leak sessions |
| **Result object / discriminated union instead of throwing** | `normalizePostInput` → `{ok:true,value} \| {ok:false,message,fieldErrors}` (`lib/cms/schema.ts:80-83`); `createSubmission` (`lib/submissions.ts:42-45`); `EditorGate` (`lib/cms/auth.ts:9-11`) | Field-level errors must reach the form, so exceptions are the wrong channel |
| **Typed error hierarchy mapped to HTTP status** | `CmsError` (500) → `CmsValidationError` (400) / `CmsConflictError` (409) / `CmsNotFoundError` (404) / `CmsUnavailableError` (503); `toCmsError()` normalises anything else (`lib/cms/errors.ts`) | One `errorResponse()` call per route produces the right status and body (`lib/cms/http.ts:58-64`) |
| **Graceful degradation** | `lib/cms/read.ts` returns `[]`/`{}`/`null` on any error; the assistant falls back to a deterministic catalogue answer when Gemini fails (`app/api/research-assistant/route.ts:152-160`) | A storage or model outage must degrade to the bundled catalogue, never to a broken page |
| **Atomic write with temp-file rename** | `writeJsonAtomic` (`lib/db.ts:10-25`), `writeArrayAtomic` (`lib/cms/local-store.ts:28-43`), `lib/submissions.ts:88-91` | A crash cannot leave a half-written JSON document |
| **In-process promise queue** | `serialise()` in `lib/cms/local-store.ts:64-70` | Serialises JSON writes so read-modify-write races cannot interleave within one process |
| **React `cache()` request dedupe** | `const catalogue = cache(getArticleCatalogue)` (`app/post/[slug]/page.tsx:27`) | `generateMetadata` and the page body share one CMS read |
| **Idempotent SQL migrations** | Every migration is wrapped in `begin/commit` with `create … if not exists`, `drop policy if exists`, `on conflict do update` | Safe to re-run; stated in `CLAUDE.md` |
| **Namespaced public IDs** | `toPublicPostId` → `cms-<id>`; `fromPublicPostId` validates `/^\d{1,19}$/` (`lib/cms/schema.ts:191-198`) | Prevents CMS numeric ids colliding with seed ids like `post-1` |

### 5) Known Architectural Risks

- **Two parallel write paths for articles.** `lib/db.ts` writes `data/articles.json` (used by `/api/articles`, `/api/comments`, `/write`) while `lib/cms/*` writes the CMS store (used by `/api/cms/*`, `/dashboard`). `app/api/cms/posts/route.ts:67` has to cross-check the *other* path for slug collisions (`getArticles().find(...)`), which is direct evidence the two can drift. **Partial mitigation:** the legacy write path is deliberately disabled once Supabase is configured — `app/api/articles/route.ts:73-81` returns 403 with *"This deployment publishes through the Supabase editorial studio"* when `isLocalCmsMode()` is false. So the divergence risk is confined to local/demo mode, but the two stores still both feed the *read* path (`lib/cms/catalogue.ts:26`). See CONCERNS.md.
- **In-memory rate limiting on a multi-isolate runtime.** `lib/rate-limit.ts:3` keeps buckets in a module-level `Map`. On Cloudflare Workers each isolate has its own map, so the effective limit is `limit × isolate count`, and it resets on isolate eviction. `MAX_KEYS = 5_000` also means the whole map is cleared when full (`lib/rate-limit.ts:11`), resetting every client's budget at once.
- **Schema drift between two allowlist tables.** `supabase/migrations/20261025000300_cms_storage.sql` creates `public.editor_memberships`; the later `20261028000100_editor_allowlist.sql` creates `public.editors` and rewrites every storage/posts policy to `public.is_editor()`, which reads `public.editors`. `editor_memberships` is referenced by no other file. An administrator who grants access via the older table gets nothing.
- **Local demo mode is fully unauthenticated by design.** `requireEditor()` returns `{ ok: true, user: null, mode: 'local' }` whenever Supabase is unconfigured (`lib/cms/auth.ts:78-80`), and `middleware.ts:14-16` skips protection entirely. Deliberate, but it means a misconfigured production deploy silently serves an open CMS — which is exactly what `scripts/check-production-env.mjs` exists to prevent.
- **Forgeable local session cookie.** `/api/auth/session` POST stores a **client-supplied, unsigned** JSON object in the `rwm_session` cookie with `sameSite: 'none'` (`app/api/auth/session/route.ts:30-36`), and `getDashboardUser()` trusts it in local mode, returning `isEditor: true` (`lib/cms/auth.ts:31-45`).
- **Unauthenticated outbound-cost endpoints.** `/api/generate` and `/api/author-avatar` have no auth gate and no rate limit, yet both spend server-side credentials (HF token, Gemini key).

### 6) Evidence

- `middleware.ts` — the only middleware and its matcher
- `lib/cms/types.ts` — the `CmsStore` contract
- `lib/cms/store.ts` — backend selection (`getPublicCmsStore`, `getEditorCmsStore`, `isLocalCmsMode`)
- `lib/cms/catalogue.ts` — the single merged public catalogue
- `lib/cms/supabase-store.ts`, `lib/cms/local-store.ts` — the two adapters
- `lib/cms/errors.ts`, `lib/cms/http.ts` — error→HTTP mapping and origin checks
- `app/api/cms/posts/route.ts` — the full write pipeline in one readable file
- `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/config.ts` — client strategy
- `supabase/migrations/*.sql` — schema, RLS, and the allowlist RPC
- `open-next.config.ts`, `wrangler.jsonc` — the Worker runtime and KV cache
- `docs/codebase/.codebase-scan.txt` — CODE METRICS section

## Extended Sections

### Initialisation order requirements

There is no explicit boot sequence, but three orderings are load-bearing:

1. `lib/supabase/config.ts` reads `process.env.NEXT_PUBLIC_SUPABASE_*` **at module load**, and Next.js inlines those at build time. Nothing can change them at runtime.
2. `next.config.ts` calls `initOpenNextCloudflareForDev()` at the bottom of the module, only when `NODE_ENV === 'development'`, inside `try/catch` so a non-wrangler dev server still starts.
3. `lib/cms/local-store.ts` resolves its data directory once per store instance (`process.env.RWM_DATA_DIR ?? <cwd>/data`), so `RWM_DATA_DIR` must be set before the first `getLocalCmsStore()` call. Tests exploit this.

### Failure-mode posture

| Failure | Behaviour | Evidence |
|---|---|---|
| Supabase unreachable on a public read | Page renders from the bundled catalogue; error logged | `lib/cms/read.ts:15-18` |
| Supabase unreachable in the studio | `CmsUnavailableError` → 503 with a retry message | `lib/cms/errors.ts:43-47` |
| Gemini unavailable or returns empty | Deterministic catalogue answer + a `notice` field | `app/api/research-assistant/route.ts:152-160` |
| HF Space returns no image | 500 with the raw error message surfaced to the client | `app/api/generate/route.ts:107-114` |
| Local JSON not writable (e.g. read-only Worker FS) | `CmsUnavailableError`; submissions return 503 with "Email the editorial desk instead" | `lib/cms/local-store.ts:38-40`, `lib/submissions.ts:93-97` |
| `is_editor()` RPC errors | User treated as **non**-editor (fails closed) | `lib/cms/auth.ts:56-59` |
| Cookie write inside a Server Component | Swallowed; middleware handles refresh | `lib/supabase/server.ts:31-36` |
| Render throws | `app/error.tsx` (route) / `app/global-error.tsx` (root) | `app/error.tsx`, `app/global-error.tsx` |

There are **no retries and no explicit timeouts** on any outbound integration call. Verified: `grep -rn "AbortSignal\|AbortController\|signal:\|timeout" app/api lib` returns nothing outside tests, and the only `retry` matches in the codebase are `Retry-After` response headers emitted by the rate limiter. A hung Gemini or Hugging Face call therefore runs until the Worker's own CPU/wall-clock limit kills it.

---

## Updated 2026-11-08

Two divergences recorded above have been closed, and one behaviour changed:

- **The two article write paths are now one.** `/write` publishes through
  `/api/cms/posts` exactly like `/dashboard`. The legacy `POST /api/articles`
  handler and `lib/db.addArticle()` were removed, so the slug cross-check in
  `app/api/cms/posts/route.ts` is no longer guarding a live second writer.
  `lib/db.ts` remains the read path for the seed archive in demo mode.
- **The allowlist schema drift is resolved.** Migration
  `20261108000100_consolidate_editor_allowlist.sql` copies any
  `public.editor_memberships` rows into `public.editors` and drops the old
  table. `public.is_editor()` was already the only authorization predicate, so
  the RLS policies needed no change.
- **Model-backed generation is now editor-only.** `/api/generate` requires an
  editor session, and `/api/author-avatar` only calls Gemini when the request
  carries `forceAi: true` from an editor. Reader pages render the deterministic
  SVG. This is a deliberate capability reduction: the public avatar endpoint no
  longer spends `GEMINI_API_KEY`.

`/write` also now requires the author to select a verified profile from
`AUTHORS` instead of the page synthesising a byline from the session.
