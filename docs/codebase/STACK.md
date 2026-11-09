# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | TypeScript (strict mode, `target: ES2017`, `moduleResolution: bundler`) | `tsconfig.json`, `package.json` (`typescript: ^5.9.3`) |
| Runtime + version | Node.js `>=20.9.0` (declared engine). Verified locally on v22.22.3 | `package.json` `engines.node`; `node -v` output |
| Package manager | **Ambiguous — both npm and Bun lockfiles are committed.** CI uses Bun 1.4.4; README documents `npm install` | `package-lock.json`, `bun.lock`, `.github/workflows/quality.yml`, `README.md` |
| Module/build system | Next.js 15.5.28 (`next build`), output `standalone`; production bundle via OpenNext Cloudflare adapter | `package.json`, `next.config.ts`, `open-next.config.ts` |
| Production platform | Cloudflare Workers (not a Node server) | `wrangler.jsonc` (`main: .open-next/worker.js`), `README.md` "Deploy" |

TypeScript strictness is maximal at the compiler level: `strict: true`, `noEmit: true`, `isolatedModules: true`, and `typescript.ignoreBuildErrors: false` in `next.config.ts`, so type errors fail the build.

### 2) Production Frameworks and Dependencies

From `package.json` `dependencies` only. These are what ship to production.

| Dependency | Version (declared) | Role in system | Evidence |
|------------|---------|----------------|----------|
| `next` | `15.5.28` (exact pin) | App Router framework: routing, RSC, metadata routes, API route handlers | `package.json` |
| `react` / `react-dom` | `^19.2.1` | UI runtime. Resolved to 19.3.1 on install | `package.json`; `node_modules/react/package.json` |
| `@supabase/supabase-js` | `^2.118.0` | Supabase client (Postgres, Auth, Storage, Realtime) | `package.json`, `lib/supabase/*` |
| `@supabase/ssr` | `^0.12.7` | Cookie-aware SSR/browser clients + PKCE auth | `lib/supabase/server.ts`, `lib/supabase/client.ts`, `middleware.ts` |
| `@google/genai` | `^2.4.0` | Gemini text generation (research assistant, avatar SVG) | `app/api/research-assistant/route.ts:1`, `app/api/author-avatar/route.ts:1` |
| `@gradio/client` | `^2.7.1` | Client for a Hugging Face Space (Qwen cover-image generation) | `app/api/generate/route.ts:2` |
| `@mdxeditor/editor` | `^4.3.4` | Rich Markdown editor in the studio | `components/cms/MarkdownEditor.tsx` |
| `react-markdown` + `remark-gfm` | `^10.1.0` / `^4.0.1` | Render article bodies (GFM tables/strikethrough) | `components/MarkdownBody.tsx` |
| `recharts` | `^3.10.1` | Author impact radar chart | `components/AuthorImpactRadarChart.tsx` |
| `lucide-react` | `^0.553.0` | Icon set; tree-shaken via `experimental.optimizePackageImports` | `next.config.ts`, `app/post/[slug]/page.tsx:6` |
| `tailwindcss` + `@tailwindcss/typography` | `^4.1.11` / `^0.5.20` | Styling (v4, CSS-first) and prose typography | `postcss.config.mjs`, `app/globals.css` |
| `clsx` + `tailwind-merge` | `^2.1.1` / `^3.3.1` | Conditional class composition via `cn()` | `lib/format.ts:1` |
| `server-only` | `^0.0.1` | Compile-time guard preventing client import of server modules | 5 files under `lib/cms/` and `lib/supabase/server.ts` |
| `postcss` | `^8.5.31` | Also pinned via `overrides.next.postcss` to force one version | `package.json` `overrides` |

There is **no ORM**. Supabase is accessed directly through its JS client with hand-written SQL in `supabase/migrations/`. There is no Prisma/Drizzle/TypeORM dependency.

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| ESLint 9.39.1 + `eslint-config-next` | Lint. Flat config: `next/core-web-vitals` + `next/typescript` | `eslint.config.mjs`, `package.json` `scripts.lint` |
| `typescript` 5.9.3 | Typecheck (`tsc --noEmit`) | `package.json` `scripts.typecheck` |
| Vitest (declared `^3.2.4`, resolved 3.2.7) | Unit tests | `vitest.config.ts`, `package.json` `scripts.test` |
| `impeccable` (declared `^4.7.0`, resolved 4.8.0) | Design-system / accessibility detector over `app components` | `package.json` `scripts.impeccable:source`, `.impeccable/config.json` |
| `@opennextjs/cloudflare` 1.20.14 | Adapts the Next.js build to a Cloudflare Worker | `open-next.config.ts`, `package.json` `scripts.build:worker` |
| `wrangler` 4.154.0 | Worker deploy/preview, KV binding types | `wrangler.jsonc`, `package.json` `scripts.cf-typegen` |
| `@tailwindcss/postcss`, `autoprefixer`, `tw-animate-css` | CSS pipeline | `postcss.config.mjs` |
| `@types/node`, `@types/react`, `@types/react-dom` | Type declarations | `package.json` `devDependencies` |
| GitHub Actions | CI: lint → typecheck → test → impeccable → build | `.github/workflows/quality.yml` |

No Prettier or EditorConfig file exists at the repo root (verified: `ls -a | grep -iE "prettier|editorconfig"` returns nothing). Formatting is convention-based, enforced only by ESLint style rules.

### 4) Key Commands

```bash
npm install                      # README's documented install
npm run dev                      # next dev -p 3000 -H 0.0.0.0
npm run build                    # next build
npm test                         # vitest run
npm run lint                     # eslint .
npm run typecheck                # tsc --noEmit
npm run quality                  # lint + typecheck + test + impeccable:source
npm run impeccable:source        # impeccable detect app components
npm run build:worker             # opennextjs-cloudflare build
npm run preview                  # OpenNext build + local workerd preview (:8787)
npm run deploy                   # predeploy guard, then OpenNext build + wrangler deploy
npm run deploy-guard             # scripts/check-production-env.mjs alone
npm run cf-typegen               # regenerate cloudflare-env.d.ts from wrangler bindings
npm run clean                    # remove .next
```

**Verified in this workspace:** `npm install` → 1011 packages added; `npm test` → 65 tests / 10 files passed (exit 0); `npm run typecheck` → exit 0, no output; `npm run lint` → exit 0, no output; `npm run impeccable:source` → 0 anti-patterns, 1 advisory; `npm run build` → exit 0, 46 static pages.

### 5) Environment and Config

**Config sources:** `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.eslintrc.json`, `vitest.config.ts`, `open-next.config.ts`, `wrangler.jsonc`, `.env.example`, `.env.production`, `.impeccable/config.json`, `.github/workflows/quality.yml`.

**Environment variables actually read by the code** (from `grep -rho "process\.env\.[A-Z_0-9]*"` across `app/ lib/ middleware.ts scripts/ next.config.ts`):

| Variable | In `.env.example`? | Read at | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | `lib/supabase/config.ts:10`, `next.config.ts` | Project URL; build-time inlined |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | `lib/supabase/config.ts:12` | Publishable/anon key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | `lib/supabase/config.ts:13` | Legacy fallback name |
| `NEXT_PUBLIC_SITE_URL` | yes | `lib/seo.ts:4`, `lib/cms/http.ts` | Canonical origin + origin allowlist |
| `REVALIDATE_SECRET` | yes | `lib/cms/secret.ts:4` | Webhook shared secret |
| `GEMINI_API_KEY` | **no — missing** | `app/api/research-assistant/route.ts`, `app/api/author-avatar/route.ts` | Enables Gemini calls |
| `GEMINI_MODEL` | yes | same two routes | Defaults to `gemini-3.8-flash` |
| `HF_SPACE_NAME` | yes | `app/api/generate/route.ts` | Hugging Face Space to call |
| `HF_TOKEN` | yes | `app/api/generate/route.ts` | Private Space auth |
| `MY_SECRET_TOKEN` | no | `lib/cms/secret.ts:4` | Legacy alias for `REVALIDATE_SECRET` |
| `RWM_DATA_DIR` | no | `lib/cms/local-store.ts:63` | Override the demo JSON data dir (used by tests) |
| `ALLOW_DEMO_DEPLOY` | no | `scripts/check-production-env.mjs:60` | Bypass the deploy guard |
| `DISABLE_HMR` | no | `next.config.ts` webpack hook | AI Studio editing artefact |
| `NODE_ENV` | n/a | `next.config.ts` | Standard |

**Gap:** `GEMINI_API_KEY` is documented in `README.md`'s environment table but is absent from `.env.example` (verified by comparing `cut -d= -f1 .env.example` against the README table). `[ASK USER 3]`

**Deployment/runtime constraints:**
- `NEXT_PUBLIC_*` values are **compiled into the browser bundle at build time**. Changing one requires a rebuild; a Worker runtime variable of the same name has no effect (`README.md`, `scripts/check-production-env.mjs`).
- The production target is a Cloudflare Worker with a **read-only, non-persistent filesystem**, so the local JSON adapters (`lib/db.ts`, `lib/cms/local-store.ts`) cannot persist anything there. Supabase must be configured in production (`README.md`).
- `wrangler.jsonc` sets `compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]`. Many route handlers declare `export const runtime = 'nodejs'`.
- Free-tier KV: one namespace `researchwithme-opennext-cache` (`8d2dc8f0b1bb4839962ae63df8296b31`) is bound twice, as both incremental and tag cache (`wrangler.jsonc`, `open-next.config.ts`).
- No Dockerfile or compose file exists (scan: "No containerization configs detected"), despite `output: 'standalone'` enabling a container.

### 6) Evidence

- `package.json` — scripts, dependencies, devDependencies, engines, overrides
- `package-lock.json`, `bun.lock` — two committed lockfiles
- `tsconfig.json` — strictness, `paths: { "@/*": ["./*"] }`
- `next.config.ts` — `output: 'standalone'`, security headers, image patterns, `optimizePackageImports`
- `open-next.config.ts`, `wrangler.jsonc` — Cloudflare Worker target and bindings
- `.env.example`, `.env.production` — env template and committed public values
- `.github/workflows/quality.yml` — CI pipeline
- `docs/codebase/.codebase-scan.txt` — CODE METRICS (363 files, 45,607 LOC), CI/CD, container and security sections

---

## Updated 2026-11-08

- **Bun only.** `package-lock.json` was deleted and `package.json` pins
  `packageManager: "bun@1.4.4"`.
- **`@opennextjs/cloudflare` moved from `devDependencies` to `dependencies`**,
  because `npm run build:worker` (used by CI) needs it at build time.
- **`wrangler.jsonc` binds three names.** The same KV namespace is bound as
  `NEXT_INC_CACHE_KV`, `NEXT_TAG_CACHE_KV`, and now `RATE_LIMIT_KV`. On the free
  plan the 1,000-writes-per-day allowance is shared across all three.
- **`cloudflare-env.d.ts` is gitignored.** `npm run cf-typegen` regenerates it
  (~626 KB of workerd types), so it was removed from the index instead of
  committed.
