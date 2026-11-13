# Testing Patterns

> Regenerated 2026-11-13 against `944f45c`. The suite was run locally on Windows / Node 24.21.0.

## Core Sections (Required)

### 1) Test Stack and Commands

- **Runner:** Vitest `^3.2.4`, with Jest-compatible `expect` and `vi`.
- **DOM / a11y:** `jsdom` (opt-in per file with `// @vitest-environment jsdom`, 9 files), and `axe-core` for WCAG A/AA assertions (`lib/__tests__/a11y.test.ts`, `reader-popovers.test.tsx`).
- **Browser:** Playwright, run against the **Pages** build under `wrangler pages dev` on :8788 (`test/playwright.config.ts`).
- **Database:** pgTAP suites in `supabase/tests/`, run only against a local Supabase.

```bash
npm test                                        # vitest run (unit + harness), the CI test step
npx vitest run lib/__tests__/cms-schema.test.ts # one file
npx vitest run -t "rejects anonymous readers"   # by name
npm run test:pages                              # Playwright e2e (builds the Pages bundle first)
npm run test:staging                            # Playwright; requires RWM_STAGING_BASE_URL=https://…
npx supabase db reset --local && npx supabase test db --local   # pgTAP (local only)
npm run quality                                 # tokens + lint + typecheck + test + impeccable
```

**Verified 2026-11-13:** `vitest run` → **68 files, 691 passed, 1 skipped**, 58.9 s. jsdom prints `HTMLCanvasElement.getContext() not implemented` warnings from axe. They are noise, not failures.

### 2) Test Layout

| Location | Count | Kind | Environment |
|---|---|---|---|
| `lib/__tests__/*.test.ts(x)` | 51 | Unit tests of `lib/` modules, components (jsdom), design-token usage, a11y | node, or jsdom per file |
| `test/pages/*.test.ts(x)` | 16 | In-process **harness** tests of the Pages server: `createTestApp()` → `handleRequest()` with fake Supabase/KV/model/email services | node |
| `test/contracts/baseline.test.ts` | 1 | Asserts `app/api` still exports exactly the 24 frozen operations | node |
| `test/e2e/*.spec.ts` | 4 | Playwright: archive routes, layout whitespace, pages, reader tools | Chromium |
| `supabase/tests/*.test.sql` | 2 | pgTAP: privileges, RLS, policy shape, RPC surface | local Postgres |

- **Discovery:** `vitest.config.ts` `include` = `lib/**/*.test.{ts,tsx}`, `test/**/*.test.{ts,tsx}`. A `*.test.ts` under `app/` or `components/` would not run.
- **Aliases:** `@` → repo root; `server-only` → `test/stubs/server-only.ts`; `next/link|image|navigation|dynamic` → `cloudflare-pages/src/compat/*`.
- **Fixtures:** `test/fixtures/` (CMS fixtures, `next-api-methods.json`, `next-http-contract.json`). Snapshots live in `lib/__tests__/__snapshots__/`.
- **Support:** `test/support/pages.ts` (650 lines): fakes for every `RuntimeService`.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | Yes | `lib/cms/*` schema, mapping, local store, secrets; rate limiter (KV + memory); `svg.ts` sanitiser; citations; validation; i18n; motion; search; email render/send | Real temp dirs instead of fs mocks |
| Component / a11y | Yes (partial) | Scholarly components, reader popovers, command palette, theme typography, motion runtime | jsdom + axe; the large studio components (`PostEditor`, `QwenCoverGenerator`, `app/write/page.tsx`) are not covered |
| API behaviour | **Pages copy only** | `test/pages/*-api.test.ts` drive `cloudflare-pages/src/server/api/*` | The production `app/api/**/route.ts` handlers are **not imported by any test** (`git grep "@/app/" lib/__tests__ test` → only `auth/callback`, `.well-known/api-catalog`, `openapi.json`, `api-docs`) |
| API inventory | Yes | `test/contracts/baseline.test.ts` | Method list only, not behaviour |
| E2E (browser) | Exists, **not in CI** | Pages build | `quality.yml` never runs `test:pages` |
| DB / RLS | Exists, **not in CI** | 2 pgTAP suites | Local Supabase only |
| Build, budgets, release gate | CI only | `build`, `budgets`, `release:gate` | `.github/workflows/quality.yml` |

### 4) Mocking and Isolation Strategy

- **Prefer real subsystems with injected config:** `createLocalCmsStore({ dataDir })` and `RWM_DATA_DIR` point at temp dirs. `setRateLimitStoreForTesting()` pins a store. Catalogue functions accept injected `legacy`/`cms` stores (`lib/cms/catalogue.ts`).
- **Service fakes over module mocks:** the Pages harness swaps `RuntimeServices` (Supabase clients, KV, Gemini, HF, email) for in-memory fakes.
- **`vi.mock`:** 5 files, for SDKs and config that can't be injected (e.g. `lib/__tests__/auth-callback.test.ts`).
- **Env isolation:** `vi.stubEnv` / `vi.unstubAllEnvs()` and `vi.restoreAllMocks()` in `afterEach` (`test/pages/cms-api.test.ts`).
- **Common failure mode:** module-level singletons (`lib/cms/store.ts`, `lib/rate-limit.ts`) persist across tests in one file unless reset through their test hooks.

### 5) Coverage and Quality Signals

- **Coverage tool/threshold:** none. No coverage provider is installed and no script exists. `[TODO]`
- **Known gaps:**
  1. Production Next route handlers are untested for behaviour (see matrix). A divergence between `app/api` and `cloudflare-pages/src/server/api` would go unnoticed. The client-IP keying already differs.
  2. Playwright and pgTAP exist but aren't run in CI, so RLS regressions and browser behaviour aren't gated.
  3. The biggest UI files (`components/cms/PostEditor.tsx` 937 lines, `app/write/page.tsx` 816) have no tests.
- **Flaky areas:** none observed. The suite is slow mainly from environment setup (93 s cumulative jsdom env time, parallelised).

### 6) Evidence

- `vitest.config.ts`, `test/playwright.config.ts`, `package.json` (`test`, `test:pages`, `test:staging`)
- `test/support/pages.ts` (imports `cloudflare-pages/src/server/{context,dispatch}`)
- `test/pages/cms-api.test.ts`, `test/contracts/baseline.test.ts`, `lib/__tests__/rate-limit.test.ts`, `lib/__tests__/a11y.test.ts`
- `supabase/tests/author_applications.test.sql` (header: local only)
- `.github/workflows/quality.yml` (no e2e or pgTAP step)
- Command output 2026-11-13: 68 files / 691 passed / 1 skipped

## Extended Sections

### Patterns worth reusing

1. **Inject, don't mock.** Give a module a parameter (`dataDir`, a store, `RuntimeServices`) and pass a temp or fake one in.
2. **Assert on typed errors and status codes,** not message text (`rejects.toBeInstanceOf(CmsConflictError)`; `.status).toBe(401)`).
3. **Contract fixtures for migrations:** freeze observable behaviour (`test/fixtures/next-http-contract.json`) before porting.
