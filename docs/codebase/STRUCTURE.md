# Codebase Structure

> Snapshot updated post-remediation on branch `arena/d0437759-researchwithme` (`973` tracked files; `cloudflare-pages/`, `references/`, `data/skills/`, `pglite-*.whl`, duplicate fonts, and buildable `products/downloads/*.zip` removed).

## Core Sections (Required)

### 1) Top-Level Map

| Path | File Count | Purpose | Evidence |
|------|------------|---------|----------|
| `(root)` | 33 | App manifests, Next/OpenNext/Wrangler/TS/ESLint/Vitest configs, `middleware.ts`, intent docs (`README.md`, `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, `PAGE_TREE.md`, `CHANGELOG.md`, `INTEGRATION_PLAN.md`), `audit-report.md`, `metadata.json`, 5 unimplemented v3.4 Prisma refactor files (`ResearchWithME-*`), and `pglite-1.0.14-py3-none-any.whl` | `git ls-tree`, `package.json`, `middleware.ts` |
| `app/` | 101 | Primary Next.js 15 App Router: pages, layouts, metadata (`sitemap.ts`, `robots.ts`, `manifest.ts`, `opengraph-image.tsx`), 44 route handlers (`27` in `app/api/**`, `9` in `app/.well-known/**`, `8` top-level machine/protocol routes), `globals.css`, and bundled fonts (`app/fonts/`) | `app/layout.tsx`, `app/page.tsx`, `app/api/`, `app/.well-known/` |
| `lib/` | 251 | Domain logic & tests (`125` production TS files, `126` test/snapshot files): CMS, billing, metered API v1, AI assistant, LinkedIn automation, Resend email, Supabase clients, dashboard metrics, charts, scholarly citation helpers, protocol engines (`mcp.ts`, `a2a.ts`, `openapi.ts`, `web-bot-auth.ts`, `oauth-*.ts`, `api-catalog.ts`), rate limiting, crypto, SEO, Zustand store | `lib/cms/`, `lib/billing/`, `lib/api/`, `lib/linkedin/`, `lib/assistant/`, `lib/__tests__/` |
| `components/` | 129 | React UI library (`120` `.tsx`, `9` `.ts`/`.css`) organized by feature domain (`account/`, `auth/`, `billing/`, `charts/`, `cms/`, `dashboard/`, `editor/`, `graph/`, `layout/`, `lottie/`, `media/`, `motion/`, `primitives/`, `reader/`, `scholarly/`, `search/`, `ui/`, `workflows/`, `workspace/`) plus root-level editorial shell components (`BlogHeader`, `BlogFooter`, `MarkdownBody`, `ResearchAssistant`, etc.) | `components/cms/PostEditor.tsx`, `components/primitives/index.ts` |
| `cloudflare-pages/` | 56 | Parallel Vite 7 + React Router 6 SSR implementation targeting Cloudflare Pages (`functions/[[path]].ts`), Next.js compatibility shims (`src/compat/`), SSR loaders, and 10 mirrored API route modules | `cloudflare-pages/functions/[[path]].ts`, `cloudflare-pages/src/routes.tsx`, `cloudflare-pages/src/server/dispatch.ts` |
| `workers/assistant/` | 3 | Standalone Cloudflare Worker (`researchwithme-assistant`) exposing `AssistantService` (`WorkerEntrypoint` RPC) for Gemini synthesis; currently commented out in root `wrangler.jsonc` | `workers/assistant/src/index.ts`, `workers/assistant/wrangler.jsonc` |
| `supabase/` | 28 | Supabase CLI config (`config.toml`), 16 SQL migrations (`20261025000100`–`20261116000100`), 6 DB verification files (`pgTAP` `.test.sql` + PGlite `.check.mjs`), cleanup & reconciliation docs/scripts | `supabase/migrations/`, `supabase/tests/`, `supabase/config.toml` |
| `test/` | 67 | Multi-tier test suites: 4 Playwright configs, 12 E2E specs, 1 browser spec, 9 Next API tests (`test/next/`), 25 Pages tests (`test/pages/`), 1 HTTP baseline contract test (`test/contracts/`), 5 Node built-in `.mjs` suites, and JSON fixtures (`test/fixtures/`) | `test/next/`, `test/pages/`, `test/e2e/`, `test/contracts/` |
| `tokens/` | 15 | Design-token single source of truth: 5 JSON source files (`tokens/src/`), 4 Node `.mjs` pipeline scripts (`tokens/scripts/`), and 6 generated outputs (`tokens/generated/`) | `tokens/src/`, `tokens/scripts/build.mjs`, `tokens/generated/` |
| `products/` | 43 | Standalone Python 3 stdlib research CLI toolkits & guides (`manuscript-check`, `reference-check`, `response-to-reviewers-check`, `statistical-table-generator`, `teardown-system`, `journal-matchmaker`, `manuscript-formatter`), packager (`products/build.py`), 5 built `.zip` archives (`products/downloads/`), and 6 `unittest` files (`products/tests/`) | `products/build.py`, `products/src/`, `products/tests/` |
| `emails/` | 6 | React Email templates (`_layout.tsx` + 5 transactional scenarios: `welcome`, `verify-email`, `password-reset`, `security-alert`, `support-reply`) | `emails/_layout.tsx`, `lib/email/scenarios.ts` |
| `scripts/` | 15 | Build, environment validation, performance budget, release-gate, DNS-AID Cloudflare automation, Resend template sync, Web Bot Auth fetch, visual parity, reme lint, and profile migration verification scripts | `scripts/build-next-or-worker.mjs`, `scripts/release-gate.mjs` |
| `public/` | 33 | Static web assets: brand SVGs, favicons, `webmcp.js`, 2 free `.zip` downloads (`public/downloads/`), duplicate font files (`public/fonts/`), `_headers`, `_routes.json`, `AGENTS.md`, `.well-known/security.txt` | `public/webmcp.js`, `public/_routes.json`, `public/fonts/` |
| `videos/` | 47 | 3 Hyperframes video composition projects (`edition-trailer`, `explainer`, `radar-chart`) + shared token bridge (`videos/shared/reme-tokens.mjs`) | `videos/shared/reme-tokens.mjs` |
| `styles/` | 1 | `styles/daisy-themes.css` defining `reme-light` and `reme-dark` DaisyUI themes | `styles/daisy-themes.css`, `app/globals.css` |
| `docs/` | 82 | Architecture/product/design/audit docs, `docs/codebase/` (7 codebase-map docs), `docs/superpowers/` (plans & specs), `docs/audits/`, `docs/email/`, `docs/security/` | `docs/codebase/`, `docs/superpowers/` |
| `data/` | 41 | Contains `data/skills/` (duplicated Supabase/Postgres agent skill docs + symlink `data/skills/svg-logo-designer`); contains **no** JSON seed fixtures despite `README.md` claiming otherwise | `data/skills/`, `lib/cms/local-store.ts` |
| `.github/` | 6 | Active GitHub Actions workflows (`quality.yml`, `linkedin-automation.yml`, `pr-title.yml`), custom agent (`reme-article-writer.agent.md`), and Markdown instructions (`reme-artcile-writing.instructions.md` — typo in filename) | `.github/workflows/` |
| `.agents/` / `.impeccable/` | 118 / 32 | Agent skill definitions, archived legacy Bun/HF workflows (`.agents/workflows/`), and `impeccable` design detector rules/config | `.agents/`, `.impeccable/config.json` |
| `references/` | 456 | Committed external reference repositories/tokens (Google Blog reference & Material Web tokens); not imported by runtime code | `references/` |

### 2) Entry Points

- **Main runtime entry (Next.js / OpenNext Cloudflare Worker):**
  - Request interception: `middleware.ts` (rewrites `Accept: text/markdown` requests on public routes to `/agent-markdown`; guards `/dashboard/:path*` when Supabase is configured).
  - App shell: `app/layout.tsx` + `app/page.tsx`.
  - Worker bundle entry (generated at build time): `.open-next/worker.js` declared in `wrangler.jsonc` (`main: ".open-next/worker.js"`).
- **Secondary entry points:**
  - **Cloudflare Pages SSR catch-all:** `cloudflare-pages/functions/[[path]].ts` -> `cloudflare-pages/src/server/dispatch.ts` (API/protocol dispatch) + `cloudflare-pages/src/entry-server.tsx` (React Router SSR) + `cloudflare-pages/src/entry-client.tsx` (browser hydration).
  - **Isolated Assistant RPC Worker:** `workers/assistant/src/index.ts` exporting `AssistantService extends WorkerEntrypoint<Env>` (`workers/assistant/wrangler.jsonc`).
  - **Browser WebMCP script:** `public/webmcp.js` loaded in `app/layout.tsx` to register client-side tools on `document.modelContext` and `navigator.modelContext`.
  - **CLI & automation scripts:** `scripts/build-next-or-worker.mjs`, `scripts/check-production-env.mjs`, `scripts/release-gate.mjs`, `scripts/dns-aid-cloudflare.mjs`, `scripts/sync-templates.ts`, `tokens/scripts/build.mjs`, `products/build.py`.
  - **Scheduled automation:** `.github/workflows/linkedin-automation.yml` calls `GET /api/cron/linkedin-batch` hourly via `curl` with `Authorization: Bearer $CRON_SECRET`.
- **How entry is selected:**
  - `npm run build` invokes `scripts/build-next-or-worker.mjs`, which runs `next build` locally and switches to `scripts/check-production-env.mjs && npx opennextjs-cloudflare build` when `WORKERS_CI=1`.
  - `npm run build:pages` builds `cloudflare-pages/dist/` via `cloudflare-pages/vite.config.ts` and `cloudflare-pages/vite.config.server.ts`.

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `app/` (Pages & Route Handlers) | Routing, request parsing, HTTP headers/status codes, `export const runtime`/`revalidate`/`dynamic`, auth/origin/rate-limit checks, delegating to `lib/` | Direct SQL/schema definitions, duplicated business logic across Next and Pages |
| `lib/` (Domain & Infrastructure) | Pure business rules, CMS/billing/API/LinkedIn stores, protocol serializers (`mcp.ts`, `a2a.ts`, `openapi.ts`), crypto, validation, rate limiting; 14 server-only files enforced by `import 'server-only'` | React JSX/DOM manipulation (except client hooks like `lib/supabase/use-session.ts` and `lib/stores/preferences-store.ts`) |
| `components/` (UI Layer) | Presentational and interactive React components (`85` `'use client'` files across app/components/lib), primitives (`components/primitives/`), editors, charts, dashboard widgets | Direct database/Supabase admin calls, secret env reads (`process.env.*` secrets) |
| `supabase/migrations/` | Idempotent PostgreSQL DDL, RLS policies, `SECURITY DEFINER` RPCs, triggers, storage bucket definitions | Application runtime secrets; non-idempotent DDL (violated by `20261115_linkedin_*.sql`) |
| `tokens/src/` vs `tokens/generated/` | Hand-edited JSON design tokens in `tokens/src/`; machine-generated CSS/SCSS/JSON/TS outputs in `tokens/generated/` | Hand edits inside `tokens/generated/` (verified/overwritten by `tokens/scripts/build.mjs`) |
| `cloudflare-pages/` | Thin Pages Functions dispatcher, Next.js shims (`src/compat/`), React Router route wrappers importing shared `lib/` and `components/` | Divergent forks of domain logic (note: `cloudflare-pages/src/server/api/` currently reimplements 10 API handlers manually) |
| `products/` | Self-contained zero-dependency Python 3 stdlib CLI packages + tests + build packager | Node.js/Next.js runtime dependencies |

### 4) Naming and Organization Rules

- **File naming patterns:**
  - `app/`: Next.js App Router conventions (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `globals.css`) with kebab-case directories and dynamic segments (`[slug]`, `[id]`, `[keyId]`, `(studio)` route group).
  - `components/`: `PascalCase.tsx` for React components (`PostEditor.tsx`, `ResearchAssistant.tsx`, `ArticleCard.tsx`); `kebab-case.ts` or `camelCase.ts` for helper/style modules (`styles.ts`, `cx.ts`, `index.ts`).
  - `lib/`: `kebab-case.ts` across all domain subdirectories (`rate-limit-core.ts`, `article-extractor.ts`, `oauth-discovery.ts`).
  - `supabase/migrations/`: 14-digit timestamp prefix `YYYYMMDDHHMMSS_description.sql` (violated by `20261115_linkedin_events.sql` and `20261115_linkedin_tokens.sql`, which use 8-digit prefixes).
  - `products/src/`: `kebab-case/` package directories with `snake_case.py` modules.
- **Directory organization pattern:** Hybrid **layer-first at top level** (`app/`, `lib/`, `components/`, `supabase/`, `test/`), then **domain/feature-first inside `lib/` and `components/`** (`cms/`, `billing/`, `api/`, `linkedin/`, `dashboard/`, `charts/`, `scholarly/`, `reader/`, `motion/`).
- **Import aliasing:** `@/*` maps to repo root `./*` in both `tsconfig.json` and `vitest.config.ts` (`823` `@/` imports vs `303` relative imports across production TS/TSX). `cloudflare-pages/vite.config*.ts` remaps `next/*` imports to `cloudflare-pages/src/compat/`.

### 5) Evidence

- `git ls-tree -r --name-only 027c746` (1,566 files)
- `/tmp/codebase-scan.txt` (generated by `acquire-codebase-knowledge` `scan.py`)
- `middleware.ts`
- `tsconfig.json`
- `wrangler.jsonc`
- `cloudflare-pages/functions/[[path]].ts`
- `cloudflare-pages/src/routes.tsx`
- `cloudflare-pages/src/server/dispatch.ts`
- `workers/assistant/src/index.ts`
- `tokens/scripts/build.mjs`
- `scripts/build-next-or-worker.mjs`
- `products/build.py`

## Extended Sections (Optional)

### Subdirectory Deep Maps

- **`app/` Route Tree (44 route handlers + App Router pages):**
  - *Public pages:* `/`, `/about`, `/contact`, `/authors`, `/author/[id]`, `/post/[slug]`, `/category/[slug]`, `/archive`, `/saved`, `/cite`, `/datasets`, `/research-graph`, `/pricing`, `/api-docs`, `/motion`, `/write`, `/login`, `/privacy`, `/terms`, `/accessibility`, `/editorial-policy`.
  - *Role-gated Dashboard (`/dashboard`):* `/dashboard` (redirects to `/dashboard/desk` for editors or `/dashboard/reading` for readers), `/dashboard/desk` (editorial desk metrics), `/dashboard/writing` (author analytics), `/dashboard/reading` (reader activity), `/dashboard/account` (profile + API keys), `/dashboard/access` (editor/writer application status), and `/dashboard/(studio)/` route group (`new`, `edit/[id]`, `comments`, `applications`, `guides`, `studio` layout enforced by `isEditor`).
  - *API Route Handlers (`app/api/**`, 27 handlers):* `a2a`, `account/api-keys`, `account/api-keys/[keyId]`, `admin/linkedin/{auth,callback,post,status}`, `articles`, `articles/[id]`, `authors`, `authors/[id]`, `billing/{checkout,entitlement}`, `cms/comments`, `cms/comments/[id]`, `cms/posts`, `cms/posts/[id]`, `comments`, `cron/linkedin-batch`, `dashboard/applications`, `dashboard/applications/[id]`, `research-assistant`, `revalidate`, `v1/assistant/answers`, `v1/usage`, `webhooks/{article-published,lemonsqueezy}`.
  - *Discovery & Agent Protocol Routes (`9` in `app/.well-known/**` + `8` top-level):* `/.well-known/{agent-card.json,agent-skills/index.json,agent-skills/researchwithme-archive/SKILL.md,api-catalog,http-message-signatures-directory,mcp/server-card.json,oauth-authorization-server,oauth-protected-resource,openid-configuration}`, plus `/agent-markdown`, `/auth.md`, `/auth/callback`, `/index.md`, `/llms.txt`, `/mcp`, `/openapi.json`, `/videos/captions/[slug]`.
- **`lib/` Subsystems (125 production files):**
  - `lib/cms/` (18 files): `auth`, `authors`, `catalogue`, `client-api`, `errors`, `http`, `local-store`, `mapping`, `publishable-author`, `read`, `revalidate`, `schema`, `secret-core`, `secret`, `store`, `supabase-store`, `types`, `use-cms`.
  - `lib/api/` (8 files): `answers`, `authenticate`, `burst`, `errors`, `key-store`, `keys`, `ledger`, `session`.
  - `lib/billing/` (6 files): `catalogue`, `checkout`, `events`, `signature`, `status`, `store`.
  - `lib/linkedin/` (8 prod + 6 test files): `article-extractor`, `automation`, `client`, `content-formatter`, `monitoring`, `oauth`, `retry`, `token-store`.
  - `lib/email/` (4 files): `components`, `render`, `scenarios`, `send`.
  - `lib/supabase/` (7 files): `client`, `config`, `identities`, `oauth`, `server`, `storage`, `use-session`.
  - `lib/dashboard/`, `lib/charts/`, `lib/scholarly/`, `lib/motion/`, `lib/lottie/`, `lib/schemas/`, `lib/search/`, `lib/seo/`, `lib/stores/`, `lib/images/`, `lib/editor/`, `lib/workflows/`, `lib/tokens/`, plus root protocol/utility modules.

### Generated-vs-Source Layout Boundaries

| Generated Path | Generator | Tracked in Git? |
|----------------|-----------|-----------------|
| `tokens/generated/*` (`tokens.{css,json,scss,ts}`, `tokens.video.{css,json}`) | `npm run tokens:build` (`tokens/scripts/build.mjs`) | Yes (6 files) |
| `products/downloads/*.zip` (5 files) & `public/downloads/*.zip` (2 files) | `python3 products/build.py` | Yes (7 binary `.zip` archives) |
| `.next/`, `.open-next/`, `cloudflare-pages/dist/`, `release-manifest.json` | Next / OpenNext / Vite / `scripts/release-gate.mjs` | No (`.gitignore`) |
| `docs/codebase/*.md` | `acquire-codebase-knowledge` workflow | Yes (7 Markdown docs) |
