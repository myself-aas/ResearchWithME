# Technology Stack

> 2026-11-20 update: storefront, payment integration, and product CLI bundles removed. File counts and earlier validation results below remain historical snapshot measurements; see `docs/commerce-retirement.md`.

> Snapshot updated post-remediation on branch `arena/d0437759-researchwithme` (`2026-11-17`, 973 tracked files).

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | TypeScript `5.9.3` (strict mode; ES2022 target) | `package.json`, `tsconfig.json` |
| Runtime + version | Node.js `>=20.9.0` (CI pins `22`; sandbox `v22.22.3`); Cloudflare Workers (`compatibility_date: 2026-10-23`, flags `nodejs_compat`, `global_fetch_strictly_public`) | `package.json`, `.github/workflows/quality.yml`, `wrangler.jsonc`, `workers/assistant/wrangler.jsonc` |
| Package manager | `npm` (`packageManager: npm@10.9.8`); `preinstall` enforces npm-only via `scripts/ensure-npm.mjs` | `package.json`, `package-lock.json`, `scripts/ensure-npm.mjs` |
| Module/build system | Root package `"type": "commonjs"` with TypeScript `moduleResolution: "bundler"`; Next.js `15.5.28` + `@opennextjs/cloudflare` `1.20.14` (sole production web runtime) + `workers/assistant/` RPC Worker; pure Node `.mjs` token pipeline (`tokens/`) | `package.json`, `tsconfig.json`, `next.config.ts`, `open-next.config.ts`, `wrangler.jsonc`, `tokens/scripts/build.mjs` |

### 2) Production Frameworks and Dependencies

High-impact runtime dependencies declared in `package.json` (plus `cloudflare-pages/package.json`):

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| `next` | `^15.5.28` | Full-stack React App Router framework, RSC, Route Handlers, middleware, `next/font/local`, ISR/tags | `package.json`, `next.config.ts`, `app/` |
| `react` / `react-dom` | `19.2.1` | UI runtime (Server + Client Components, React SSR in `cloudflare-pages/`) | `package.json`, `app/layout.tsx`, `cloudflare-pages/src/entry-server.tsx` |
| `@opennextjs/cloudflare` | `^1.20.14` | Adapts Next.js App Router build to Cloudflare Workers + KV incremental/tag caches + static asset binding | `package.json`, `open-next.config.ts`, `wrangler.jsonc` |
| `@supabase/supabase-js` / `@supabase/ssr` | `^2.118.0` / `^0.12.7` | PostgreSQL CMS/profiles/applications/API-keys/LinkedIn data access, SSR cookie sessions, OAuth & Storage | `package.json`, `lib/supabase/`, `lib/cms/supabase-store.ts` |
| `@google/genai` | `^2.4.0` | Gemini LLM client (`gemini-2.5-flash` default) for `/api/research-assistant`, `/api/v1/assistant/answers`, MCP `ask_archive`, and `workers/assistant` | `package.json`, `lib/assistant/service.ts`, `workers/assistant/src/index.ts` |
| `resend` | `^6.37.0` | Transactional email API (`send`, template sync, retry wrapper) | `package.json`, `lib/email/send.ts`, `scripts/sync-templates.ts` |
| `@react-email/components` / `@react-email/render` | `^1.0.12` / `^2.2.0` | React JSX transactional email templates (`emails/*.tsx`) rendered to HTML/plain text | `package.json`, `emails/`, `lib/email/scenarios.ts` |
| `platejs` + `@platejs/{basic-nodes,code-block,link,list,markdown}` | `^53.5.2` / `^53.x` | Sole visual/Markdown body editor shared across `/write` and `/dashboard/(studio)` (`PlateBodyEditor.tsx`, with Supabase `blog-images` inline upload; `@mdxeditor/editor` removed) | `package.json`, `components/editor/PlateBodyEditor.tsx`, `components/cms/PostEditor.tsx`, `lib/editor/plate-markdown.ts` |
| `react-markdown` + `remark-gfm` + `remark-parse` + `unified` | `^10.1.0` / `^4.0.1` / `^11.0.0` / `^11.0.5` | Article Markdown rendering and AST/citation parsing | `package.json`, `components/MarkdownBody.tsx` |
| `recharts` | `^3.10.1` | Interactive charts (`components/charts/`, dashboard overview trends) | `package.json`, `components/charts/`, `components/dashboard/` |
| `motion` / `lottie-web` / `lenis` | `^14.12.0` / `^5.13.0` / `^1.3.27` | Animation primitives (`components/motion/`), Lottie illustrations (`components/lottie/`), smooth scroll | `package.json`, `components/motion/`, `components/reader/ArticleSmoothScroll.tsx` |
| `lucide-react` | `^1.101.0` | Icon library across public site, reader, and dashboard | `package.json`, `components/` |
| `zod` | `^4.6.7` | Schema validation (`lib/schemas/`) | `package.json`, `lib/schemas/` |
| `zustand` | `^5.1.0` | Client state persistence for reader preferences | `package.json`, `lib/stores/preferences-store.ts` |
| `fuse.js` / `cmdk` | `^7.5.0` / `^1.1.1` | Client fuzzy search and command palette (`CommandPalette.tsx`) | `package.json`, `lib/search/`, `components/search/` |
| `clsx` + `tailwind-merge` + `class-variance-authority` + `@radix-ui/react-slot` | `^2.1.1` / `^3.5.0` / `^0.7.1` / `^1.2.4` | Conditional Tailwind class merging (`lib/utils.ts`) and primitive slots (`components/ui/`) | `package.json`, `lib/utils.ts`, `components/ui/` |
| `@tailwindcss/typography` | `^0.5.20` | Prose styling plugin imported in `app/globals.css` | `package.json`, `app/globals.css` |
| `server-only` | `^0.0.1` | Compile-time guard ensuring 14 server modules cannot be bundled client-side | `package.json`, `lib/supabase/server.ts`, `lib/cms/auth.ts`, `lib/api/*.ts` |
| `react-router-dom` | `^6.30.6` | Client + SSR routing in `cloudflare-pages/` | `package.json`, `cloudflare-pages/src/routes.tsx` |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| `typescript` (`^5.9.3`) | Static typechecking (`npm run typecheck`, `tsc --noEmit`) | `package.json`, `tsconfig.json` |
| `eslint` (`^9.39.1`) + `eslint-config-next` (`^15.5.28`) | Flat-config linting (`npm run lint`) | `package.json`, `eslint.config.mjs` |
| `tailwindcss` (`^4.1.11`) + `@tailwindcss/postcss` (`^4.1.11`) + `daisyui` (`^5.8.0`) + `tw-animate-css` (`^1.4.0`) | CSS build pipeline (`@import "tailwindcss"`, `@plugin "daisyui"`, `styles/daisy-themes.css`) | `package.json`, `postcss.config.mjs`, `app/globals.css`, `styles/daisy-themes.css` |
| `vitest` (`^3.2.4`) + `@vitejs/plugin-react` + `jsdom` + `@testing-library/react` | Unit, component, route-handler, contract, and Cloudflare Pages tests | `package.json`, `vitest.config.ts`, `lib/__tests__/`, `test/next/`, `test/pages/` |
| `@playwright/test` (`^1.65.0`) + `axe-core` (`^4.14.0`) | Browser E2E, visual parity, accessibility, and Cloudflare Pages verification | `package.json`, `test/playwright*.config.ts`, `test/e2e/` |
| `wrangler` (`^4.154.0`) | Cloudflare Worker / Pages local preview and deployment | `package.json`, `wrangler.jsonc`, `cloudflare-pages/wrangler.jsonc`, `workers/assistant/wrangler.jsonc` |
| `vite` (`^7.3.8`) | Client + SSR bundler for `cloudflare-pages/` | `package.json`, `cloudflare-pages/vite.config.ts`, `cloudflare-pages/vite.config.server.ts` |
| `impeccable` (`^4.7.0`) | Design-system anti-pattern static detector (`npx impeccable detect app components`) | `package.json`, `.impeccable/config.json`, `.github/workflows/quality.yml` |
| `react-email` (`^6.11.8`) | Local email preview server (`npm run email:dev`) | `package.json`, `emails/` |
| `tsx` (`^4.21.0`) | TypeScript script execution (`scripts/*.ts`) | `package.json`, `scripts/` |
| `tokens/scripts/*.mjs` | Zero-dependency design-token compiler, validator, WCAG AA contrast gate, and consumer checker | `tokens/scripts/`, `package.json` |
| `supabase` CLI + `squirrel` (`squirrel.toml`) | Local DB/migration workflow and site SEO audit config (not installed in `package.json`) | `supabase/config.toml`, `squirrel.toml` |

### 4) Key Commands

```bash
# Install dependencies (npm only; preinstall blocks Yarn/pnpm/Bun)
npm ci

# Local development
npm run dev                      # next dev -p 3000 -H 0.0.0.0
npm run email:dev                # React Email preview server (emails/, port 3001)
npm run worker:assistant:dev     # wrangler dev -c workers/assistant/wrangler.jsonc

# Build targets
npm run build                    # scripts/build-next-or-worker.mjs (Next locally; OpenNext Worker when WORKERS_CI=1)
npm run build:worker             # opennextjs-cloudflare build
npm run build:pages              # vite build (cloudflare-pages/vite.config.ts + vite.config.server.ts)
npm run worker:assistant:check   # wrangler types + tsc -p workers/assistant + wrangler deploy --dry-run

# Quality, lint, typecheck, tokens, and tests
npm run lint                     # eslint .
npm run typecheck                # tsc --noEmit
npm test                         # vitest run (all Vitest suites)
npm run test:linkedin            # vitest run lib/linkedin/__tests__/
npm run test:all                 # npm run test && npm run test:linkedin
npm run dns:test                 # node --test test/dns-aid.test.mjs test/verify-dns-aid.test.mjs
npm run webmcp:test              # node --test test/webmcp.test.mjs
npm run reme:check               # node scripts/reme-check.mjs --all
npm run reme:test                # node --test test/reme-check.test.mjs test/reme-name.test.mjs
npm run tokens:build             # node tokens/scripts/build.mjs
npm run tokens:check             # validate + WCAG AA contrast + consumer check
npm run impeccable:source        # impeccable detect app components
npm run budgets                  # scripts/check-budgets.mjs (requires .next/ build; shell <= 200 KB gzip)
npm run quality                  # tokens:build + tokens:check + lint + typecheck + test + dns:test + webmcp:test + impeccable:source + worker:assistant:check
npm run release:gate             # scripts/release-gate.mjs (writes release-manifest.json)
npm run deploy-guard             # scripts/check-production-env.mjs

# End-to-end, parity & deployment
npm run test:pages               # playwright test --project=e2e --config test/playwright.config.ts
npm run test:staging             # playwright test --project=staging --config test/playwright.config.ts
npm run test:e2e:linkedin        # playwright test --config test/playwright.linkedin.config.ts
npm run parity                   # node scripts/visual-parity.mjs
npm run deploy                   # predeploy (check-production-env.mjs) + opennextjs-cloudflare build && deploy
npm run worker:assistant:deploy  # wrangler deploy -c workers/assistant/wrangler.jsonc
```

> **Broken script note:** `package.json` defines `"email:template:upload": "tsx scripts/upload-email-template.ts"`, but `scripts/upload-email-template.ts` does not exist in commit `027c746` (`scripts/sync-templates.ts` is present instead).

### 5) Environment and Config

- **Config sources:** `package.json`, `next.config.ts`, `open-next.config.ts`, `wrangler.jsonc`, `cloudflare-pages/wrangler.jsonc`, `workers/assistant/wrangler.jsonc`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `vitest.config.ts`, `.env.example`, `.env.production`, `.impeccable/config.json`, `supabase/config.toml`, `squirrel.toml`, `.mcp.json`, `test/playwright*.config.ts`.
- **Environment variables referenced in production code (39 distinct `process.env.*` keys across `app/`, `lib/`, `scripts/`, `cloudflare-pages/`):**
  - *Public / Site:* `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ALLOW_LOCAL_CMS` (dev-only).
  - *AI & Assistant API:* `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_GATEWAY_BASE_URL` *(undocumented in `.env.example`)*, `API_BRIDGE_SECRET` *(undocumented in `.env.example`)*, `API_FREE_MONTHLY_REQUESTS` *(undocumented in `.env.example`)*.
  - *Email (Resend):* `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO`, `RESEND_WEBHOOK_SECRET`, `RESEND_SUPPORT_INBOX`, `EMAIL_ALLOW_LOCAL_TEST`.
  - *CMS / Revalidation / Local FS:* `REVALIDATE_SECRET`, `RWM_DATA_DIR`, `ALLOW_LOCAL_CMS`.
  - *Agent Identity & DNS:* `WEB_BOT_AUTH_PRIVATE_JWK`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
  - *LinkedIn & Cron (all 6 undocumented in `.env.example`):* `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`, `LINKEDIN_COMPANY_URN`, `ENCRYPTION_SECRET`, `CRON_SECRET`.
  - *Build / Runtime Flags:* `NODE_ENV`, `WORKERS_CI`, `CF_PAGES`, `CF_PAGES_URL`, `VERCEL`, `REME_BUDGET_SHELL_KB`.
- **Deployment/runtime constraints:**
  - Primary production deployment targets **Cloudflare Workers** via OpenNext (`wrangler.jsonc`, `name: "researchwithme"`). Every dynamic route explicitly sets `export const runtime = 'nodejs'` (supported via `nodejs_compat`).
  - `wrangler.jsonc` binds `NEXT_INC_CACHE_KV`, `NEXT_TAG_CACHE_KV`, and `RATE_LIMIT_KV` to a **single** KV namespace (`8d2dc8f0b1bb4839962ae63df8296b31`, free-plan 1,000 writes/day ceiling).
  - Native Cloudflare Rate Limiting binding `API_BURST_LIMITER` (`namespace_id: "2001"`) enforces `30` requests / `60s` per API key.
  - `scripts/build-next-or-worker.mjs` runs `scripts/check-production-env.mjs` automatically when `WORKERS_CI=1`, failing the build if Supabase URL/key or `REVALIDATE_SECRET` are missing or misconfigured.
  - No Docker container image is used for application deployment (no `Dockerfile`); `supabase/config.toml` uses Docker locally only when running `supabase start` / `supabase test db --local`.

### 6) Evidence

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.ts`
- `open-next.config.ts`
- `wrangler.jsonc`
- `cloudflare-pages/package.json`
- `cloudflare-pages/wrangler.jsonc`
- `cloudflare-pages/vite.config.ts`
- `workers/assistant/wrangler.jsonc`
- `.env.example`
- `.env.production`
- `.github/workflows/quality.yml`
- `.github/workflows/linkedin-automation.yml`
- `scripts/ensure-npm.mjs`
- `scripts/build-next-or-worker.mjs`
- `scripts/check-production-env.mjs`
- `scripts/check-budgets.mjs`
- `tokens/scripts/build.mjs`

## Extended Sections (Optional)

### Full Dependency Taxonomy by Category

- **Web Framework & Routing:** `next`, `react`, `react-dom`, `react-router-dom`, `@opennextjs/cloudflare`
- **Data, Auth & Validation:** `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `zustand`
- **AI & Search:** `@google/genai`, `fuse.js`, `cmdk`
- **Content Authoring & Rendering:** `@mdxeditor/editor`, `platejs`, `@platejs/basic-nodes`, `@platejs/code-block`, `@platejs/link`, `@platejs/list`, `@platejs/markdown`, `react-markdown`, `remark-gfm`, `remark-parse`, `unified`
- **Styling, Motion & Visualization:** `tailwindcss`, `@tailwindcss/postcss`, `@tailwindcss/typography`, `daisyui`, `tw-animate-css`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-slot`, `lucide-react`, `motion`, `lottie-web`, `lenis`, `recharts`
- **Email:** `resend`, `@react-email/components`, `@react-email/render`, `react-email`
- **Testing & Quality:** `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@playwright/test`, `axe-core`, `eslint`, `eslint-config-next`, `impeccable`

### Environment Matrix (Observed)

| Target | Entry / Config | Data Store | Rate Limit Store | Build Command |
|--------|----------------|------------|------------------|---------------|
| Local Dev (demo) | `next dev` | Local JSON files (`RWM_DATA_DIR` / `data/cms-*.json`) when Supabase unset + dev/local allowed | In-memory `Map` (`lib/rate-limit-core.ts`) | `npm run dev` |
| Production Worker (primary) | `wrangler.jsonc` (`researchwithme`) | Hosted Supabase Postgres (`bxyjjbclaklzjxeumeat`) + Storage | Shared `RATE_LIMIT_KV` + `API_BURST_LIMITER` (API v1) | `WORKERS_CI=1 npm run build` / `npm run deploy` |
| Parallel Pages Mirror (secondary) | `cloudflare-pages/wrangler.jsonc` (`researchwithme-pages`) | Hosted Supabase Postgres via REST/SDK | Shared `RATE_LIMIT_KV` (`8d2dc8f0b1bb4839962ae63df8296b31`) | `npm run build:pages` + `wrangler pages deploy` |
| Isolated Assistant Worker (unwired) | `workers/assistant/wrangler.jsonc` (`researchwithme-assistant`) | Stateless RPC (receives article corpus from caller) | Delegated to caller | `npm run worker:assistant:check` |
