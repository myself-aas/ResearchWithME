# Codebase Concerns (Post-Remediation Status)

> Post-remediation snapshot on branch `arena/d0437759-researchwithme` (built on commit `027c746bbbdf3f7a3871c0a7e2b4ecaadec066c9`, verified `2026-11-17`).
> All critical/high findings and all 9 owner-confirmed architectural decisions from the initial `027c746` audit have been remediated and verified across lint, typecheck, unit/route tests, production build, performance budgets, and release gates.

## Core Sections (Required)

### 1) Remediation Summary (Resolved Findings)

| Prior Severity | Resolved Concern | Resolution Implemented | Verification |
|----------------|------------------|------------------------|--------------|
| **High** | **LinkedIn security & editorial-only policy** | Added HMAC-SHA256 webhook verification (`verifyHmacSha256Signature`), signed HTTP-only OAuth `state` cookie CSRF validation, `requireEditorInChief()` RBAC on all admin LinkedIn routes, constant-time `CRON_SECRET` comparison (`timingSafeEqualStrings`), per-ciphertext KDF salt (`v2:` in `lib/crypto.ts`), and strict `publication_type = 'editorial'` + `status = 'published'` gating | `test/next/linkedin-routes.test.ts` (10/10 PASS), `lib/linkedin/__tests__/*` (43/43 PASS) |
| **High** | **Broken SQL migrations & LinkedIn runtime/RLS mismatch** | Fixed `20261113000200_reconcile_after_cleanup.sql` (`editors` columns & conditional `role`), normalized LinkedIn migration timestamps (`20261115000100_linkedin_tokens.sql`, `20261115000200_linkedin_events.sql`), added `20261116000200_linkedin_editorial_bridge.sql` (`SECURITY DEFINER` bridge-secret RPCs + durable `linkedin_posts` deduplication), awaited webhook execution / `ctx.waitUntil`, fixed `posts` table check, and normalized cover URLs | `npm run typecheck`, `test/next/linkedin-routes.test.ts`, `lib/linkedin/__tests__/*` |
| **High** | **Red CI (`npm run reme:test`)** | Retained all 5 `ResearchWithME-v3.4-*` files as active target roadmap, scrubbed retired pre-`reme` spellings in `ResearchWithME-master-refactor-development-plan-v3.4.md`, and refreshed `ResearchWithME-v3.4-SHA256SUMS.txt` | `sha256sum -c` (4/4 OK), `npm run reme:check && npm run reme:test` (5/5 PASS) |
| **Medium** | **Shared Cloudflare KV write pressure (1,000 writes/day free cap)** | Added Cloudflare native Workers Rate Limiting binding `APP_RATE_LIMITER` (`namespace_id: "2002"`) in `wrangler.jsonc` + `createCloudflareRateLimitStore()` in `lib/rate-limit-core.ts`; removed `RATE_LIMIT_KV` from production and preview KV bindings so general IP rate limiting uses **zero KV writes** | `lib/__tests__/rate-limit.test.ts` (20/20 PASS) |
| **Medium** | **Double-divided `Retry-After / 1000` headers** | Removed erroneous `/ 1000` division in `app/api/a2a/route.ts`, `app/api/dashboard/applications/route.ts`, and `app/api/dashboard/applications/[id]/route.ts` | `npm test`, `npm run typecheck` |
| **Medium** | **Diverging `cloudflare-pages/` mirror** | Retired `cloudflare-pages/` and its mirror tests/scripts; moved Next.js Vitest shims into `test/stubs/next/` and ported all protocol tests (`a2a`, `mcp`, `web-bot-auth`, `agent-skills`, `auth-md`, `oauth-discovery`, `oauth-resilience`, `agent-auth-discovery`, `compat`) into `test/next/` | `npm test` (142/142 files, 956/956 tests PASS) |
| **Medium** | **Dual Markdown editors (`@mdxeditor/editor` vs `platejs`)** | Migrated `/dashboard/(studio)` (`components/cms/PostEditor.tsx`) onto `PlateBodyEditor` with Supabase `blog-images` inline image upload support, deleted `components/cms/MarkdownEditor.tsx`, removed `.mdxeditor` CSS workaround, and uninstalled `@mdxeditor/editor` (-121 packages) | `lib/__tests__/editorial-publication-ui.test.tsx`, `plate-body-editor.test.tsx`, `npm run build` |
| **Medium** | **Assistant Worker unwired & CI coverage gaps** | Enabled `ASSISTANT` service binding (`researchwithme-assistant` / `AssistantService`) in `wrangler.jsonc` and added `dns:test`, `webmcp:test`, `worker:assistant:check`, and Python `products/tests/` to `.github/workflows/quality.yml` | `npm run worker:assistant:check` (121.46 KiB gzip), `dns:test` (6/6), `webmcp:test` (15/15), Python unittest (20/20) |
| **Medium** | **Brand/font drift, `.ttf` payload, env docs, & repo bloat** | Converted `Plus Jakarta Sans` from 173 KB `.ttf` to 60 KB `.woff2` (-65%), removed duplicate `public/fonts/` files, aligned `README.md`/`CLAUDE.md`/`PRODUCT.md`/`app/layout.tsx`/`public/AGENTS.md`, removed duplicate CSP header in `next.config.ts`, completed `.env.example`, parameterized `.mcp.json` + optional `OAUTH_METADATA_SNAPSHOT_JSON`, and untracked `pglite-*.whl`, `references/`, `data/skills/`, `.agents/skills/skills/`, and `products/downloads/*.zip` | `npm run build`, `npm run budgets` (193.1 KB <= 200 KB), `npm run release:gate` (12/12 PASS) |

### 2) Remaining Active Concerns & Technical Debt

| Severity | Concern | Where | Impact / Next Step |
|----------|---------|-------|--------------------|
| **Medium** | **Live Postgres migration replay not yet wired into GitHub Actions** | `supabase/migrations/` (`17` migrations), `supabase/tests/` | SQL syntax/ordering/RLS policies are audited and fixed in source, but CI does not yet spin up Docker/PGlite to execute all 17 migrations + `pgTAP` tests automatically. Wire `npx supabase test db --local` or PGlite runner in CI. |
| **Medium** | **Operational secret provisioning before deploying LinkedIn + Assistant Worker** | `wrangler.jsonc`, `.env.example`, `supabase/migrations/20261116000200_linkedin_editorial_bridge.sql` | Before deploying the updated main Worker to production: (1) deploy `npm run worker:assistant:deploy` and set its `GEMINI_API_KEY` secret so the `ASSISTANT` binding resolves; (2) apply migrations `20261115000100`–`20261116000200` and seed `private.linkedin_settings` (`bridge_secret`), `LINKEDIN_BRIDGE_SECRET`, `LINKEDIN_WEBHOOK_SECRET`, `ENCRYPTION_SECRET`, `CRON_SECRET`, and LinkedIn OAuth secrets; (3) configure the Supabase Database Webhook on `public.posts` to sign requests with `LINKEDIN_WEBHOOK_SECRET`. |
| **Low** | **Pre-launch "Co-pilot" subscription scaffolding** | `lib/billing/store.ts`, `supabase/migrations/20261113000300_billing.sql`, `.env.example` | Intentionally retained for upcoming launch (`billing_subscriptions`, `LEMONSQUEEZY_VARIANT_COPILOT`); expose in `lib/billing/catalogue.ts` when ready to sell. |
| **Low** | **In-memory catalogue load on assistant/search queries** | `lib/cms/catalogue.ts`, `lib/assistant/service.ts` | Works cleanly for current editorial archive size (30s ISR cache), but should move to Postgres full-text search or `pgvector` as the archive scales to hundreds of long-form articles. |
| **Low** | **Large monolithic form/UI modules (>700 LOC)** | `components/cms/PostEditor.tsx`, `components/motion/MotionLab.tsx`, `app/write/page.tsx`, `products/build.py`, `app/globals.css`, `lib/dashboard/metrics.ts` | Candidate for incremental decomposition during future feature work. |
| **Low** | **Direct route-handler test gaps on remaining legacy CRUD routes** | `app/api/cms/posts/[id]`, `app/api/cms/comments*`, `app/api/comments`, `app/api/dashboard/applications*` | Core public/billing/API v1/LinkedIn/protocol routes now have direct tests in `test/next/`; expanding `test/next/` to remaining CRUD endpoints will close the final coverage gap. |

### 3) Resolved Owner Decisions (`[ASK USER]` — 0 Open)

1. **`[RESOLVED]` v3.4 Prisma Roadmap (`ResearchWithME-v3.4-*`):** Kept as active target roadmap; retired pre-`reme` spellings scrubbed and checksums refreshed.
2. **`[RESOLVED]` LinkedIn Automation:** Hardened as a first-class feature strictly for **editorial posts** (`publication_type = 'editorial'`, `status = 'published'`).
3. **`[RESOLVED]` Cloudflare Architecture:** Standardized on root OpenNext Worker (`wrangler.jsonc`); `cloudflare-pages/` retired.
4. **`[RESOLVED]` Brand Typography & Palette:** Standardized on `Plus Jakarta Sans` (WOFF2) + `#F8F9FA` canvas / `#005BBF` cobalt; docs and comments reconciled.
5. **`[RESOLVED]` Subscriptions ("Co-pilot"):** Retained `billing_subscriptions` scaffolding for upcoming launch.
6. **`[RESOLVED]` Editor Unification:** Standardized exclusively on `platejs` (`PlateBodyEditor.tsx`); `@mdxeditor/editor` and `MarkdownEditor.tsx` removed.
7. **`[RESOLVED]` Budget-Friendly Rate Limiting:** Moved off `RATE_LIMIT_KV` onto native Cloudflare Workers Rate Limiting binding (`APP_RATE_LIMITER`, zero KV writes).
8. **`[RESOLVED]` Assistant Worker (`workers/assistant/`):** Enabled `ASSISTANT` service binding in `wrangler.jsonc` and gated `worker:assistant:check` in CI.
9. **`[RESOLVED]` Env Parameterization & Repo Hygiene:** Parameterized `.mcp.json` + optional `OAUTH_METADATA_SNAPSHOT_JSON`; removed committed wheel, `references/`, duplicate `data/skills/`, duplicate `public/fonts/`, flattened `.agents/skills/skills/`, and buildable `products/downloads/*.zip`.

### 4) Evidence

- `npm run tokens:build && npm run tokens:check` — PASS (0 unresolved refs across 350 source files, all WCAG AA contrast checks pass)
- `npm run lint` — PASS (0 errors, 0 warnings)
- `npm run typecheck` — PASS (0 TS errors)
- `npm test` — PASS (`142/142` test files, `956/956` tests)
- `npm run dns:test` (6/6), `npm run webmcp:test` (15/15), `npm run reme:check && npm run reme:test` (5/5), `npm run worker:assistant:check` (121.46 KiB gzip), `npm run impeccable:source` (PASS), `python3 -m unittest discover -s products/tests -p 'test_*.py'` (20/20)
- `npm run build && npm run budgets && npm run release:gate` — PASS (193.1 KB <= 200 KB gzip shell budget; 12/12 release gate machine checks PASS)
