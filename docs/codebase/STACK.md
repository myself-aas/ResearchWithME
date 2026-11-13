# Technology Stack

> Regenerated 2026-11-13 against `944f45c` (48 commits, full history). Supersedes every earlier
> version of this file, including its "Updated" appendices.

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | TypeScript 5.9, `strict: true`, `target: ES2017`, `moduleResolution: bundler` | `tsconfig.json`, `package.json` |
| Runtime + version | Node `>=20.9.0` declared; CI pins Node 22; production runs on **Cloudflare Workers** (`nodejs_compat`), not Node | `package.json` `engines`, `.github/workflows/quality.yml`, `wrangler.jsonc` |
| Package manager | **Bun is declared canonical, but npm is also in use.** `packageManager: "bun@1.4.4"` and CI installs with `bun install --frozen-lockfile`, yet `package-lock.json` is tracked again, and the Worker build is forced to `npm run build` | `package.json`, `bun.lock`, `package-lock.json`, `open-next.config.ts` (`buildCommand: 'npm run build'`) |
| Module/build system | Next.js 15.5.28 App Router (`output: 'standalone'`) bundled for Workers by `@opennextjs/cloudflare` 1.20.14. Second target: a Vite 7 build in `cloudflare-pages/` | `next.config.ts`, `open-next.config.ts`, `cloudflare-pages/vite.config.ts` |

`package.json` still declares `"type": "commonjs"` and `"main": "index.js"`. Neither applies to this app, and no `index.js` exists.

### 2) Production Frameworks and Dependencies

Only `dependencies`. Everything else is tooling (§3).

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| `next` | `15.5.28` (exact) | App Router, RSC, route handlers, metadata routes | `package.json` |
| `react`, `react-dom` | `^19.2.1` | UI runtime | `package.json` |
| `@opennextjs/cloudflare` | `1.20.14` (exact) | Next→Worker adapter, KV cache overrides, `getCloudflareContext()` | `open-next.config.ts`, `lib/rate-limit.ts` |
| `@supabase/supabase-js`, `@supabase/ssr` | `^2.118.0`, `^0.12.7` | Postgres (PostgREST), Auth (PKCE), Storage, Realtime | `lib/supabase/*`, `middleware.ts` |
| `@google/genai` | `^2.4.0` | Gemini: research assistant, editor-only avatar SVG | `app/api/research-assistant/route.ts:145`, `app/api/author-avatar/route.ts:145` |
| `@gradio/client` | `^2.7.1` | Hugging Face Space cover generation | `app/api/generate/route.ts:117` |
| `resend`, `@react-email/components`, `@react-email/render` | `^6.37.0`, `1.0.12`, `^2.2.0` | Transactional email (built, see INTEGRATIONS §1) | `lib/email/send.ts:95`, `emails/*.tsx` |
| `@mdxeditor/editor` | `^4.3.4` | Studio Markdown editor | `components/cms/` |
| `react-markdown`, `remark-gfm` | `^10.1.0`, `^4.0.1` | Article body rendering | `components/` |
| `tailwindcss`, `@tailwindcss/typography`, `postcss` | `^4.1.11`, `^0.5.20`, `^8.5.31` | Styling (v4, CSS-first); `postcss` also forced via `overrides` | `postcss.config.mjs`, `package.json` `overrides` |
| `motion`, `lenis`, `lottie-web` | `^14.12.0`, `^1.3.27`, `5.13.0` | Interface motion, reader smooth scroll, Lottie playback | `lib/motion/`, `components/motion/`, `components/lottie/` |
| `cmdk`, `fuse.js` | `^1.1.1`, `^7.5.0` | Command palette and fuzzy catalogue search | `lib/search/catalog-index.ts` |
| `zustand` | `^5.1.0` | Persisted reader preferences (reading list, digest) | `lib/stores/preferences-store.ts` |
| `@radix-ui/react-dialog`, `@radix-ui/react-popover` | `^1.3.1` | Accessible dialog and popover primitives | `components/` |
| `recharts` | `^3.10.1` | Author impact radar chart | `components/` |
| `lucide-react`, `clsx`, `tailwind-merge`, `server-only` | — | Icons, class composition, server-module guard | `next.config.ts` `optimizePackageImports` |

There is **no ORM**. Postgres is reached only through the Supabase JS client, and the schema lives in hand-written SQL under `supabase/migrations/`.

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| ESLint 9.39.1 + `eslint-config-next` 15.5.28 | Flat config: `next/core-web-vitals` + `next/typescript` + stricter rules | `eslint.config.mjs` |
| TypeScript 5.9 | `tsc --noEmit` | `package.json` `typecheck` |
| Vitest `^3.2.4` + `jsdom` `^31` + `axe-core` | Unit and in-process page/API tests; 9 files opt into jsdom per file | `vitest.config.ts` |
| Playwright `^1.65.0` | Browser tests against the **Pages** build under `wrangler pages dev` | `test/playwright.config.ts` |
| Supabase CLI `^3.1.0` | Local DB and pgTAP (`supabase test db --local`) | `supabase/tests/*.sql` |
| `impeccable` `^4.7.0` | Design anti-pattern detector over `app components` | `package.json` `impeccable:source` |
| `wrangler` 4.154.0 | Deploy, preview, KV, `cf-typegen` | `wrangler.jsonc` |
| Vite 7.3.0 + `@vitejs/plugin-react` | The `cloudflare-pages/` build target | `package.json` `build:pages` |
| `react-email` 6.11.8 | Email preview/export (`email dev` on :3001) | `package.json` `email:*` |
| `tsx` | Runs the TypeScript scripts in `scripts/` | `package.json` |
| Token pipeline | `tokens/src/*.json` → `tokens/generated/*` (css/scss/ts/json/video), with validation and a contrast check | `tokens/scripts/*.mjs` |
| GitHub Actions | `Quality` workflow only (no deploy workflow, see CONCERNS) | `.github/workflows/quality.yml` |

There is no Prettier, Biome or EditorConfig file. ESLint is the only style enforcement.

### 4) Key Commands

```bash
bun install                 # canonical install (CI: --frozen-lockfile)
npm run dev                 # next dev on 0.0.0.0:3000
npm run quality             # tokens:build → tokens:check → lint → typecheck → test → impeccable:source
npm test                    # vitest run
npm run build               # scripts/build-next-or-worker.mjs: next build, or OpenNext when WORKERS_CI=1
npm run build:worker        # opennextjs-cloudflare build
npm run preview             # OpenNext build + local workerd (:8787)
npm run deploy              # predeploy guard → OpenNext build → deploy
npm run deploy-guard        # scripts/check-production-env.mjs alone
npm run budgets             # scripts/check-budgets.mjs (/ shell JS budget)
npm run release:gate        # scripts/release-gate.mjs
npm run build:pages         # Vite client + server builds for cloudflare-pages/
npm run test:pages          # Playwright e2e against the Pages build
npm run cf-typegen          # regenerate the gitignored cloudflare-env.d.ts
```

CI (`quality.yml`) runs: tokens → lint, typecheck, test, impeccable → `build` → `budgets` → `release:gate`.

### 5) Environment and Config

**Config files:** `package.json`, `tsconfig.json`, `next.config.ts`, `open-next.config.ts`, `wrangler.jsonc`, `cloudflare-pages/wrangler.jsonc`, `cloudflare-pages/vite.config*.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.ts`, `test/playwright.config.ts`, `supabase/config.toml`, `squirrel.toml`, `.env.example`, `.env.production`.

**Runtime env vars read by app code** (`git grep "process.env."` over `app lib middleware.ts next.config.ts cloudflare-pages/src`):

| Variable | Kind | Read at |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (legacy alias `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | Build-time, inlined | `lib/supabase/config.ts`, `next.config.ts` |
| `NEXT_PUBLIC_SITE_URL` | Build-time | `lib/seo.ts`, `lib/cms/http.ts` |
| `REVALIDATE_SECRET` (legacy alias `MY_SECRET_TOKEN`) | Worker secret | `lib/cms/secret*.ts` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Worker secret / var | assistant + avatar routes |
| `HF_SPACE_NAME`, `HF_TOKEN` | Worker secret | `app/api/generate/route.ts` |
| `RESEND_API_KEY`, `RESEND_TPL_*` (6) | Worker secret | `lib/email/send.ts` |
| `RWM_DATA_DIR` | Local/test | `lib/db.ts`, `lib/cms/local-store.ts`, `lib/legacy/local-store.ts` |
| `DISABLE_HMR` | Dev only (AI Studio artefact) | `next.config.ts` |

Build/tooling-only variables: `WORKERS_CI`, `RWM_SKIP_WORKER_WRAPPER`, `NEXT_PRIVATE_STANDALONE`, `RWM_BUILD_TARGET`, `ALLOW_DEMO_DEPLOY`, `PIEME_BUDGET_SHELL_KB`, `PARITY_*`, `BASE_URL`, `TEMPLATE_ENV_OUTPUT`. `RATE_LIMIT_KV` is a **KV binding**, not an env var, even though `.env.example` lists it.

**Deployment constraints:**
- `NEXT_PUBLIC_*` are compiled into the bundle, so changing one means rebuilding. `.env.production` commits the public Supabase URL and publishable key (no secrets).
- The Worker filesystem is read-only, so the JSON adapters (`data/`) only work locally. Production must have Supabase configured, and `scripts/check-production-env.mjs` refuses `deploy`/`upload` otherwise.
- KV: one namespace (`8d2dc8f0…`) is bound three times (`NEXT_INC_CACHE_KV`, `NEXT_TAG_CACHE_KV`, `RATE_LIMIT_KV`), and `previews` reuses it. The free plan's 1,000 writes/day is shared by all of them.
- README: OpenNext builds are only partly supported on Windows. Use WSL or CI for release builds.

### 6) Evidence

- `package.json`: scripts, dependencies, `packageManager`, `engines`, `overrides`
- `bun.lock`, `package-lock.json`: both tracked (`git ls-files`); `package-lock.json` re-added in `0b799fc` after its deletion in `322ad72`
- `tsconfig.json`, `next.config.ts`, `open-next.config.ts`, `wrangler.jsonc`, `cloudflare-pages/wrangler.jsonc`
- `.github/workflows/quality.yml`: the only workflow
- `.env.example`, `.env.production`, `scripts/build-next-or-worker.mjs`, `scripts/check-production-env.mjs`
- `docs/codebase/.codebase-scan.txt`: manifests, env template, CI detection. **Its CODE METRICS and TODO sections are polluted by build output** (`.open-next/`, `.wrangler/tmp/`), which `scan.py` doesn't exclude. Use the source-only figures in STRUCTURE.md.
