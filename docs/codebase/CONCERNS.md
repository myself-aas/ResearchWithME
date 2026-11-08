# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| **High** | `/api/generate` is unauthenticated, has no rate limit, and spends the server's `HF_TOKEN` | `app/api/generate/route.ts` — grep for `requireEditor`/`rateLimit`/`auth.` returns nothing; no `export const runtime`/`dynamic` either | Anyone on the internet can drive paid ZeroGPU inference through your Hugging Face account. Unbounded cost and quota exhaustion | Add `requireEditor()` (covers are a studio feature) plus `rateLimit()`, matching `app/api/cms/posts/route.ts` |
| **High** | `/api/author-avatar` is unauthenticated, has no rate limit, and spends `GEMINI_API_KEY` | `app/api/author-avatar/route.ts:4,88-107` | Same cost-abuse exposure on the Gemini key; user-supplied `name`/`role`/`domain`/`bio` are interpolated straight into the prompt | Gate behind `requireEditor()` and rate-limit; treat the interpolated fields as untrusted prompt content |
| **High** | Two conflicting editor-allowlist tables; the older one is orphaned | `supabase/migrations/20261025000300_cms_storage.sql:3` creates `public.editor_memberships`; the later `20261028000100_editor_allowlist.sql:44-57` creates `public.editors` and rewrites **every** posts/storage policy to `public.is_editor()`, which reads `public.editors`. `grep -rn editor_memberships` finds it in that one file only | An administrator who grants studio access by inserting into `editor_memberships` gets **no** access, with no error — the failure is silent | Migrate rows into `public.editors` and drop `editor_memberships` in a new idempotent migration |
| **High** | Rate limiting is in-memory, on a runtime with many short-lived isolates | `lib/rate-limit.ts:3` module-level `Map`; `wrangler.jsonc` targets Cloudflare Workers | The effective limit is `limit × isolate count` and resets on eviction, so the 9 guarded routes are far weaker than their numbers suggest. `MAX_KEYS = 5_000` also clears the **entire** map when full (`lib/rate-limit.ts:11`), resetting every client at once | Move counters to KV/Durable Object/Upstash, or document the limiter as best-effort only |
| **Med** | `/api/submissions` accepts unauthenticated writes with **no** rate limit | `app/api/submissions/route.ts` — no `rateLimit` call, unlike the other 8 guarded routes | Unthrottled disk writes; `data/submissions.json` is capped at 500 records so the archive silently churns (`lib/submissions.ts:20,87`) | Add `rateLimit(clientKey(request, 'submissions'), …)` |
| **Med** | Two parallel article write paths that must cross-check each other | `lib/db.ts` (`saveArticles`, `addArticle`, `addComment`) vs `lib/cms/*`; `app/api/cms/posts/route.ts:67` explicitly queries `getArticles()` to catch a slug collision with the *other* path | Slug collisions and divergent content are possible by construction; every new write path has to remember both stores. **Partially mitigated:** `app/api/articles/route.ts:73-81` returns 403 for the legacy write once Supabase is configured, so divergence is confined to local/demo mode. Both stores still feed the read path (`lib/cms/catalogue.ts:26`) | Consolidate on the CMS store; reduce `lib/db.ts` to read-only seed access |
| **Med** | Local demo mode is fully unauthenticated, and its session cookie is forgeable | `requireEditor()` returns `{ok:true, user:null, mode:'local'}` when Supabase is unconfigured (`lib/cms/auth.ts:78-80`); `middleware.ts:14-16` skips protection; `/api/auth/session` POST stores a **client-supplied, unsigned** JSON blob in `rwm_session` with `sameSite:'none'` (`app/api/auth/session/route.ts:30-36`), which `getDashboardUser()` trusts and upgrades to `isEditor: true` (`lib/cms/auth.ts:31-45`) | A production deploy missing its `NEXT_PUBLIC_SUPABASE_*` build vars silently serves an open CMS. `scripts/check-production-env.mjs` exists precisely to stop this — but it only runs on `npm run deploy`/`upload`, **not** on the dashboard CI path | Keep the guard; consider failing closed at runtime too when `NODE_ENV === 'production'` and Supabase is unconfigured |
| **Med** | No timeouts on any outbound call | `grep -rn "AbortSignal\|AbortController\|signal:\|timeout" app/api lib` → nothing outside tests | A hung Gemini or HF Space call holds a Worker until the platform kills it, consuming CPU quota and leaving the reader with a spinner | Wrap outbound calls in `AbortSignal.timeout(…)` |
| **Low** | `revalidateComments()` is dead code and targets the wrong path shape | `lib/cms/revalidate.ts:10-12` builds `/post/${postId}`, but the reader route is keyed by **slug** (`app/post/[slug]/page.tsx`). `grep -rn revalidateComments` finds no callers | If someone wires it up as-is, it revalidates a path that never exists and comment updates stay stale for up to the 30 s ISR window | Delete it, or change the parameter to a slug |
| **Low** | `.env.example` is missing `GEMINI_API_KEY` | `cut -d= -f1 .env.example` lists 7 vars; the README table lists 8 including `GEMINI_API_KEY`; the code reads 14 distinct names | A new contributor copying the template cannot enable the model-backed assistant and gets the fallback with no explanation | Add `GEMINI_API_KEY=` (and ideally `RWM_DATA_DIR`, `ALLOW_DEMO_DEPLOY`) |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| `public.editor_memberships` orphan table | Superseded by `public.editors` in a later migration, but never dropped | `supabase/migrations/20261025000300_cms_storage.sql:3-17` | Silent authorization failures; two "editor" concepts to reason about | New migration: copy rows to `public.editors`, then `drop table` |
| Misleading migration filenames | `20261025000200` and `20261025000300` are **both** named `_cms_storage.sql`; the 000300 one actually creates the allowlist table | `supabase/migrations/` | The next reader applies or reasons about them in the wrong order | Rename on the next schema change (migrations already applied cannot be renamed safely — add a note instead) |
| `lib/db.ts` legacy JSON article layer | Predates the Supabase CMS; still backs `/api/articles`, `/api/comments`, `/write` | `lib/db.ts` (232 lines) | Dual write paths, slug collisions, and a filesystem that does not exist on the Worker | Fold into `lib/cms/`; keep only read access to the seed |
| Two committed lockfiles | npm and Bun were both used | `package-lock.json` (629 KB), `bun.lock` (312 KB) | CI installs with `bun install --frozen-lockfile` while the README says `npm install`; the two can resolve differently and drift silently | Pick one. CI already commits to Bun (`oven-sh/setup-bun@v2`, bun 1.4.4) |
| Two ESLint configs | Flat config added for ESLint 9 without removing the legacy file | `eslint.config.mjs` (authoritative) + `.eslintrc.json` (`{ "extends": "next" }`, inert) | Someone edits the wrong file and wonders why nothing changes | Delete `.eslintrc.json` |
| Dead `hooks/` directory | Single exported hook with no consumers | `hooks/use-mobile.ts` — `grep -rn "useIsMobile"` finds no match outside its own file; also the only file using double quotes without semicolons | Misleads readers about a responsive-strategy convention that does not exist | Delete the file and the directory |
| Duplicate vendored skill trees | Skills installed for multiple agents | `.agents/skills/`, `.claude/skills/`, `agent/skills/` — `.claude/skills/` duplicates three of `.agents/skills/`'s four | ~78 Markdown files of duplicated content; unclear which copy is canonical | Keep one tree and symlink or reference it |
| `app/sitemap.ts` reads the seed JSON directly | Convenience import | `app/sitemap.ts:6` `import persistedArticles from '@/data/articles.json'` | Bypasses `lib/db.ts`'s merge logic and `getArticleCatalogue()`; a third read path for the same data | Route it through the catalogue helper |
| 3 source files over 500 lines | Feature accretion in the studio | `components/cms/PostEditor.tsx` (859), `app/write/page.tsx` (832), `components/cms/QwenCoverGenerator.tsx` (547) | Hard to review and untested (no component tests exist) | Split form sections into subcomponents |
| Article-format list duplicated in two modules | The Supabase adapter re-declares it as a `Set` instead of importing | `lib/cms/schema.ts:20-26` exports `ARTICLE_FORMATS`; `lib/cms/supabase-store.ts:7` hardcodes `new Set(['Paper Review', 'Repo Teardown', 'Deep-Dive Essay', 'Field Notes', 'Case Study'])` | Adding a format in one place silently makes the other reject or mis-map rows | Import `ARTICLE_FORMATS` into `supabase-store.ts` |
| Canonical site URL fallback duplicated 6× | `app/sitemap.ts` re-implements it per call site instead of importing the existing helper | `lib/seo.ts:4` exports `SITE_URL` with the same `'https://researchwith.me'` fallback; `app/sitemap.ts:41,47,53,59,65` repeat `process.env.NEXT_PUBLIC_SITE_URL \|\| 'https://researchwith.me'` inline (and `app/robots.ts` correctly imports `SITE_URL`) | A domain change requires editing six sites and one of them will be missed | Use `SITE_URL` from `lib/seo.ts` in `app/sitemap.ts` |
| `deploy.yml` designed but not merged | Documented divergence | `docs/deployment.md:32-42` — *"Designed, not merged — lives on PR #5 … conflicts with `main` on README.md, package.json, scripts/check-production-env.mjs, wrangler.jsonc"* | Two deployers can end up enabled at once and double-deploy every merge (the README warns about exactly this) | Resolve PR #5 or close it and rely on Workers Builds alone |
| Stale references to a missing directory | The legacy theme was removed but the docs were not updated | `README.md` (Project layout), `PRODUCT.md` (Implementation Status), `docs/audit-2026-10-25.md:3`, `eslint.config.mjs` `globalIgnores`, `.impeccable/config.json` `ignoreFiles` all reference `ResearchWith.me-main/`; `ls -d ResearchWith.me-main` → *"No such file or directory"* | Readers look for a directory that does not exist | Remove the references and the ignore entries |

### 3) Security Concerns

| Risk | OWASP | Evidence | Current mitigation | Gap |
|------|-------|----------|--------------------|-----|
| Unauthenticated paid-inference proxy (`/api/generate`) | A01 Broken Access Control | `app/api/generate/route.ts` — no auth, no rate limit | None on this route | Add `requireEditor()` + rate limit |
| Unauthenticated Gemini proxy with prompt interpolation (`/api/author-avatar`) | A01 / A03 Injection | `app/api/author-avatar/route.ts:88-107` — `name`, `role`, `domain`, `bio` concatenated into the prompt | Output is checked for `<svg>`/`</svg>` and sliced between them (lines 100-107) | No auth, no rate limit, no input sanitisation before the prompt |
| Model-written SVG returned to the browser | A03 Injection | `app/api/author-avatar/route.ts` returns raw model text as `svg` | Only a substring extraction; the SVG is not sanitised | Model output can contain `<script>` or event handlers inside SVG. Sanitise or serve as `image/svg+xml` with `Content-Security-Policy: sandbox` |
| Raw upstream error text returned to clients | A01 Information Disclosure | `app/api/generate/route.ts:108-113` and `app/api/author-avatar/route.ts:132-137` both return `error.message` | Elsewhere the codebase is disciplined about prose-only messages (`lib/cms/http.ts:58-64`) | Replace with a generic message; log the detail |
| Operator HF token persisted in `localStorage` | A02 Cryptographic/Auth failure | `components/cms/QwenCoverGenerator.tsx:83,173` (`rwm_hf_token`), sent as `customToken` (line 137) | The env-var path avoids it entirely | `localStorage` never expires and is readable by any script on the origin. Prefer a Worker secret; if the field stays, keep it in memory only |
| Forgeable unsigned session cookie | A07 Identification & Authentication Failure | `app/api/auth/session/route.ts:30-36` sets `rwm_session` from the request body, `sameSite:'none'`, `secure:true`, 7 days | Only consulted when Supabase is unconfigured (`lib/cms/auth.ts:29-47`) | Any client can mint an editor session in demo mode; `sameSite:'none'` widens exposure. Sign the cookie or drop it in favour of the Supabase session |
| Credential-less institutional "verification" | A01 | `app/api/auth/verify-institutional/route.ts` — grants `grantedRole: 'author'` and 4 permissions based purely on the email TLD, returning a synthetic `verificationToken` | Clearly labelled a prototype in `README.md` and `PRODUCT.md`; the token is never persisted or checked server-side | Nothing consumes it today, so it is inert — but it must never be wired into authorization without real verification |
| Query strings persisted to logs while a secret may travel in one | A09 Logging & Monitoring | `wrangler.jsonc` `observability.redact_query_string: false`; `app/api/revalidate/route.ts:41` accepts `?secret=` | The documented path is the `x-revalidate-secret` header, precisely *"so it never lands in access logs"* (lines 19-21) | Either redact query strings or remove the query-param fallback |
| RLS is the only authorization boundary | A01 | `supabase/migrations/20261025000100_cms_schema.sql` §4, `20261028000100_editor_allowlist.sql` | RLS enabled on all 4 tables; `is_editor()` is `SECURITY DEFINER` with `set search_path = ''`; `isEditor` fails **closed** on RPC error (`lib/cms/auth.ts:56-59`); no service-role key anywhere in the repo (verified by scan) | Migrations are never executed in CI, so policy regressions are invisible to automation |
| Comments are append-only with no update policy | N/A (deliberate) | `docs/supabase-cms.md:138`; no `update` policy on `public.comments` in any migration | Documented as intentional immutability | None — noted so it is not "fixed" by accident |

**Positive findings worth recording:** security headers are set globally (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera/mic/geolocation, `X-DNS-Prefetch-Control: on`) in `next.config.ts:26-31`; `poweredByHeader: false`; `next/image` `remotePatterns` are derived from the configured Supabase URL so the optimizer only trusts that origin (`next.config.ts:9-23`); `safeNextPath()` blocks protocol-relative, backslash, control-character, and `/login`/`/auth/callback` redirect targets (`lib/safe-redirect.ts`); the revalidation secret uses hash-then-`timingSafeEqual` so length cannot leak (`lib/cms/secret.ts:17-22`); cover-image URLs are restricted to the configured Supabase storage origin (`lib/cms/schema.ts:38-66`).

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| `/author/[id]` ships 319 kB First Load JS | Verified `npm run build` output: `ƒ /author/[id]  110 kB  319 kB` — 3.0× the 105 kB shared baseline | Slower first paint on author profiles, incl. mobile | Grows with `recharts` usage | Import the radar chart dynamically (`next/dynamic`) so it loads after first paint |
| Free-tier KV shared by production and previews | `wrangler.jsonc` `previews.kv_namespaces` deliberately reuse `8d2dc8f0…`; documented: *"What the two do share is the free plan's 1,000 KV writes a day"* | A busy preview branch consumes the production write budget | Hitting 1,000 writes/day disables cache writes entirely | Create a second namespace for previews (`npx wrangler kv namespace create researchwithme-opennext-cache-preview`) |
| KV eventual consistency (~60 s) | `open-next.config.ts:8-14`, `README.md` | A studio publish may take up to a minute to appear on `/` or `/sitemap.xml` | Editor confusion, not an outage | Already documented; no fix needed unless SLA tightens |
| Catalogue is fully materialised per request | `getArticleCatalogue()` (`lib/cms/catalogue.ts:15-29`) lists **all** published posts, then merges the whole seed catalogue in memory | Fine at today's scale (a handful of records) | O(n) per request with no pagination; `MAX_ROWS = 500` caps the Supabase query (`lib/cms/supabase-store.ts:8`) | Add pagination or a materialised index when the archive grows |
| `/post/[slug]` is `ƒ` (dynamic), not prerendered | Verified build output; `app/post/[slug]/page.tsx:19-24` deliberately omits `generateStaticParams` | Every cold article render is a full server render + CMS read | Higher tail latency and Worker CPU than SSG | Intentional trade-off (a real 404 instead of a soft 404) — keep, but revisit if traffic grows |
| `next/image` serves originals | `wrangler.jsonc`: *"Free-plan setup: no R2 or Images bindings, so next/image serves originals"* | Unoptimised image bytes to readers | Bandwidth and LCP on slow connections | Add an Images binding, or pre-compress assets |
| 2.7 MB zip committed in `public/` | `public/assets/aistudio/ResearchWithME_75aee1dd.zip` (2759.5 KB, the largest file in the scan) | Served as a static asset | Bloats the Worker bundle and the repo | Move it out of `public/` if it is not meant to be downloadable |
| In-memory rate limiter allocates without bound until 5,000 keys | `lib/rate-limit.ts:3,11` | None at low traffic | Memory growth per isolate; wholesale reset at the cap | Bound per-scope or move off-isolate |
| Sequential awaits in the create-post path | `app/api/cms/posts/route.ts:59` (`store.getPostBySlug`) then `:67` (`getArticles()`) run one after the other | Negligible today | Low — both are cheap at current scale | Not worth changing alone; noted for completeness |

**Where parallelisation is already done right:** `getArticleCatalogue()` fetches posts and comment counts concurrently via `Promise.all([getPublishedCmsPosts(), getCmsCommentCounts()])` (`lib/cms/catalogue.ts:17`), and `app/post/[slug]/page.tsx` wraps the whole catalogue in React's `cache()` so `generateMetadata` and the page body share one read rather than issuing two. No N+1 query patterns were found — the Supabase adapter issues one `select` per operation and joins comment titles in the query itself via PostgREST resource embedding — `posts(title)` at `lib/cms/supabase-store.ts:206,220,249,269`, typed by `CommentJoinRow` (lines 33-41).

### 5) Fragile/High-Churn Areas

**Churn analysis is not possible in this workspace, and the scan output must not be trusted on this point.** `.codebase-scan.txt`'s HIGH-CHURN FILES section lists 20 files all with a count of `1`, and its GIT RECENT COMMITS section shows a single commit. Verified cause: `git rev-list --count HEAD` returns `1` and `.git/shallow` exists — **this is a shallow clone**. Every file appears to have churn 1 because there is exactly one visible commit. Treat that section of the scan as void; re-run it against a full clone before drawing conclusions.

Fragility assessed structurally instead:

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| `components/cms/PostEditor.tsx` (859 lines) | Largest source file; owns title, slug, body, cover, tags, takeaways, status and save/publish flows; **zero test coverage** (no component tests exist) | Unavailable (shallow clone) | Change one section at a time and exercise it in the running studio; add component tests first |
| `app/write/page.tsx` (832 lines) | Second largest; a prototype draft flow that duplicates studio concepts but writes through `/api/articles` instead of `/api/cms/*` | Unavailable | Confirm which surface is canonical before editing either — see `[ASK USER 8]` |
| `supabase/migrations/*.sql` | RLS is the production authorization boundary, and **no migration is ever executed in CI** | Unavailable | Run every migration against a scratch Supabase project and verify policies by hand before merging |
| `lib/rate-limit.ts` (32 lines) | Tiny, untested, and load-bearing for 9 routes; its semantics silently change under a multi-isolate runtime | Unavailable | Add unit tests for the bucket logic before altering any limit |
| `lib/cms/supabase-store.ts` (284 lines) | The only Postgres access layer; row↔domain mapping and error translation are untested while the local adapter is | Unavailable | Test `rowToPost`/`postToRow` as pure functions — they already are |
| `wrangler.jsonc` + `open-next.config.ts` | Cache correctness depends on a non-obvious invariant: one KV namespace is safe only because OpenNext prefixes keys by build id | Unavailable | Read the in-file comments before changing bindings; a preview binding change can silently serve stale HTML |
| `.env.production` / build-time env | `NEXT_PUBLIC_*` values are inlined at build time, so a runtime variable change does nothing | Unavailable | Always rebuild and redeploy; `scripts/check-production-env.mjs` guards `deploy`/`upload` only |

### 6) `[ASK USER]` Questions

1. **[ASK USER]** Which package manager is canonical? `package-lock.json` and `bun.lock` are both committed; `.github/workflows/quality.yml` installs with `bun install --frozen-lockfile` (Bun 1.4.4) while `README.md` documents `npm install`. Should one lockfile be deleted?
2. **[ASK USER]** `ResearchWith.me-main/` is referenced by `README.md`, `PRODUCT.md`, `docs/audit-2026-10-25.md`, `eslint.config.mjs` and `.impeccable/config.json`, but the directory does not exist in this checkout. Was it intentionally removed (so the references should go), or is it missing from the clone?
3. **[ASK USER]** `.env.example` omits `GEMINI_API_KEY` even though `README.md` documents it and two routes read it. Should it be added, along with `RWM_DATA_DIR` and `ALLOW_DEMO_DEPLOY`?
4. **[ASK USER]** `.eslintrc.json` (`{ "extends": "next" }`) is inert under ESLint 9 because `eslint.config.mjs` is present. Safe to delete?
5. **[ASK USER]** Are `/api/generate` and `/api/author-avatar` meant to be public? Both spend server-side credentials (`HF_TOKEN`, `GEMINI_API_KEY`) with no authentication and no rate limit. `/api/generate` even accepts an operator-supplied `customToken`, suggesting a studio-only audience.
6. **[ASK USER]** For the editor allowlist: should `public.editor_memberships` be migrated into `public.editors` and dropped, or is it still serving a purpose I cannot see from the SQL alone?
7. **[ASK USER]** Is per-isolate, in-memory rate limiting acceptable, or should the counters move to KV / a Durable Object / an external service? The current limits are not enforceable as written on Cloudflare Workers.
8. **[ASK USER]** `app/write/page.tsx` (832 lines) writes through `/api/articles`, while `/dashboard` writes through `/api/cms/*`. Note that `/api/articles` POST already refuses to work once Supabase is configured (`app/api/articles/route.ts:73-81`), so `/write` is effectively demo-only in production today. Should it be retired, or promoted onto the CMS store?
9. **[ASK USER]** `docs/deployment.md` records that GitHub Actions `deploy.yml` is "designed, not merged" on PR #5 and conflicts with `main`. Is the intent to merge it (and accept double deploys unless Workers Builds is disconnected) or to abandon it?
10. **[ASK USER]** Should `hooks/use-mobile.ts` be deleted? `useIsMobile` has no consumers.

### 7) Evidence

- `docs/codebase/.codebase-scan.txt` — TODO/FIXME section ("None found", independently re-verified: `grep -rniE "\b(TODO|FIXME|HACK|XXX)\b"` over `app components lib scripts supabase hooks middleware.ts` returns nothing); CODE METRICS (363 files, 45,607 LOC; largest file `public/assets/aistudio/ResearchWithME_75aee1dd.zip` at 2759.5 KB); HIGH-CHURN section (**void — shallow clone**)
- `app/api/generate/route.ts`, `app/api/author-avatar/route.ts`, `app/api/submissions/route.ts` — unguarded endpoints
- `app/api/cms/posts/route.ts` — the reference implementation of a correctly guarded route
- `lib/rate-limit.ts` — in-memory bucket implementation and its `MAX_KEYS` reset
- `supabase/migrations/20261025000300_cms_storage.sql`, `20261028000100_editor_allowlist.sql` — the allowlist drift
- `lib/cms/auth.ts`, `middleware.ts`, `app/api/auth/session/route.ts` — the demo-mode authentication posture
- `components/cms/QwenCoverGenerator.tsx:83,137,173` — the `localStorage` HF token
- `wrangler.jsonc`, `open-next.config.ts` — KV sharing, observability settings, free-tier constraints
- Verified command output: `npm test` (65 passing), `npm run lint` (clean), `npm run typecheck` (clean), `npm run build` (46 static pages, per-route bundle sizes), `npm run impeccable:source` (0 anti-patterns, 1 advisory: `#0f172a` at `app/opengraph-image.tsx:26`)
- Verified absence: `ls -d ResearchWith.me-main` → not found; `ls .github/workflows/` → `quality.yml` only; `grep -rn "useIsMobile"` → no consumers; `git rev-list --count HEAD` → 1 with `.git/shallow` present

## Extended Sections

### Full inventory of unguarded vs guarded API routes

Guarded by `requireEditor()` (4): `/api/cms/posts` (GET, POST), `/api/cms/posts/[id]` (PATCH, DELETE), `/api/cms/comments` (GET, POST), `/api/cms/comments/[id]` (DELETE).

Guarded by origin check + rate limit only: `/api/comments` POST, `/api/articles/[id]` PATCH. `/api/articles` POST is additionally refused outright when Supabase is configured (`isLocalCmsMode()` guard, `app/api/articles/route.ts:73-81`), so the legacy publish path is demo-mode only.

Guarded by shared secret (1): `/api/revalidate` POST.

**No guard at all (11 handlers across 8 routes):** `/api/articles` GET, `/api/authors`, `/api/authors/[id]`, `/api/papers`, `/api/papers/[slug]` (all read-only and low risk), `/api/auth/session` (writes a cookie), `/api/auth/verify-institutional`, `/api/author-avatar` (spends Gemini), `/api/generate` (spends HF), `/api/submissions` (writes to disk), `/api/comments` GET.

The read-only ones are fine. The four that spend money or write state — `/api/author-avatar`, `/api/generate`, `/api/submissions`, `/api/auth/session` — are the ones to address.

### Remediation roadmap (effort-ordered)

1. **~1 hour:** delete `.eslintrc.json`; delete `hooks/use-mobile.ts`; add `GEMINI_API_KEY=` to `.env.example`; delete `revalidateComments` or fix it to take a slug.
2. **~2 hours:** add `requireEditor()` + `rateLimit()` to `/api/generate` and `/api/author-avatar`; add `rateLimit()` to `/api/submissions`; replace `error.message` responses with generic prose in those two routes.
3. **~3 hours:** new idempotent migration copying `editor_memberships` → `editors` then dropping the old table; remove the stale `ResearchWith.me-main/` references.
4. **~1 day:** resolve the package-manager question and delete one lockfile; add unit tests for `lib/rate-limit.ts`, `lib/cms/supabase-store.ts` mapping, and the CMS write routes.
5. **Multi-day:** consolidate `lib/db.ts` into `lib/cms/`; decide `/write` vs `/dashboard`; move rate limiting off-isolate; run migrations in CI.

---

## Remediation applied on 2026-11-08

The findings in this document were written against commit `8ca0f81b`. All ten
`[ASK USER]` questions were answered and the answers are now implemented, so
the rows above describe the code **as it was**, not as it is. Each change below
was verified: `npm run quality` passes (lint clean, `tsc --noEmit` clean,
**12 files / 103 tests**, Impeccable 0 anti-patterns), `npm run build` exits 0,
and the six migrations were executed twice each against a real PostgreSQL 16.2
with Supabase stubs.

| Original finding | Resolution | Evidence |
| --- | --- | --- |
| Two committed lockfiles | `package-lock.json` deleted; Bun is canonical (`packageManager: "bun@1.4.4"`). `@opennextjs/cloudflare` moved to `dependencies` — it is needed to build the Worker in CI | `package.json`, `bun.lock` verified with `bun install --frozen-lockfile` |
| Two ESLint configs | `.eslintrc.json` deleted | `git status` shows the deletion |
| Dead `hooks/` directory | `hooks/use-mobile.ts` and the directory deleted | `ls hooks/` fails |
| `.env.example` missing `GEMINI_API_KEY` | `GEMINI_API_KEY`, `RWM_DATA_DIR`, `ALLOW_DEMO_DEPLOY` added, each commented | `.env.example` |
| `/api/generate` unauthenticated, unlimited, spends `HF_TOKEN` | Now `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, same-origin only, `requireEditor()`, rate-limited 10/min, `AbortSignal.timeout(60_000)`, generic 502. **The browser-supplied space name and token were removed entirely** — credentials now come from the Worker environment alone | `app/api/generate/route.ts` |
| `/api/author-avatar` unauthenticated, unlimited, spends `GEMINI_API_KEY`, ignores `forceAi` | Model generation now requires `forceAi: true` **and** `getDashboardUser()?.isEditor`. Readers get the deterministic SVG only. Added `runtime`/`dynamic`, same-origin, rate limit 6/min, and output sanitisation | `app/api/author-avatar/route.ts`, `lib/svg.ts` |
| Operator HF token in `localStorage` (OWASP A02) | The credential form was removed; `grep -rn "rwm_hf_token\|customToken"` now returns nothing | `components/cms/QwenCoverGenerator.tsx` |
| Model SVG injected via `dangerouslySetInnerHTML` | `lib/svg.ts` strips `script`/`foreignObject`, `on*` handlers and non-same-document `url()`/`href` targets, and fails closed if anything survives. `AuthorAvatar` now renders an `<img>` data URI, which cannot execute script at all | `lib/svg.ts`, `components/AuthorAvatar.tsx`, `lib/__tests__/svg.test.ts` (14 tests) |
| Orphaned `public.editor_memberships` | New idempotent migration copies rows into `public.editors` (`on conflict do nothing`) then drops the table | `supabase/migrations/20261108000100_consolidate_editor_allowlist.sql`; verified that no policy still references it |
| `revalidateComments()` dead and wrong path shape | Deleted — comment threads live under a `?comments=1` search param, so no extra path exists to revalidate | `lib/cms/revalidate.ts` |
| `/write` duplicating the studio on the legacy write path | `/write` now publishes through `/api/cms/posts` like the dashboard. The dead `POST /api/articles` handler and `lib/db.addArticle()` were removed | `app/write/page.tsx`, `app/api/articles/route.ts` |
| Per-isolate rate limiting | `lib/rate-limit.ts` now has a pluggable store. `RATE_LIMIT_KV` is bound in `wrangler.jsonc` and used when present, so counters are shared across isolates and survive eviction; the memory store remains the local-dev fallback and evicts one key at a time instead of clearing every client | `lib/rate-limit.ts`, `wrangler.jsonc`, `lib/__tests__/rate-limit.test.ts` (14 tests) |
| `deploy.yml` designed but not merged | Added at `.github/workflows/deploy.yml`, adapted to current `main`. The two PR #5 references that do not hold were removed: `npm run videos:manifest` (no such script exists) and the `/videos/hero.mp4` smoke test (the file is not in `public/`, so it would fail every deploy) | `.github/workflows/deploy.yml` |

**Not addressed by this work**, still open:

- `wrangler.jsonc` binds the **same KV namespace three times** (`NEXT_INC_CACHE_KV`,
  `NEXT_TAG_CACHE_KV`, `RATE_LIMIT_KV`). Rate limiting is write-heavy and
  `observability.redact_query_string` is `false`, so query strings holding
  article slugs reach Cloudflare Logs.
- The two Supabase migrations in this change set must be run by hand through
  the dashboard. There is still no CI step that applies migrations, so a Worker
  built from this branch will fail against an unmigrated database with the
  generic 503 from `lib/cms/errors.ts`.
- `app/write/page.tsx` and `components/cms/PostEditor.tsx` are both over 800
  lines and still have no component tests; `vitest.config.ts` only collects
  `lib/**/*.test.ts`.
- `app/opengraph-image.tsx:26` hardcodes `#0f172a` rather than a `globals.css`
  design token (the one standing Impeccable advisory).
- `/write` now requires the author to pick a verified profile from `AUTHORS`
  rather than synthesising a byline, which is a deliberate behaviour change:
  a verified user with no matching `authorProfileId` can no longer publish
  without selecting one.
