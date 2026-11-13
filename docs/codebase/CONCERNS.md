# Codebase Concerns

> Regenerated 2026-11-13 against `944f45c` (full history, 48 commits). The earlier version recorded
> findings against `8ca0f81` plus a remediation appendix. The resolved items are summarised at the end;
> everything else here was re-verified against the current tree.

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| **High** | Production API handlers have no behavioural tests. The tests exercise a **second, parallel implementation** instead | `test/support/pages.ts:34-35` imports `cloudflare-pages/src/server/{context,dispatch}`. No test imports any `app/api/**/route.ts` (`git grep "@/app/" lib/__tests__ test`). 17 Next route files vs 12 Pages API modules | A bug in the code that actually serves researchwith.me passes CI. The copies already differ (next row) | Decide which target is canonical (`[ASK USER 2]`). Until then, run the harness against the Next handlers too, or share one handler core |
| **High** | Rate limiting draws on the same 1,000-writes/day free KV budget as the page cache | Every allowed hit does a KV `put` (`lib/rate-limit-core.ts:98,109`). `RATE_LIMIT_KV`, `NEXT_INC_CACHE_KV` and `NEXT_TAG_CACHE_KV` are one namespace, previews included (`wrangler.jsonc`). Budget per `open-next.config.ts`/README | Ordinary traffic on public rate-limited routes (likes, comments, assistant) can use up the daily writes. After that, cache writes **and** counter writes fail. Failed puts are logged and the request is allowed (`:99-101,113-115`), so limits silently stop working | Move counters to a Durable Object or a separate namespace on a paid plan, or use Cloudflare's Rate Limiting binding |
| **High** | The Impeccable surface briefs and detector config were deleted in an unrelated commit | `85465ce` moved `.impeccable/*` → `.agents/`; `0b799fc` ("Add migration for blog-images storage bucket…", 142 files) deleted `.agents/`. `CLAUDE.md` and `README.md` still require keeping `.impeccable/surfaces/` in sync | Contributors and agents are told to update files that don't exist. Per-route design briefs are lost from the working tree (still recoverable from git) | `[ASK USER 1]`. Restore from `85465ce^`, or update `CLAUDE.md`/`README.md` |
| **Med** | No deploy automation is in the repo, while the README describes one | `.github/workflows/deploy.yml` deleted in `85465ce` ("Add surface definitions … and implement CI workflows"). README says the GitHub Actions `Deploy` workflow "is on `main`" and to **turn Workers Builds off** | If someone follows the README, nothing deploys. Meanwhile `scripts/build-next-or-worker.mjs` (`WORKERS_CI`) shows Workers Builds is the live path | `[ASK USER 3]`. Restore the workflow, or fix the README |
| **Med** | The production deploy guard doesn't run on the Workers Builds path | `check-production-env.mjs` is wired only to `predeploy`, `preupload` and `deploy-guard` (`package.json:29,31,49`). `scripts/build-next-or-worker.mjs` never calls it | A dashboard build missing `NEXT_PUBLIC_SUPABASE_*` would ship local mode, where `requireEditor()` allows every write (`lib/cms/auth.ts:61-63`). Mitigated today because `.env.production` commits both values | Call the guard from `build-next-or-worker.mjs` when `WORKERS_CI=1` |
| **Med** | Rate-limit identity in the Next build comes from a header the client can set | `lib/rate-limit.ts` `clientKey` uses the **first** `x-forwarded-for` value. The Pages copy prefers `cf-connecting-ip` and notes client values are stripped at the edge (`cloudflare-pages/src/server/http.ts:12-17`) | **Plausible, verify live:** if Cloudflare passes a client-sent `X-Forwarded-For` through with its own value appended, a client can rotate keys and bypass every limit. That includes `likes` (inflating counts; the like `PATCH` has no origin check) and `assistant` (spending Gemini) | Port the Pages `clientIp()` into `lib/rate-limit.ts` |
| **Med** | Two lockfiles again | `package-lock.json` deleted in `322ad72`, re-added in `0b799fc`, updated since. README says `bun.lock` is "the only lockfile"; `open-next.config.ts` forces `npm run build` | CI (`bun install --frozen-lockfile`) and a Worker host (npm) can resolve different trees | `[ASK USER 4]` |
| **Low** | `?secret=` is still accepted on `/api/revalidate` while query strings are logged | `app/api/revalidate/route.ts:39`; `wrangler.jsonc` `redact_query_string: false` | A webhook configured with the query form writes the secret to Cloudflare logs | Drop the query fallback (Pages tests at `test/pages/webhook-email.test.ts:55` pin it, so update both) or redact query strings |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| Dual server implementations | Next → Pages migration in progress | `app/api/` vs `cloudflare-pages/src/server/api/`; `docs/migration-baseline.md` | Every API change made twice; drift | Finish or abandon the port (`[ASK USER 2]`) |
| `lib/db.ts` synchronous legacy layer | Kept for remaining callers | `lib/db.ts` header: "do not extend it"; imported by `lib/legacy/{seeds,types}.ts` | A third storage concept alongside CMS and legacy bridge | Fold seed reads into `lib/legacy` |
| Three `cn` helpers | shadcn `lib/utils.ts` + primitives `cx` + an old `lib/format.ts` | `lib/utils.ts` (14 importers), `components/primitives/cx` (13), `lib/format.ts` `cn` (0) | Divergent class merging (only `lib/utils` dedupes Tailwind classes) | Delete `lib/format.ts` `cn` |
| Stale `package.json` fields | Scaffold leftovers | `"type": "commonjs"`, `"main": "index.js"` (no such file) | Misleads tooling and readers | Remove `main`; drop or correct `type` |
| Large untested UI files | Feature accretion | `components/cms/PostEditor.tsx` 937, `components/motion/MotionLab.tsx` 895, `app/write/page.tsx` 816, `components/cms/QwenCoverGenerator.tsx` 494 | Hard to change safely | Split; add jsdom tests for the studio |
| Root planning docs | Agent-generated plans committed at root | `INTEGRATION_PLAN.md` (952 lines), `implementation-plan.md` (804) | Readers can't tell plan from state | Move to `docs/plans/`, mark status |
| Lint warning | Anonymous default export | `open-next.config.ts:18` | Noise in `npm run lint` | Assign to a const |
| `scan.py` output polluted | `.open-next/` and `.wrangler/tmp/` aren't excluded by the skill's scanner | `docs/codebase/.codebase-scan.txt` TODO + METRICS sections | Misleading metrics (e.g. "120,007 LOC", 15 MB "largest files") | Ignore those sections; see STRUCTURE.md for source-only numbers |

**Source TODO/FIXME/HACK:** none. `git grep -nE '\b(TODO|FIXME|HACK|XXX)\b'` over `app components lib cloudflare-pages scripts supabase middleware.ts emails tokens` returns nothing. All 41 TODO matches in the scan come from build output (`.open-next/`, `.wrangler/tmp/`).

### 3) Security Concerns

| Risk | OWASP | Evidence | Current mitigation | Gap |
|------|-------|----------|--------------------|-----|
| Spoofable client key for rate limits | A04 Insecure Design | `lib/rate-limit.ts` `clientKey` | KV-backed limits | Header trust (see Top Risks); verify against a live request |
| Like endpoint has no origin check | A01 | `app/api/articles/[id]/route.ts` `PATCH` (rate limit only) | 30/min limit | Combined with the above, counts can be inflated |
| Local mode = open studio | A05 Misconfiguration | `lib/cms/auth.ts:61-63`, `middleware.ts:14-16` | Deploy guard on `deploy`/`upload`; committed `.env.production` | Guard absent from the Workers Builds path |
| RLS is the only authorisation boundary | A01 | `supabase/migrations/*.sql` | `is_editor()` SECURITY DEFINER, fails closed; no service-role key in the app; 2 pgTAP suites | pgTAP isn't run in CI |
| Secret in query string + unredacted logs | A09 | `app/api/revalidate/route.ts:39`, `wrangler.jsonc` | Header path documented as primary | Fallback still live |
| CSP allows `'unsafe-inline'` scripts | A03 | `next.config.ts` `cspDirectives` | Needed for the theme-init script and JSON-LD; JSON-LD escapes `<` (`lib/seo/jsonld.ts:167`) | No nonce/hash-based CSP. `Content-Security-Policy-Report-Only` duplicates the enforced policy and has no `report-to`, so it reports nothing |

**Positive findings:** model SVG sanitised and rendered as `<img>` (`lib/svg.ts`); HF credentials are environment-only; `/api/generate` is editor-gated with a 60 s bound; Gemini calls carry `AbortSignal.timeout`; HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'`; `safeNextPath()` on the OAuth callback; timing-safe secret comparison; bylines resolve only from *published* profiles (`lib/cms/authors.ts`).

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| KV write budget (above) | `lib/rate-limit-core.ts`, `wrangler.jsonc` | — | Cache and limiter both stop writing | Separate store for counters |
| KV read-modify-write isn't atomic, and reads are eventually consistent | `lib/rate-limit-core.ts:89-115` | Concurrent bursts under-count | Limits are soft at scale | Durable Object counter |
| Whole catalogue materialised per cache miss | `lib/cms/catalogue.ts` `getArticleCatalogue` merges every published post + corpus | Fine today (cached 30 s, tag-invalidated) | O(n) per miss as the archive grows | Paginate or index |
| `/post/[slug]` is dynamic by design | `lib/cms/catalogue.ts:80-86` comment | Data read cached; render not | CPU per view | Accepted trade-off for real 404s |
| `next/image` serves originals | `wrangler.jsonc` (no Images binding) | Larger image bytes | LCP on slow links | Images binding or pre-compressed assets |

### 5) Fragile/High-Churn Areas

Churn over the last 90 days (`.codebase-scan.txt`, valid now that history is complete):

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| `components/BlogHeader.tsx`, `components/BlogFooter.tsx` | Global chrome in both build targets | 15 / 10 commits | Check both `npm run build` and `npm run build:pages`; see `docs/header-footer-audit-2026-11-09.md` |
| `app/post/[slug]/page.tsx` (466 lines) | Caching/404 semantics documented in comments; dynamic by design | 12 | Keep `notFound()` + no `generateStaticParams`; verify an unknown slug still 404s |
| `app/write/page.tsx`, `components/cms/PostEditor.tsx` | Largest files, no tests | 10 / 8 | Add jsdom tests before refactoring |
| `app/layout.tsx`, `app/globals.css` | Fonts, theme init, tokens | 10 / 10 | Run `tokens:check` and Impeccable |
| `next.config.ts` | CSP and security headers | 9 | Test in `next dev` (needs `unsafe-eval`) and in the Worker |
| `package.json` / lockfiles | Two package managers | 15 / 12 / 9 | Resolve `[ASK USER 4]` first |
| `README.md`, `DESIGN.md`, `.env.example` | Most-edited docs, and already contradicting each other | 16 / 9 / 11 | See intent-vs-reality list below |

### 6) `[ASK USER]` Questions

1. **[ASK USER]** `.impeccable/` (surface briefs + config) and `.agents/` were deleted in `0b799fc`, a commit titled as a storage migration. Was that intentional? If not, should they be restored from `85465ce`? If it was, should `CLAUDE.md` and `README.md` stop requiring `.impeccable/surfaces/`?
2. **[ASK USER]** Which build target is the future: the Next/OpenNext Worker (production today) or the `cloudflare-pages/` Vite port? The API is implemented twice, and only the Pages copy has behavioural tests.
3. **[ASK USER]** `.github/workflows/deploy.yml` was deleted in `85465ce`. Is Cloudflare Workers Builds now the only deploy path? If so, the README's "turn Workers Builds off" instruction is wrong.
4. **[ASK USER]** Bun or npm? `package-lock.json` came back after being deleted, and the Worker build is pinned to `npm run build`. Should one lockfile go?
5. **[ASK USER]** Fonts: `CLAUDE.md` and `PRODUCT.md` say **Aptos** (Serif/Sans/Mono). `DESIGN.md`, `README.md` and `app/layout.tsx` use **Newsreader / Inter / JetBrains Mono**, and Aptos appears nowhere in code or tokens. Which is intended?
6. **[ASK USER]** `CLAUDE.md` requires Conventional Commits, but only 9 of the last 30 commits follow them. Enforce it (e.g. commitlint), or relax the rule?
7. **[ASK USER]** The Resend email subsystem (6 scenarios, including `billing-receipt` for a product with no billing) is fully built but never called by any route. Should it be wired up, trimmed, or removed? `PRODUCT.md` states "No email is sent".

### 7) Evidence

- `git show --stat 85465ce`, `git show --stat 0b799fc`, `git log --diff-filter=AD -- package-lock.json .github/workflows/deploy.yml`
- `test/support/pages.ts`, `test/pages/*`, `git grep "@/app/" lib/__tests__ test`
- `lib/rate-limit.ts`, `lib/rate-limit-core.ts`, `cloudflare-pages/src/server/http.ts`, `wrangler.jsonc`, `open-next.config.ts`
- `package.json`, `scripts/build-next-or-worker.mjs`, `scripts/check-production-env.mjs`, `lib/cms/auth.ts`, `middleware.ts`
- `app/api/revalidate/route.ts`, `app/api/articles/[id]/route.ts`, `next.config.ts`
- `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, `README.md`, `app/layout.tsx`
- Command output 2026-11-13: tests 691/692, lint 1 warning, typecheck clean, Impeccable 0 findings / 7 advisories

## Extended Sections

### Intent vs. reality (from Phase 1)

| Stated in | Claim | Reality |
|---|---|---|
| `CLAUDE.md`, `PRODUCT.md` | Aptos font family | Newsreader / Inter / JetBrains Mono (`app/layout.tsx:11-25`); no Aptos anywhere in code |
| `PRODUCT.md` | Palette: "deep amber/ochre accents, emerald verification indicators" | `DESIGN.md` v3.1: a single blue accent (`#1D4ED8`), with `verified` also blue; emerald (`#047857`) is used only for `replicated` (`DESIGN.md:28-29`) |
| `PRODUCT.md` | "No email is sent" | True at runtime, but a complete Resend subsystem ships in `lib/email/` |
| `CLAUDE.md`, `README.md` | Keep `.impeccable/surfaces/` in sync | Directory deleted (`0b799fc`) |
| `README.md` | `bun.lock` is the only lockfile | `package-lock.json` tracked |
| `README.md` | GitHub Actions `Deploy` workflow on `main` | Only `quality.yml` exists |
| `README.md` | "0 Impeccable findings" | Still true for findings; 7 colour advisories |
| `CLAUDE.md` | Stack "Next.js 15 App Router … Supabase" | True, plus an undocumented second target (`cloudflare-pages/`) |

### Resolved since the previous version (verified absent or fixed)

`/api/generate` and `/api/author-avatar` are now gated; HF credentials no longer come from the browser; model SVG is sanitised; `public.editor_memberships` is dropped; `.eslintrc.json` and `hooks/` are deleted; `/write` publishes through `/api/cms/posts`; rate limiting is KV-backed; the forgeable `rwm_session` cookie and `/api/auth/*` routes are gone (`app/api/auth/` doesn't exist); the manuscript intake is removed; `revalidateComments()` is deleted.
