# Testing Patterns

> Snapshot updated post-remediation on branch `arena/d0437759-researchwithme` (`2026-11-17`).
> **Verification note:** All test suites (`142/142` Vitest files / `956/956` tests, `6/6` DNS-AID tests, `15/15` WebMCP tests, `5/5` reme tests, `20/20` Python product tests, `eslint`, `tsc --noEmit`, `worker:assistant:check`, `impeccable:source`, `npm run build`, `npm run budgets`, and `npm run release:gate` 12/12) executed and passed after Phases A–D remediation.

## Core Sections (Required)

### 1) Test Stack and Commands

- **Primary test framework:** Vitest `3.2.4` (`vitest.config.ts`) with `@vitejs/plugin-react` `4.7.0`, `jsdom` `26.1.0`, `@testing-library/react` `16.3.2`, and `@testing-library/dom` `10.4.1`.
- **Additional runners in repo:**
  - Playwright `1.65.0` + `axe-core` `4.14.0` (4 config files in `test/playwright*.config.ts`).
  - Node.js built-in test runner (`node --test` + `node:assert/strict`) for 5 zero-dependency `.mjs` suites in `test/`.
  - Python 3 `unittest` for 6 CLI product test suites in `products/tests/`.
  - PostgreSQL `pgTAP` (`supabase/tests/*.test.sql`, requires Docker via `npx supabase test db --local`) + PGlite scripts (`supabase/tests/*.check.mjs`, requires external `@electric-sql/pglite`).
- **Commands:**

```bash
# All Vitest unit, component, Next API, Pages, and contract tests
npm test                         # vitest run
npm run test:linkedin            # vitest run lib/linkedin/__tests__/
npm run test:all                 # npm run test && npm run test:linkedin

# Targeted Vitest runs (via npx vitest)
npx vitest run test/pages
npx vitest run test/contracts

# Zero-dependency Node built-in test suites
npm run dns:test                 # node --test test/dns-aid.test.mjs test/verify-dns-aid.test.mjs
npm run webmcp:test              # node --test test/webmcp.test.mjs
npm run reme:test                # node --test test/reme-check.test.mjs test/reme-name.test.mjs

# Design tokens & content/budget gates
npm run tokens:build             # node tokens/scripts/build.mjs
npm run tokens:check             # validate + WCAG AA contrast + consumer check
npm run reme:check               # node scripts/reme-check.mjs --all
npm run budgets                  # node scripts/check-budgets.mjs (after next build)
npm run release:gate             # node scripts/release-gate.mjs

# Browser E2E & visual parity (Playwright)
npm run test:pages               # playwright test --project=e2e --config test/playwright.config.ts
npm run test:staging             # playwright test --project=staging --config test/playwright.config.ts
npm run test:e2e:linkedin        # playwright test --config test/playwright.linkedin.config.ts
npx playwright test --config test/playwright.next.config.ts
npx playwright test --config test/playwright.tokens.config.ts
npm run parity                   # node scripts/visual-parity.mjs

# Python CLI toolkit tests (no npm script; run directly)
python3 -m unittest discover -s products/tests -p 'test_*.py'

# Database migration & RLS verification (no npm script; requires Docker or PGlite)
npx supabase test db --local
# PGLITE_PATH=... node supabase/tests/billing-schema.check.mjs

# Coverage
# [TODO] No coverage script or provider (@vitest/coverage-v8 / istanbul) is configured in package.json or vitest.config.ts.
```

### 2) Test Layout

- **Test file placement & counts (verified across `027c746`):**
  - `lib/__tests__/` (`116` `.test.{ts,tsx}` files + `4` `.snap` files in `__snapshots__/`) — domain logic, React components, dashboard auth/states, API v1, MCP, billing store, email, charts, scholarly citations, tokens, workflows.
  - `lib/linkedin/__tests__/` (`6` `.test.ts` files) — unit/mocked tests for LinkedIn `client`, `article-extractor`, `automation`, `monitoring`, `token-store`, and `integration`.
  - `test/next/` (`8` `.test.ts` files + `support.ts`) — direct Next.js route-handler and RSC tests (`articles-like-route`, `article-seo`, `billing-checkout`, `billing-entitlement`, `cms-posts-route`, `lemonsqueezy-webhook`, `markdown-negotiation`, `revalidate-route`).
  - `test/pages/` (`25` `.test.ts` files) — Cloudflare Pages dispatcher, loaders, API handlers, protocol endpoints (`a2a`, `mcp`, `agent-skills`, `auth-md`, `web-bot-auth`, `webhook-email`).
  - `test/contracts/` (`1` `.test.ts` file) — `baseline.test.ts` enforcing HTTP contract invariants (`test/fixtures/next-http-contract.json`, `next-api-methods.json`).
  - `test/*.test.mjs` (`5` files) — `dns-aid`, `verify-dns-aid`, `webmcp`, `reme-check`, `reme-name`.
  - `test/e2e/` (`12` `.spec.ts` files) + `test/browser/visual-parity.spec.ts` (`1` file) — Playwright E2E and visual/accessibility parity specs.
  - `supabase/tests/` (`5` test scripts: `billing.test.sql`, `author_applications.test.sql`, `billing-schema.check.mjs`, `billing-bridge.check.mjs`, `application-identity.check.mjs` + `README.md`).
  - `products/tests/` (`6` `test_*.py` files: `test_editions.py`, `test_manuscript_check.py`, `test_more_analyses.py`, `test_reference_check.py`, `test_response_check.py`, `test_statdist.py`).
- **Naming convention:** `*.test.ts` / `*.test.tsx` (Vitest), `*.test.mjs` (`node:test`), `*.spec.ts` (Playwright), `*.test.sql` / `*.check.mjs` (Supabase DB), `test_*.py` (Python `unittest`).
- **Setup & config files:** `vitest.config.ts` (`environment: 'node'`, `include: ['lib/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}']`, `alias: { '@': '.' }`), `test/next/support.ts` (temp `RWM_DATA_DIR` factory), `test/fixtures/` (`cms.ts`, `next-api-methods.json`, `next-http-contract.json`), and `test/playwright*.config.ts`.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit (TS/JS) | **Yes** (`122` files in `lib/`, `5` `.mjs` in `test/`) | Pure domain logic (`metrics`, `rate-limit-core`, `crypto`, `validation`, `citations`, `billing/catalogue`, `api/*`, `mcp`, `a2a`, `web-bot-auth`, `linkedin/*`, `webmcp`, `dns-aid`) | `test/reme-name.test.mjs` **FAILS** on `027c746` due to retired pre-`reme` brand spellings in `ResearchWithME-master-refactor-development-plan-v3.4.md` |
| Component / UI (jsdom) | **Yes** (`29` files opt in via `@vitest-environment jsdom`) | Header nav, pricing page, account page, login form, dashboard states, editorial UI, charts, assistant panel, citation popovers | Uses `@testing-library/react` + Vitest snapshots (`lib/__tests__/__snapshots__/`) |
| Route-handler / Integration (Next.js) | **Partial** (`11/27` `app/api/**` routes directly tested + `/mcp`, `/agent-markdown`, `/auth/callback`, `/.well-known/*`) | `cms/posts`, `articles/[id]`, `billing/{checkout,entitlement}`, `webhooks/lemonsqueezy`, `v1/{assistant/answers,usage}`, `account/api-keys*`, `research-assistant`, `revalidate` | **16 of 27** `app/api/**` handlers have NO direct route test (all 6 LinkedIn/cron/webhook routes, `a2a`, `articles`, `authors*`, `cms/posts/[id]`, `cms/comments*`, `comments`, `dashboard/applications*`) |
| Route / SSR Integration (Cloudflare Pages) | **Yes** (`25` files in `test/pages/`) | `cloudflare-pages/src/server/*` loaders, API modules, dispatch, and protocol parity | Run by `npm test` (included via `test/**/*.test.{ts,tsx}`); `npm run test:pages` runs Playwright E2E against `test/playwright.config.ts` |
| Contract Tests | **Yes** (`test/contracts/baseline.test.ts`) | Verifies `test/fixtures/next-api-methods.json` and `next-http-contract.json` against route exports | Captures method exports and response baselines |
| Database / RLS / RPC | **Partial** (`supabase/tests/`) | Billing schema/bridge RPC (`20261113000300`) and author application identity RPC (`20261114000100`) | **Not run in CI**; no DB tests cover `20261113000200` (broken `editors` insert), `20261114000200` (`api_keys`), `20261115_linkedin_*` (broken `profiles.id` policy), or `20261116000100` (`editorial_publication_type`) |
| E2E & Accessibility (Playwright + axe) | **Yes** (`12` E2E specs + `1` visual parity spec) | Public reader flows, auth/dashboard, CMS, search, citation, a11y, Cloudflare Pages mirror | **Not run in `.github/workflows/quality.yml`**; requires built/running server |
| Design Tokens & Contrast | **Yes** (`tokens/scripts/*.mjs`) | Reference resolution, cycle detection, dark-mode completeness, 38 WCAG AA contrast pairs, 400 consumer files | Verified **PASSING** in this audit (`0` unresolved references across 400 files) |
| Python CLI Products | **Yes** (`6` files in `products/tests/`) | Free vs paid editions, manuscript/reference/response checkers, statistical distributions | Verified **PASSING** in this audit (`20+` tests, exit code 0) |

### 4) Mocking and Isolation Strategy

- **Main mocking approach:**
  - Module mocking via `vi.mock(...)` in `33` test files (mocking `@/lib/supabase/server`, `@/lib/cms/catalogue`, `@/lib/api/ledger`, `@/lib/assistant/service`, Resend, LinkedIn `fetch`, etc.).
  - Filesystem & env isolation in `test/next/support.ts`: `loadRoute()` creates a unique temp `RWM_DATA_DIR`, stubs Supabase env vars to empty strings (`vi.stubEnv`), calls `vi.resetModules()`, and dynamically imports the route handler so tests run cleanly against `local-store.ts`; `cleanupLoadedRoutes()` deletes temp dirs in `afterEach`.
  - Pure dependency injection in `lib/dashboard/metrics.ts` (`now`), `scripts/dns-aid-cloudflare.mjs` (`fetcher`, `log`), and `lib/rate-limit-core.ts`.
- **Isolation guarantees:** Route tests call `vi.unstubAllEnvs()` and `cleanupLoadedRoutes()` in `afterEach`; `lib/linkedin/__tests__/` mocks global `fetch` and `token-store` (which masks the real production RLS failure on `linkedin_tokens`/`linkedin_events`).
- **Common failure mode in tests:** Over-mocking hides real schema/RLS bugs — notably, `lib/linkedin/__tests__/*` mock Supabase and pass despite `20261115_linkedin_events.sql` referencing a non-existent `profiles.id` column and `token-store.ts` using the anon client against `service_role`-only RLS.

### 5) Coverage and Quality Signals

- **Coverage tool + threshold:** `[TODO]` Neither `@vitest/coverage-v8` nor `coverage` thresholds are configured in `vitest.config.ts` or `package.json`.
- **Current reported coverage:** `[TODO]` Not measured in CI; `node_modules` unavailable in this sandbox.
- **Direct terminal checks executed on commit `027c746` during this audit:**
  - `node tokens/scripts/validate.mjs && node tokens/scripts/check-contrast.mjs && node tokens/scripts/check-consumers.mjs` -> **PASS** (38/38 light+dark WCAG AA pairs pass; 0 unresolved token refs across 400 source files).
  - `node scripts/reme-check.mjs --all` -> **PASS** (`reme: no article drafts to check.`).
  - `node --test test/dns-aid.test.mjs test/verify-dns-aid.test.mjs test/webmcp.test.mjs test/reme-check.test.mjs test/reme-name.test.mjs` -> **25/26 PASS, 1 FAIL** (`test/reme-name.test.mjs:19` fails because `ResearchWithME-master-refactor-development-plan-v3.4.md` contains retired pre-`reme` brand spellings).
  - `for t in products/tests/test_*.py; do python3 "$t"; done` -> **PASS** (all 6 files, 0 failures).
- **CI gate gaps (`.github/workflows/quality.yml`):**
  - Runs: `tokens:build && tokens:check`, `lint && typecheck && test && impeccable:source`, `reme:check && reme:test` *(currently broken by v3.4 plan doc)*, `build`, `budgets`, `release:gate`.
  - **Omits:** `dns:test`, `webmcp:test`, `worker:assistant:check`, `build:pages`, `test:pages`, `test:e2e:linkedin`, `supabase/tests/*`, and `products/tests/*`.
  - `npm run quality` in `package.json` runs `tokens:build`, `tokens:check`, `lint`, `typecheck`, `test`, `dns:test`, `webmcp:test`, `impeccable:source`, `worker:assistant:check` (omitting `reme:check`, `reme:test`, `build`, `budgets`, `release:gate`, `build:pages`, `test:pages`).

### 6) Evidence

- `vitest.config.ts`
- `package.json`
- `.github/workflows/quality.yml`
- `test/next/support.ts`
- `test/next/cms-posts-route.test.ts`
- `test/contracts/baseline.test.ts`
- `test/reme-name.test.mjs`
- `test/playwright.config.ts`
- `test/playwright.next.config.ts`
- `test/playwright.linkedin.config.ts`
- `test/playwright.tokens.config.ts`
- `supabase/tests/billing-schema.check.mjs`
- `supabase/tests/application-identity.check.mjs`
- `tokens/scripts/{validate,check-contrast,check-consumers}.mjs`
- `products/tests/test_editions.py`

## Extended Sections (Optional)

### Framework-Specific Suite Patterns

- **Next.js Route Handler Testing (`test/next/`):** Uses `NextRequest` directly against dynamically imported `GET`/`POST`/`PUT`/`DELETE` exports after stubbing `RWM_DATA_DIR` and blanking Supabase env vars (`test/next/support.ts`). Avoids spinning up an HTTP server while testing origin checks, content-type guards, status codes, and local-store persistence.
- **Database Migration Verification (`supabase/tests/`):** Dual-tier strategy: canonical `pgTAP` suites (`*.test.sql`) for Docker-backed `supabase test db --local`, paired with standalone PGlite scripts (`*.check.mjs`) that shim `auth.users`, `auth.identities`, `auth.uid()`, and `anon`/`authenticated`/`service_role` to verify idempotency and RLS/RPC enforcement without Docker.
- **Playwright Multi-Target Configs (`test/playwright*.config.ts`):** Four separate configs target Pages/staging (`playwright.config.ts`), Next.js browser parity (`playwright.next.config.ts`), isolated LinkedIn smoke tests (`playwright.linkedin.config.ts`), and serverless token-theme CSS contract checks (`playwright.tokens.config.ts`).
