# Coding Conventions

> 2026-11-20 update: storefront, payment integration, and product CLI bundles removed. File counts and earlier validation results below remain historical snapshot measurements; see `docs/commerce-retirement.md`.

> Snapshot verified against commit `027c746bbbdf3f7a3871c0a7e2b4ecaadec066c9` across 399 production TS/TSX files (`app/`, `components/`, `lib/`, `cloudflare-pages/src/`, `workers/`).

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Files (React components) | `PascalCase.tsx` inside `components/` (`96/120` default-exported) | `PostEditor.tsx`, `ResearchAssistant.tsx`, `PlateBodyEditor.tsx` | `components/cms/PostEditor.tsx`, `components/editor/PlateBodyEditor.tsx` |
| Files (App Router) | Next.js reserved lowercase names inside `kebab-case` segments | `page.tsx`, `layout.tsx`, `route.ts`, `[slug]`, `(studio)` | `app/post/[slug]/page.tsx`, `app/dashboard/(studio)/layout.tsx` |
| Files (Domain/utils/scripts) | `kebab-case.ts` / `kebab-case.mjs` | `rate-limit-core.ts`, `oauth-discovery.ts`, `check-budgets.mjs` | `lib/rate-limit-core.ts`, `scripts/check-budgets.mjs` |
| Files (SQL migrations) | 14-digit UTC timestamp `YYYYMMDDHHMMSS_snake_case.sql` (2 violations: 8-digit `20261115_linkedin_*.sql`) | `20261116000100_editorial_publication_type.sql` | `supabase/migrations/` |
| Functions / methods | `camelCase`; React hooks prefixed `use*`; boolean predicates prefixed `is*`/`can*`/`has*` | `getCachedArticleCatalogue`, `useSession`, `isSameOrigin`, `canEditVisually` | `lib/cms/catalogue.ts`, `lib/supabase/use-session.ts`, `lib/cms/http.ts` |
| Types / interfaces | `PascalCase`; `export interface` preferred for object shapes (`249` interfaces vs `134` type aliases) | `export interface CmsPost`, `export type BlogCategory` | `lib/cms/types.ts`, `lib/blog-data.ts` |
| Constants / env vars | `UPPER_SNAKE_CASE` for module-level config constants & env vars; public browser vars prefixed `NEXT_PUBLIC_` | `SITE_URL`, `STALLED_DRAFT_DAYS`, `NEXT_PUBLIC_SUPABASE_URL` | `lib/seo.ts`, `lib/dashboard/metrics.ts`, `.env.example` |
| CSS design tokens | `--reme-*` semantic variables generated from `tokens/src/*.json`; DaisyUI theme names `reme-light`/`reme-dark` | `--reme-color-text-primary`, `--font-sans` | `tokens/generated/tokens.css`, `app/globals.css`, `styles/daisy-themes.css` |

### 2) Formatting and Linting

- **Formatter:** No Prettier / Biome configuration file exists in the repository (no `.prettierrc*`, `biome.json`, or `.editorconfig`). Formatting follows observed style: 2-space indentation, single quotes in TS/JS, trailing commas in multiline literals, semicolons.
- **Linter:** ESLint `9.39.1` flat config (`eslint.config.mjs`) extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- **Design-system static checker:** `impeccable` `4.7.0` configured via `.impeccable/config.json` (run as `npx impeccable detect app components`).
- **PR title linter:** `.github/workflows/pr-title.yml` validates PR titles with `amannn/action-semantic-pull-request@v5` (Conventional Commits prefixes: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`, `style`, `build`, `revert`).
- **Identity guard:** `test/reme-name.test.mjs` (`npm run reme:test`) forbids retired pre-`reme` brand spellings (see regex in `test/reme-name.test.mjs:7`) in any tracked path or text file.
- **Most relevant enforced rules (`eslint.config.mjs`):**
  - Ignores `.next/**`, `.open-next/**`, `out/**`, `build/**`, `next-env.d.ts`, `cloudflare-pages/dist/**`, `.agents/**`, `.impeccable/**`, `references/**`, `videos/**`, `public/webmcp.js`, `tokens/generated/**`.
  - Custom rules on `**/*.{ts,tsx,js,jsx,mjs}`: `react/no-unescaped-entities: 'off'`, `@next/next/no-img-element: 'off'`.
  - TypeScript strictness (`tsconfig.json`): `"strict": true`, `"noEmit": true`, `"isolatedModules": true`, `"esModuleInterop": true`.
- **Run commands:**
  ```bash
  npm run lint
  npm run typecheck
  npm run impeccable:source
  npm run tokens:build && npm run tokens:check
  npm run reme:check && npm run reme:test
  ```

### 3) Import and Module Conventions

- **Import grouping/order:** Observed convention (not auto-enforced by a plugin): framework/external packages first (`next/*`, `react`, third-party), then `@/*` internal modules, then relative siblings (`./*`), with `import type` widely used for type-only imports (`app/post/[slug]/page.tsx`, `lib/cms/types.ts`).
- **Alias vs relative import policy:** `@/*` (mapped to repository root `./*` in `tsconfig.json` and `vitest.config.ts`) dominates across boundaries (`823` `@/` imports vs `303` relative imports). Relative `./` imports are standard within the same domain directory (e.g., `lib/cms/http.ts` importing `./errors` and `./types`).
- **Server/client boundary directives:**
  - `85` files begin with `'use client';` across `app/`, `components/`, `lib/`, and `cloudflare-pages/src/`.
  - `14` server-only modules begin with `import 'server-only';` (`lib/api/{answers,authenticate,key-store,ledger,session}.ts`, `lib/author-directory.ts`, `lib/cms/{auth,authors,catalogue,read,store}.ts`, `lib/dashboard/data.ts`, `lib/supabase/server.ts`).
- **Public exports / barrel policy:** Selective barrels exist for UI primitive families (`components/primitives/index.ts` — 34 imports; `components/workflows/index.ts` — 7 imports; `components/lottie/index.ts` — 3 imports). Most components (`96/120` `.tsx`) use `export default`; `lib/` domain modules use named exports almost exclusively.
- **Class-name helper split (minor inconsistency):** Both `@/lib/utils` (`cn`, 18 importers) and `components/primitives/cx.ts` (`cx`, 13 importers) coexist; `lib/format.ts` also exports `cn` (0 importers).

### 4) Error and Logging Conventions

- **Error strategy by layer:**
  - *CMS Domain (`lib/cms/errors.ts`, `lib/cms/http.ts`):* Typed error class hierarchy (`CmsError` base with `status` + `code` -> `CmsValidationError` 400 + `fieldErrors`, `CmsAuthorError` 422 + `fieldErrors`, `CmsConflictError` 409, `CmsNotFoundError` 404, `CmsUnavailableError` 503), translated uniformly via `errorResponse(error)`.
  - *Metered API v1 (`lib/api/errors.ts`):* Structured JSON envelope `{ error: { code, message, details? } }` with machine-readable codes (`UNAUTHORIZED`, `RATE_LIMITED`, `QUOTA_EXCEEDED`, `INVALID_REQUEST`, `IDEMPOTENCY_CONFLICT`, `UPSTREAM_ERROR`, etc.) and `X-Request-Id`.
  - *Route Handlers (`app/api/**`):* Return `NextResponse.json({ error: '...' }, { status })` with `Cache-Control: no-store, max-age=0` (`noStoreHeaders()`), never leaking stack traces to clients (exceptions: `app/api/webhooks/article-published/route.ts` and `app/api/cron/linkedin-batch/route.ts` expose `error.message` directly in 500 JSON responses).
  - *Pure validators/parsers:* Return discriminated union `{ ok: true, value } | { ok: false, ... }` (`readJsonBody`, `normalizeCommentInput`, `authenticateApiKey`).
- **Logging style:** Standard `console.error` / `console.warn` / `console.log` (`53` production TS/TSX files call `console.*`); no structured JSON logger (Pino/Winston) or external telemetry SDK is installed.
- **Sensitive-data redaction rules:**
  - API keys (`rwm_` + 43 base64url chars) are shown once on creation (`app/api/account/api-keys/route.ts`), stored only as SHA-256 hashes + first 12-character prefix (`lib/api/keys.ts`).
  - `scripts/dns-aid-cloudflare.mjs` explicitly avoids logging `CLOUDFLARE_API_TOKEN` (verified by `test/dns-aid.test.mjs`).
  - `lib/linkedin/monitoring.ts` stores `linkedin_events` error messages in Postgres (`details` JSONB) without redaction helpers.

### 5) Testing Conventions

- **Test file naming & location:**
  - Unit & component tests: `lib/__tests__/*.test.{ts,tsx}` (`116` files) and `lib/linkedin/__tests__/*.test.ts` (`6` files) + snapshots in `lib/__tests__/__snapshots__/`.
  - Next.js route & SSR tests: `test/next/*.test.ts` (`8` test files + `support.ts`).
  - Cloudflare Pages parity tests: `test/pages/*.test.ts` (`25` files).
  - HTTP baseline contract test: `test/contracts/baseline.test.ts` (`1` file).
  - Zero-dependency Node built-in runner tests: `test/*.test.mjs` (`5` files using `node:test` + `node:assert/strict`).
  - Playwright E2E specs: `test/e2e/*.spec.ts` (`12` files) + `test/browser/visual-parity.spec.ts`.
  - Database tests: `supabase/tests/*.test.sql` (pgTAP, `2` files) + `supabase/tests/*.check.mjs` (PGlite, `3` files).
- **Environment opt-in:** Default Vitest environment is `node` (`vitest.config.ts`); DOM/React tests opt in per file via `// @vitest-environment jsdom` (`29` files).
- **Mocking strategy norm:** `vi.mock(...)` for server/network modules (`33` files), `vi.stubEnv(...)` + `vi.resetModules()` + temp `RWM_DATA_DIR` for route-handler isolation (`test/next/support.ts`), and dependency injection (`fetcher`, `store`, `now`) in pure modules (`lib/dashboard/metrics.ts`, `scripts/dns-aid-cloudflare.mjs`).
- **Coverage expectation:** No coverage provider or minimum threshold is configured in `vitest.config.ts` or `.github/workflows/quality.yml` (`[TODO]`: establish formal coverage thresholds if desired).

### 6) Evidence

- `eslint.config.mjs`
- `tsconfig.json`
- `vitest.config.ts`
- `.impeccable/config.json`
- `.github/workflows/pr-title.yml`
- `lib/cms/errors.ts`
- `lib/cms/http.ts`
- `lib/api/errors.ts`
- `lib/blog-data.ts`
- `lib/dashboard/metrics.ts`
- `components/primitives/index.ts`
- `components/cms/MarkdownEditor.tsx`
- `test/next/support.ts`
- `test/reme-name.test.mjs`

## Extended Sections (Optional)

### Known Convention Violations to Clean Up

1. **Broken `npm run reme:test` identity guard:** `ResearchWithME-master-refactor-development-plan-v3.4.md` contains retired pre-`reme` brand spellings (matched by `test/reme-name.test.mjs:7`), causing `test/reme-name.test.mjs` (and CI `.github/workflows/quality.yml`) to fail on commit `027c746`.
2. **Non-standard SQL migration filenames & non-idempotent DDL:** `supabase/migrations/20261115_linkedin_events.sql` and `20261115_linkedin_tokens.sql` break the 14-digit timestamp rule and omit `IF NOT EXISTS` / `DROP POLICY IF EXISTS`.
3. **Typo in GitHub instructions filename:** `.github/instructions/reme-artcile-writing.instructions.md` (`artcile` -> `article`).
4. **Inconsistent `Retry-After` units:** `app/api/a2a/route.ts:13`, `app/api/dashboard/applications/route.ts:68`, `app/api/dashboard/applications/[id]/route.ts:37`, `cloudflare-pages/src/server/api/a2a.ts:14`, and `cloudflare-pages/src/server/dispatch.ts:87` divide `limit.retryAfter` (already in seconds) by `1000`.
5. **Duplicate `cn`/`cx` helpers:** `@/lib/utils` (`cn`), `components/primitives/cx.ts` (`cx`), and unused `cn` in `lib/format.ts`.
6. **Raw `error.message` leakage:** `app/api/webhooks/article-published/route.ts` and `app/api/cron/linkedin-batch/route.ts` return raw exception messages in HTTP 500 JSON payloads, unlike `lib/cms/http.ts` and `lib/api/errors.ts`.
7. **HTML injection discipline:** All 8 `dangerouslySetInnerHTML` usages in `app/` and `cloudflare-pages/src/` serialize JSON-LD (`jsonLdScript`) or the theme-init script (`app/layout.tsx:103`), never unescaped user HTML.
