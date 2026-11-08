# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- **Primary test framework:** Vitest — declared `^3.2.4` in `package.json`, resolved to **3.2.7** in this workspace (`vitest --version` via the run banner `RUN v3.2.7`).
- **Assertion/mocking tools:** Vitest's bundled `expect` (Jest-compatible API: `toEqual`, `toMatchObject`, `rejects.toBeInstanceOf`, `toHaveBeenCalledWith`) and Vitest's `vi` namespace for mocking. No Chai, no Sinon, no Testing Library, no jsdom.
- **Test environment:** `node` (`vitest.config.ts:11`) — no DOM. Client components are therefore untestable as configured.
- **Commands:**

```bash
npm test                    # vitest run  (the only test command; alias: npm run test)
npx vitest                  # watch mode
npx vitest run lib/__tests__/cms-schema.test.ts   # single file
npx vitest run -t "refuses a duplicate slug"      # single test by name
# coverage: NOT CONFIGURED — no provider, no script, no threshold
# integration/e2e: NONE EXIST
```

- **Aggregated gate:** `npm run quality` runs `lint && typecheck && test && impeccable:source`. CI runs the same four steps plus `npm run build` (`.github/workflows/quality.yml`).

**Verified in this workspace:** `npm test` → exit 0, `Test Files 10 passed (10)`, `Tests 65 passed (65)`, duration 2.92 s.

### 2) Test Layout

- **Test file placement pattern:** a single dedicated directory, `lib/__tests__/`. Tests are **not** co-located with their subjects.
- **Naming convention:** `<subject>.test.ts`, where the subject mirrors a `lib/` module name (`cms-schema.test.ts` → `lib/cms/schema.ts`; `safe-redirect.test.ts` → `lib/safe-redirect.ts`).
- **Discovery scope:** `vitest.config.ts` sets `include: ['lib/**/*.test.ts']`. A test placed under `app/`, `components/`, or a top-level `tests/` directory would **silently never run** — there is no guard against this.
- **Setup files:** none. `vitest.config.ts` declares no `setupFiles`, no `globalSetup`, and no `environment` overrides per file.
- **Alias:** `'@'` → repo root, mirroring `tsconfig.json` so `@/lib/...` specifiers resolve in tests exactly as they do in the app.
- **Reporters:** `default` only.

The 10 files and their subjects:

| Test file | Subject under test | Tests |
|---|---|---|
| `cms-schema.test.ts` | `lib/cms/schema.ts` (input normalisation) | 10 |
| `validation.test.ts` | `lib/validation.ts` | 18 |
| `citations.test.ts` | `lib/citations.ts` | 8 |
| `cms-local-store.test.ts` | `lib/cms/local-store.ts` (real filesystem) | 7 |
| `categories.test.ts` | `lib/blog-data.ts` / `lib/categories.ts` | 5 |
| `auth-callback.test.ts` | `app/auth/callback/route.ts` `GET` | 4 |
| `cms-mapping.test.ts` | `lib/cms/mapping.ts` | 4 |
| `cms-secret.test.ts` | `lib/cms/secret.ts` | 4 |
| `safe-redirect.test.ts` | `lib/safe-redirect.ts` | 4 |
| `production-env.test.ts` | `.env.production` + `@next/env` load order | 1 |

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | **Yes** | Pure `lib/` functions: `validation.ts`, `citations.ts`, `safe-redirect.ts`, `cms/schema.ts`, `cms/mapping.ts`, `cms/secret.ts`, `categories.ts` | 7 of 10 files. No I/O, no mocks. |
| Integration | **Partial** | `cms-local-store.test.ts` exercises the real `node:fs` through a temp directory; `auth-callback.test.ts` invokes a real Next.js Route Handler with a real `NextRequest`; `production-env.test.ts` spawns a child Node process to load `.env.production` through `@next/env` | 3 files touch real subsystems, but none cross a network boundary |
| E2E | **No** | — | No Playwright, Cypress, or Puppeteer dependency; no `e2e/` directory |
| Component / UI | **No** | — | `environment: 'node'` and no Testing Library; the 48 `'use client'` files have zero test coverage |
| API routes | **No** (one exception) | — | `app/auth/callback/route.ts` is the only route with a test; the other 17 handlers are untested |
| Database / RLS | **No** | — | `supabase/migrations/*.sql` is never executed in CI; no `supabase test` or pgTAP setup exists |
| Build | **Yes (CI only)** | `npm run build` is a CI step | Not part of `npm test` |

### 4) Mocking and Isolation Strategy

- **Main mocking approach: avoid mocks.** The dominant pattern is dependency injection of configuration plus real subsystems:
  - `createLocalCmsStore({ dataDir })` points at `fs.mkdtemp(path.join(os.tmpdir(), 'rwm-cms-'))`, created in `beforeAll` and removed in `afterAll` (`lib/__tests__/cms-local-store.test.ts:31-38`). Three test files use `mkdtemp`/`tmpdir`.
  - `production-env.test.ts` copies `.env.production` into a temp dir and runs `@next/env`'s `loadEnvConfig` in a **child process** via `execFileSync`, so it observes Next.js's real precedence rules rather than a reimplementation.
- **Where mocks are used:** exactly one file. `auth-callback.test.ts:4-17` uses `vi.hoisted` + two `vi.mock` calls to replace `@/lib/supabase/config` (with a getter so `isSupabaseConfigured` can flip per test) and `@supabase/ssr` (with a fake `createServerClient` whose `exchangeCodeForSession` delegates to a `vi.fn()`).
- **Environment isolation:** `cms-secret.test.ts` saves `process.env.REVALIDATE_SECRET` and `MY_SECRET_TOKEN`, deletes them in `beforeEach`, and restores or deletes them in `afterEach` depending on whether they were originally `undefined` (lines 5-17). This is the only env-mutation test.
- **Isolation guarantees:** each file gets a fresh temp directory; the promise queue inside `createLocalCmsStore` serialises writes within a store instance. Module-level singletons (`lib/cms/store.ts`, `lib/supabase/*`) are never touched by tests, so cross-test leakage through them is not a risk today.
- **Common failure mode in tests:** the suite asserts on **implementation-visible** values — `expect(created.id).toBe('1')` depends on `nextId()`'s max+1 scheme, and `expect(await store.listCommentCounts()).toEqual({ '1': 1 })` depends on ids being stringified integers. Changing local-store id generation breaks tests that are otherwise behaviourally correct.

### 5) Coverage and Quality Signals

- **Coverage tool + threshold:** **none.** `vitest.config.ts` has no `coverage` block; `package.json` has no `test:coverage` script; `coverage/` appears only in `eslint.config.mjs` and `.impeccable/config.json` ignore lists. `[TODO]` for any coverage target.
- **Current reported coverage:** not measured — no provider is installed, so no number exists. `[TODO]`
- **Known gaps:**
  - **`lib/cms/supabase-store.ts` (284 lines) has no test**, while its local counterpart does. The row↔domain mapping in `rowToPost`/`postToRow` and the PostgREST error translation are entirely unexercised.
  - **17 of 18 API route handlers are untested**, including every CMS write route that enforces `requireEditor`, origin checks, and rate limits.
  - **No component tests at all** — the 48 `'use client'` files, including the 859-line `components/cms/PostEditor.tsx` and 547-line `QwenCoverGenerator.tsx`, have no coverage.
  - **SQL migrations are never run**, so RLS policies — the actual authorization boundary in production — are unverified by automation.
  - **`lib/db.ts` (232 lines)** — the legacy article/comment JSON layer — has no test.
  - **`lib/rate-limit.ts`** has no test, despite guarding 9 routes.
- **Flaky areas:** none observed. The single run was clean and fast (2.92 s). No test uses timers, network, or wall-clock assertions; `production-env.test.ts` spawns a subprocess, which is the slowest file (79 ms) but is deterministic.

### 6) Evidence

- `vitest.config.ts` — alias, `environment: 'node'`, `include: ['lib/**/*.test.ts']`, `reporters: 'default'`
- `package.json` — `"test": "vitest run"`, `vitest: ^3.2.4`, and the absence of any coverage script
- `lib/__tests__/cms-local-store.test.ts` — representative integration-style test (real fs, temp dir, typed error assertions)
- `lib/__tests__/auth-callback.test.ts` — the only mocked test and the only route-handler test
- `lib/__tests__/production-env.test.ts` — child-process test of Next.js env precedence
- `lib/__tests__/cms-secret.test.ts` — env save/restore isolation pattern
- `.github/workflows/quality.yml` — CI order: lint → typecheck → test → impeccable → build
- Verified run output: 10 files, 65 tests, all passing

## Extended Sections

### Suite patterns worth reusing

1. **Real subsystem over mock.** When a module accepts a config object (`{ dataDir }`), inject a temp path. Reserve `vi.mock` for modules that cannot be parameterised (SDK clients).
2. **Assert on typed errors, not messages.** `await expect(store.createPost(input)).rejects.toBeInstanceOf(CmsConflictError)` survives copy changes.
3. **Group by behaviour, not by function.** `describe('local CMS store')` walks a lifecycle — create → conflict → publish → revert → like → comment → cascade — which reads as a specification.
4. **Flip configuration through a getter.** `get isSupabaseConfigured() { return mocks.configured; }` inside `vi.mock` lets one test file cover both configured and unconfigured paths without re-importing.

### Test performance

Total 2.92 s wall clock: transform 269 ms, collect 444 ms, tests 222 ms, environment 5 ms, prepare 787 ms. Collection and preparation dominate; there is no bottleneck worth optimising.

### Suggested additions (not yet present)

- A coverage provider (`@vitest/coverage-v8`) with a threshold, wired into `npm run quality`.
- Route-handler tests for `/api/cms/posts` (editor gate, origin rejection, 429, 409 slug conflict) — `auth-callback.test.ts` already proves the pattern works for handlers.
- A `supabase test db` or pgTAP suite asserting the RLS policies, since RLS is the production authorization boundary.
- Widen `vitest.config.ts` `include` to `['**/*.test.ts']` (excluding `node_modules`) so a test added outside `lib/` cannot silently go unrun.

---

## Updated 2026-11-08

The suite grew from **10 files / 65 tests** to **12 files / 103 tests**, all
passing under `npm test`:

- `lib/__tests__/rate-limit.test.ts` — 14 tests for both rate-limit stores:
  KV-backed counters shared across store instances, TTL handling, fail-open on
  a KV read error, and the memory store's per-key eviction.
- `lib/__tests__/svg.test.ts` — 14 tests for `sanitizeSvgMarkup`, covering
  paired and self-closing `script`, `foreignObject`, single-quoted and unquoted
  `on*` handlers, `javascript:` and `data:text/html` URLs, and the rule that a
  same-document `url(#fragment)` reference survives.

`lib/__tests__/cms-schema.test.ts` gained 7 artifact-normalisation tests and
`lib/__tests__/cms-mapping.test.ts` gained 3 artifact-mapping tests.

The gap recorded above still stands: `vitest.config.ts` collects only
`lib/**/*.test.ts`, so none of the routes, components, or pages touched by this
work — including the rewritten `/write` publish flow and the hardened
`/api/generate` — is covered by a test.
