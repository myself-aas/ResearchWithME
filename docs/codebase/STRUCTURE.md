# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `app/` | Next.js App Router: all routes, API handlers, and metadata files | 71 `.ts`/`.tsx` files; `next.config.ts` |
| `app/api/` | 18 Route Handlers (REST-ish JSON endpoints); 19 including `app/auth/callback/route.ts` | `app/api/**/route.ts` |
| `app/dashboard/` | Editorial studio (protected by `middleware.ts`) | `app/dashboard/layout.tsx:19` `export const dynamic = 'force-dynamic'` |
| `components/` | Shared UI. 29 components: 21 at the top level, 2 in `auth/`, 6 in `cms/` | `find components -name '*.tsx'` |
| `lib/` | Data access, CMS adapters, Supabase clients, validation, citations, SEO | `lib/*.ts` |
| `lib/cms/` | The CMS subsystem: schema, mapping, two stores, auth, revalidation | 14 files, `lib/cms/*` |
| `lib/supabase/` | Supabase config + browser/server/public clients, OAuth, storage upload | `lib/supabase/*` |
| `hooks/` | **One file, `use-mobile.ts`, with zero consumers** (dead) | `grep -rn "useIsMobile"` → no matches outside its own file |
| `supabase/migrations/` | 4 idempotent SQL migrations (schema, storage ×2, editor allowlist) | `supabase/migrations/*.sql` |
| `data/` | Seed/runtime JSON for the local adapters: `articles.json`, `comments.json` | `data/`; `lib/db.ts:6-8` |
| `docs/` | `deployment.md` (50 KB), `supabase-cms.md`, `audit-2026-10-25.md`, `ResearchWithMe_Template.md`, `codebase/` | `ls docs/` |
| `scripts/` | `check-production-env.mjs` — the deploy guard | `scripts/` |
| `public/` | 10 static files: `_headers`, images, and a 2.7 MB `aistudio/*.zip` archive | `find public -type f` |
| `app/fonts/` | Self-hosted Newsreader + Inter variable WOFF2 and their OFL licences | `app/fonts/` |
| `videos/` | Three HyperFrames video compositions (`explainer`, `edition-trailer`, `radar-chart`) — not part of the web build | `videos/*/hyperframes.json` |
| `.impeccable/` | Detector config + 21 per-route surface briefs | `.impeccable/surfaces/*.md` |
| `.github/` | `workflows/quality.yml`, 13 `contexts/*.context.md`, 1 `instructions/`, 1 `agents/` | `.github/` |
| `.agents/`, `.claude/`, `.codex/`, `agent/` | Vendored agent skills (impeccable, supabase, svg-logo-designer) pinned by `skills-lock.json` | `skills-lock.json` |
| Root docs | `README.md`, `PRODUCT.md`, `DESIGN.md`, `CLAUDE.md` | repo root |

`docs/codebase/` (this directory) holds the generated documentation set plus `.codebase-scan.txt`.

### 2) Entry Points

- **Main runtime entry:** there is no single one — Next.js App Router drives it.
  - Root layout: `app/layout.tsx` (wraps children in `components/Providers.tsx` → `lib/auth-context.tsx`).
  - Home route: `app/page.tsx`.
  - Error surfaces: `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`.
- **Middleware:** `middleware.ts` — `matcher: ['/dashboard/:path*']`; refreshes the Supabase session cookie and redirects unauthenticated requests to `/login?next=…`. Short-circuits to `NextResponse.next()` when Supabase is unconfigured (`middleware.ts:14-16`).
- **Secondary entry points:**
  - `app/api/**/route.ts` — 18 HTTP handlers.
  - Metadata routes: `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`, `app/opengraph-image.tsx`, `app/icon.svg`, `app/apple-icon.tsx`.
  - `scripts/check-production-env.mjs` — standalone Node script run by `predeploy`/`preupload`.
  - Production Worker bundle: `.open-next/worker.js` (`wrangler.jsonc` `main`), built by `npm run build:worker`.
- **How entry is selected:** `package.json` `scripts.dev` = `next dev -p 3000 -H 0.0.0.0`; `scripts.start` = `next start`; `scripts.deploy` = `opennextjs-cloudflare build && opennextjs-cloudflare deploy`. `next.config.ts` sets `output: 'standalone'` with the comment *"switched back to avoid export build issues"*.
- **Dev-only init:** `next.config.ts` calls `initOpenNextCloudflareForDev()` when `NODE_ENV === 'development'`, wrapped in `try/catch` so it is inert outside wrangler.

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `app/**/page.tsx` | Routing, `generateMetadata`, data reads via `lib/cms/catalogue.ts`, layout composition | Direct Supabase calls; business validation |
| `app/api/**/route.ts` | HTTP concerns: origin check, rate limit, body parsing, auth gate, error→status mapping | Business rules (delegated to `lib/cms/schema.ts`, `lib/validation.ts`) |
| `components/` | Presentational + interactive UI; `'use client'` where state is needed | `fs`/`node:*` imports; Supabase server client |
| `lib/cms/` | Schema normalisation, store adapters, editor gate, revalidation | Next.js HTTP response building except `lib/cms/http.ts` |
| `lib/supabase/` | Client construction and config only | Queries (those live in `lib/cms/supabase-store.ts`) |
| `lib/` (root) | Pure helpers: `validation.ts`, `format.ts`, `citations.ts`, `seo.ts`, `categories.ts`, `safe-redirect.ts`, `rate-limit.ts` | React rendering (except `lib/auth-context.tsx`, `lib/storage.ts`, `lib/cms/use-cms.ts` which are `'use client'`) |
| `supabase/migrations/` | Idempotent DDL, RLS policies, triggers, RPCs | Application logic |
| `data/` | Seed JSON. Git-ignored at runtime: `data/cms-posts.json`, `data/cms-comments.json` | Committed user content (`.gitignore`) |

Enforcement is partly mechanical: `lib/cms/store.ts`, `lib/cms/read.ts`, `lib/cms/catalogue.ts`, `lib/cms/auth.ts` and `lib/supabase/server.ts` all `import 'server-only'` (5 files), so a client bundle importing them fails the build.

### 4) Naming and Organization Rules

- **`app/` directory naming:** Next.js file conventions — `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `not-found.tsx`. Route segments are lowercase kebab-case; dynamic segments are bracketed (`[slug]`, `[id]`). Examples: `app/post/[slug]/page.tsx`, `app/dashboard/comments/page.tsx`, `app/api/cms/posts/[id]/route.ts`.
- **`components/` naming:** PascalCase `.tsx`, one default-exported component per file (`BlogHeader.tsx`, `ArticleDiscussion.tsx`, `AuthorImpactRadarChart.tsx`). Feature subfolders are lowercase: `components/auth/`, `components/cms/`.
- **`lib/` naming:** kebab-case `.ts` (`blog-data.ts`, `research-data.ts`, `safe-redirect.ts`, `rate-limit.ts`). Submodules mirror the domain: `lib/cms/`, `lib/supabase/`.
- **Directory organization pattern:** primarily **layer-based at the top level** (`app` / `components` / `lib`) with **domain sub-grouping inside `lib/`** (`cms/`, `supabase/`). Not a monorepo (scan: "No monorepo signals detected").
- **Import aliasing:** `tsconfig.json` declares `"paths": { "@/*": ["./*"] }` with `baseUrl: "."`, so `@/` maps to the **repo root**, not `src/`. Verified usage: **296** `@/`-prefixed import specifiers vs **45** relative ones. `vitest.config.ts` mirrors the alias (`'@': path.resolve(__dirname, './')`). Relative imports appear mainly *within* a module (`lib/cms/schema.ts` → `'./types'`, `lib/supabase/oauth.ts` → `'../safe-redirect'`).
- **Test naming:** `lib/__tests__/<subject>.test.ts` (10 files), matching `vitest.config.ts` `include: ['lib/**/*.test.ts']`.
- **Style outliers:** `app/api/generate/route.ts` is the only source file using double-quoted strings (`grep -rl '= "'` → that file alone). `hooks/use-mobile.ts` uses double quotes and omits semicolons.

### 5) Evidence

- `docs/codebase/.codebase-scan.txt` — DIRECTORY TREE section (truncated at depth 3; supplemented by a full `find`)
- `tsconfig.json` — `paths`, `include`, `exclude` (`node_modules`, `.open-next`, `.wrangler`)
- `eslint.config.mjs` — `globalIgnores(['.next/**', 'node_modules/**', 'ResearchWith.me-main/**', 'data/**', 'coverage/**', '.open-next/**', '.wrangler/**', 'cloudflare-env.d.ts'])`
- `middleware.ts` — the only middleware, and its matcher
- `lib/cms/store.ts`, `lib/cms/catalogue.ts` — the `server-only` boundary and the public catalogue merge
- `vitest.config.ts` — test location and alias
- `.gitignore` — runtime JSON files, `.open-next/`, `.wrangler/`, `.dev.vars*`

## Extended Sections

### Route inventory (from the verified `npm run build` output)

Build classification: `○` static, `●` SSG via `generateStaticParams`, `ƒ` server-rendered on demand. 46 static pages generated.

| Route | Build | Notes |
|---|---|---|
| `/` | `ƒ` | Reads the merged catalogue at request time |
| `/post/[slug]` | `ƒ` | `export const revalidate = 30` (ISR, no `generateStaticParams`) |
| `/paper/[slug]` | `●` | 6 paths from `PUBLICATIONS_DATA` |
| `/category/[slug]` | `●` | 6 category paths |
| `/author/[id]` | `ƒ` | |
| `/dashboard`, `/dashboard/manage`, `/dashboard/edit/[id]`, `/dashboard/comments`, `/login` | `ƒ` | Studio + auth |
| `/papers`, `/authors`, `/editions`, `/editorial-board`, `/assistant`, `/bookmarks`, `/cite`, `/verify`, `/write` | `○` | Client components fetching `/api/*` |
| `/auth`, `/auth/academic`, `/auth/github`, `/auth/google`, `/auth/orcid`, `/auth/providers` | `○` | Sign-in surfaces |
| `/auth/callback` | `ƒ` | PKCE code exchange |
| `/api/*` (18) | `ƒ` | All dynamic |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `/opengraph-image`, `/icon.png`, `/icon.svg`, `/apple-icon` | `○` | Metadata routes |
| Middleware | 94.7 kB | `middleware.ts` |

Shared First Load JS: 105 kB; largest route is `/author/[id]` at 319 kB First Load (110 kB route JS), driven by `recharts` in `components/AuthorImpactRadarChart.tsx`.

### Agent-skill directories

Four separate vendored skill trees exist: `.agents/skills/` (impeccable, supabase, supabase-postgres-best-practices, svg-logo-designer), `.claude/skills/` (three of the same), `agent/skills/svg-logo-designer/`, and `.codex/hooks.json`. `skills-lock.json` pins three skills by SHA-256 from `rknall/claude-skills` and `supabase/agent-skills`.

These directories are **not** listed in `eslint.config.mjs`'s `globalIgnores`, yet they do not break lint: they contain only 78 `.md`, 4 `.toml`, 2 `.json`, 1 `.yaml`, 1 `.cmd` and one extensionless script — no `.ts`/`.tsx`/`.js` — so ESLint has no matching files. Verified: `npx eslint .agents .claude agent --no-error-on-unmatched-pattern` exits 0 with no output. `.claude/skills/` duplicates `.agents/skills/` content, which is a redundancy rather than a hazard.

---

## Updated 2026-11-08

Added:

| Path | Purpose |
| --- | --- |
| `.github/workflows/deploy.yml` | Preview per pull request; production after `Quality` passes |
| `lib/svg.ts` | `sanitizeSvgMarkup()` and `svgToDataUri()` for model-supplied SVG |
| `supabase/migrations/20261108000100_consolidate_editor_allowlist.sql` | Copies `editor_memberships` into `editors`, drops the old table |
| `supabase/migrations/20261108000200_post_artifacts.sql` | Reviewed-artifact columns on `public.posts` |
| `lib/__tests__/rate-limit.test.ts`, `lib/__tests__/svg.test.ts` | Tests for the above |

Removed:

| Path | Why |
| --- | --- |
| `package-lock.json` | Bun is the canonical package manager |
| `.eslintrc.json` | Inert under ESLint 9 with `eslint.config.mjs` present |
| `hooks/use-mobile.ts` (and the directory) | `useIsMobile` had no consumers |

The `ResearchWith.me-main/` path referenced by the README, `PRODUCT.md`,
`docs/audit-2026-10-25.md`, `eslint.config.mjs`, and `.impeccable/config.json`
was confirmed intentionally absent, and all five **live** references were
removed. `grep -rn "ResearchWith.me-main"` still matches these `docs/codebase/`
files, which is intentional: they record the original finding and its evidence.
