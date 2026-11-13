# Codebase Structure

> Regenerated 2026-11-13 against `944f45c`. Counts are of **tracked** files (`git ls-files`), which
> excludes build output such as `.open-next/`, `.wrangler/` and `.next/`.

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Size (tracked `.ts/.tsx/.mjs`, excl. tests) | Evidence |
|------|---------|------|----------|
| `app/` | Next.js App Router: pages, route handlers, metadata routes, fonts | 82 files / 5,544 lines | `next.config.ts` |
| `app/api/` | 17 route files, 24 operations (frozen in `test/fixtures/next-api-methods.json`) | — | `test/contracts/baseline.test.ts` |
| `components/` | Shared UI, used by **both** build targets | 115 files / 15,705 lines | — |
| `lib/` | Data access, CMS + legacy adapters, Supabase, email, motion, i18n, schemas, search | 137 files / 9,854 lines (+51 test files) | — |
| `cloudflare-pages/` | Second build target: Vite SSR app + Pages Functions that reuse `components/` and `lib/` through `src/compat/` shims | 58 files / 5,480 lines | `cloudflare-pages/vite.config.ts`, `docs/migration-baseline.md` |
| `supabase/` | 9 idempotent migrations, 2 pgTAP suites, `config.toml` | — | `supabase/migrations/`, `supabase/tests/` |
| `test/` | Page/API harness tests, contract fixtures, Playwright e2e, stubs | 27 files / 5,022 lines | `vitest.config.ts`, `test/playwright.config.ts` |
| `tokens/` | Design-token source JSON → generated CSS/SCSS/TS/JSON, with validators | 4 scripts + 5 sources + 6 generated | `tokens/scripts/build.mjs` |
| `emails/` | 6 React Email templates + shared `_layout.tsx` | 7 files / 660 lines | `lib/email/scenarios.ts` |
| `scripts/` | Build wrapper, deploy guard, budgets, release gate, email sync/verify, parity, contract capture | 10 files | `package.json` scripts |
| `data/` | Seed JSON (`articles.json`, `comments.json`) for local mode | 2 files | `lib/db.ts` |
| `videos/` | HyperFrames compositions (`explainer`, `edition-trailer`, `radar-chart`). Not part of the web build | 47 files | `CLAUDE.md` |
| `docs/` | Deployment, CMS, motion system, πeme design system, audits, this folder | 31 files | — |
| `public/` | Static assets, self-hosted fonts, `_headers`/`_routes.json` (Pages), `security.txt`, `AGENTS.md` | 14 files | — |
| Root | `middleware.ts`, configs, `README.md`, `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md`, `INTEGRATION_PLAN.md`, `implementation-plan.md` | — | — |

**Missing, though documented:** `.impeccable/` (surface briefs + detector config) and `.agents/` no longer exist. `85465ce` moved `.impeccable/` into `.agents/`, and `0b799fc` deleted `.agents/` entirely. `CLAUDE.md` and `README.md` still tell contributors to keep `.impeccable/surfaces/` in sync. See CONCERNS `[ASK USER 1]`.

### 2) Entry Points

- **Next.js (production):** `app/layout.tsx` (root layout, fonts, providers) → `app/page.tsx`. Error surfaces: `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`.
- **Middleware:** `middleware.ts`, matcher `['/dashboard/:path*']`. It refreshes the Supabase session and redirects anonymous users to `/login?next=…`. When Supabase is unconfigured it is a no-op.
- **Route handlers:** `app/api/**/route.ts` (17), plus `app/auth/callback/route.ts`, `app/.well-known/api-catalog/route.ts`, `app/openapi.json/route.ts`, `app/llms.txt/route.ts`, `app/index.md/route.ts`, `app/videos/captions/[slug]/route.ts`, `app/icon-{192,512}.png/route.tsx`.
- **Worker bundle:** `.open-next/worker.js` (`wrangler.jsonc` `main`), produced by `npm run build:worker`, or by `npm run build` when `WORKERS_CI=1` (`scripts/build-next-or-worker.mjs`).
- **Pages target:** `cloudflare-pages/src/entry-server.tsx` + `entry-client.tsx`, routes in `src/routes.tsx`, APIs dispatched by `src/server/dispatch.ts` → `src/server/api/*`, served via `functions/[[path]].ts`.
- **Standalone scripts:** `scripts/*.mjs|ts` (run via `package.json`), `tokens/scripts/*.mjs`.

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `app/**/page.tsx` | Rendering, `generateMetadata`, catalogue reads via `lib/cms/catalogue.ts` | Direct Supabase writes |
| `app/api/**/route.ts` | Origin check, rate limit, auth gate, body parse, error→status | Persistence details (delegated to `lib/cms/*`, `lib/legacy/*`) |
| `components/` | UI shared by both targets | `server-only` or Node-only imports. The Pages Vite build fails on them (`failOnServerOnly()` in `cloudflare-pages/vite.config.ts`) |
| `lib/cms/` | CMS schema, `CmsStore` adapters (local/Supabase), editor gate, catalogue merge, revalidation | HTTP response building (except `lib/cms/http.ts`) |
| `lib/legacy/` | `LegacyStore` bridge for seed articles' durable counters (likes, comments): local JSON or Supabase `legacy_*` tables | New seed content |
| `lib/db.ts` | Synchronous read of seed articles/authors. Self-described as legacy: *"do not extend it"* | New code (use `lib/legacy/store`) |
| `lib/supabase/` | Config + client construction (browser, request-scoped server, cookie-free public) | Queries |
| `lib/email/` | Scenario registry, render, Resend sender | Route logic |
| `cloudflare-pages/src/server/` | Pages-target equivalents of the API routes, written against a `RuntimeServices` interface | Imports from `next/*` (shimmed by `src/compat/`) |
| `supabase/migrations/` | Idempotent DDL, RLS, RPCs | App logic |

`import 'server-only'` enforces the server boundary in the Next build. Vitest aliases it to `test/stubs/server-only.ts` so server modules can be tested.

### 4) Naming and Organization Rules

- **Routes:** Next reserved names (`page.tsx`, `layout.tsx`, `route.ts`). Segments are lowercase kebab-case and dynamic segments are bracketed. One route group: `app/dashboard/(studio)/`.
- **Components:** PascalCase `.tsx` (`BlogHeader.tsx`, `PapersArchive.tsx`). Feature subfolders are lowercase: `cms/`, `motion/`, `primitives/`, `scholarly/`, `reader/`, `ui/`, `workflows/`, …
- **`lib/`:** kebab-case `.ts`, with domain subfolders (`cms/`, `legacy/`, `supabase/`, `email/`, `motion/`, `i18n/`, `schemas/`, `scholarly/`). A pure core is split from a platform shell when a module must also run outside Next. Examples: `rate-limit-core.ts`/`rate-limit.ts`, `cms/secret-core.ts`/`secret.ts`, `author-directory-core.ts`/`author-directory.ts`.
- **Organisation:** layer-based at the top (`app` / `components` / `lib`), domain-grouped inside `lib/` and `components/`. Not a monorepo: `cloudflare-pages/package.json` exists, but there are no workspaces.
- **Path alias:** `@/*` → **repo root** (`tsconfig.json` `baseUrl: "."`), mirrored in `vitest.config.ts`. Vitest and the Pages build also alias `next/link|image|navigation|dynamic` to `cloudflare-pages/src/compat/*`.
- **Tests:** `lib/__tests__/*.test.ts(x)` for units, `test/pages/*.test.ts` for harness tests, `test/e2e/*.spec.ts` for Playwright, `supabase/tests/*.test.sql` for pgTAP.

### 5) Evidence

- `git ls-files` counts per directory (method recorded above)
- `tsconfig.json` (`paths`), `vitest.config.ts` (aliases, `include`), `eslint.config.mjs` (`globalIgnores`)
- `middleware.ts`, `app/layout.tsx`, `scripts/build-next-or-worker.mjs`, `wrangler.jsonc`
- `cloudflare-pages/vite.config.ts`, `cloudflare-pages/src/server/dispatch.ts`, `docs/migration-baseline.md`
- `lib/db.ts` header comment, `lib/legacy/store.ts`, `lib/cms/catalogue.ts`
- `git show --stat 85465ce` and `git show --stat 0b799fc` (the `.impeccable/` → `.agents/` → deleted trail)

## Extended Sections

### Largest source files (tracked, lines)

`components/cms/PostEditor.tsx` 937 · `components/motion/MotionLab.tsx` 895 · `app/write/page.tsx` 816 · `test/support/pages.ts` 650 · `lib/schemas/scholarly.ts` 508 · `components/cms/QwenCoverGenerator.tsx` 494 · `app/post/[slug]/page.tsx` 466 · `components/PapersArchive.tsx` 451 · `components/ArticleFeed.tsx` 435 · `cloudflare-pages/src/routes/post.tsx` 422.

### Page routes (`app/**/page.tsx`)

Public: `/`, `/about`, `/api-docs`, `/articles` (redirect alias), `/assistant`, `/author/[id]`, `/authors`, `/bookmarks`, `/category/[slug]`, `/cite`, `/contact`, `/editions`, `/editorial-board`, `/motion` (motion lab), `/paper/[slug]`, `/papers`, `/post/[slug]`, `/privacy`, `/login`, `/write`.
Studio (`/dashboard`, middleware-protected): `(studio)/` index, `manage`, `edit/[id]`, `comments`, `applications`; plus `/dashboard/access` (writer application).
