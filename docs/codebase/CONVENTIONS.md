# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Route files | Next.js reserved lowercase names | `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `not-found.tsx` | `app/post/[slug]/page.tsx` |
| Route directories | lowercase, kebab-case; dynamic segments bracketed | `editorial-board/`, `dashboard/comments/`, `[slug]/`, `[id]/` | `app/` tree |
| Component files | PascalCase `.tsx`, one default export | `BlogHeader.tsx`, `AuthorImpactRadarChart.tsx`, `QwenCoverGenerator.tsx` | `components/` |
| `lib/` files | kebab-case `.ts` | `blog-data.ts`, `safe-redirect.ts`, `rate-limit.ts` | `lib/` |
| Test files | `<subject>.test.ts` inside `lib/__tests__/` | `cms-schema.test.ts`, `safe-redirect.test.ts` | `vitest.config.ts` `include` |
| Functions | camelCase, verb-first | `normalizePostInput`, `getPublishedCmsPosts`, `cmsPostToArticle`, `isValidRevalidateSecret` | `lib/cms/schema.ts:87`, `lib/cms/read.ts:9`, `lib/cms/mapping.ts:31`, `lib/cms/secret.ts:14` |
| Store factories | `create<Thing>` | `createLocalCmsStore`, `createSupabaseCmsStore`, `createSupabaseServerClient` | `lib/cms/local-store.ts:60`, `lib/cms/store.ts` |
| Boolean helpers | `is`/`has` prefix | `isSupabaseConfigured`, `isSameOrigin`, `isEditor`, `hasRevalidateSecret`, `isLocalCmsMode` | `lib/supabase/config.ts:32`, `lib/cms/http.ts:6` |
| Types / interfaces | PascalCase; `interface` for object shapes, `type` for unions | `interface CmsPost`, `type CmsStatus = 'draft' \| 'published'`, `type EditorGate = …` | `lib/cms/types.ts`, `lib/cms/auth.ts:9` |
| Discriminated-union results | `{ ok: true; value: T } \| { ok: false; message: string; fieldErrors: FieldErrors }` | `PostNormalizationResult`, `CommentNormalizationResult` | `lib/cms/schema.ts:80-83` |
| Error classes | `Cms<Kind>Error`, all extending `CmsError` | `CmsValidationError`, `CmsConflictError`, `CmsNotFoundError`, `CmsUnavailableError` | `lib/cms/errors.ts` |
| Constants | UPPER_SNAKE_CASE module constants; frozen-ish `as const` records | `CMS_LIMITS`, `MAX_QUERY`, `SESSION_COOKIE_NAME`, `SUPABASE_URL`, `CATEGORIES` | `lib/cms/schema.ts:7`, `app/api/research-assistant/route.ts:10`, `app/api/auth/session/route.ts:4` |
| Env vars | UPPER_SNAKE_CASE; browser-visible ones prefixed `NEXT_PUBLIC_` | `NEXT_PUBLIC_SUPABASE_URL`, `REVALIDATE_SECRET` | `lib/supabase/config.ts`, `.env.example` |
| DB columns | snake_case in SQL, camelCase in TS, mapped explicitly | `author_id` → `authorId`, `key_takeaways` → `keyTakeaways` | `supabase/migrations/20261025000100_cms_schema.sql`, `lib/cms/supabase-store.ts:47-71` |
| SQL identifiers | lowercase, snake_case, `public.` schema-qualified; policies use quoted sentence-case names | `create policy "Editors can create posts"` | `supabase/migrations/*.sql` |
| Unused params/vars | Leading underscore to opt out of the lint rule | `argsIgnorePattern: '^_'`, `varsIgnorePattern: '^_'` | `eslint.config.mjs:25-28` |
| Private members | **No underscore or `#` convention.** Module privacy is achieved by not exporting; the leading underscore is reserved exclusively for unused parameters | `createDomainFallbackSvg` and `toNumericId` are unexported but unprefixed | `app/api/author-avatar/route.ts:9`, `lib/cms/supabase-store.ts:43` |

### 2) Formatting and Linting

- **Formatter:** none configured. There is no Prettier, EditorConfig, or Biome file in the repository (verified: `ls -a | grep -iE "prettier|editorconfig"` → nothing). Style is convention-based and matches what `next` scaffolding produces.
- **Linter:** ESLint 9.39.1, **flat config** at `eslint.config.mjs`, extending `next/core-web-vitals` and `next/typescript` through `FlatCompat`.
- **Most relevant enforced rules** (all set to `error`, not `warn`, in `eslint.config.mjs:23-40`):
  - `@typescript-eslint/no-explicit-any` — `any` is banned outright
  - `@typescript-eslint/no-unused-vars` with `^_` ignore pattern
  - `react/jsx-no-target-blank`
  - `jsx-a11y/alt-text`, `jsx-a11y/aria-props`, `jsx-a11y/label-has-associated-control` (`assert: 'either'`, `depth: 3`)
  - One deliberate relaxation: `react-hooks/set-state-in-effect: 'off'`
  - One file-scoped relaxation: `@typescript-eslint/triple-slash-reference: 'off'` for `next-env.d.ts`
- **Ignored paths:** `.next/**`, `node_modules/**`, `ResearchWith.me-main/**`, `data/**`, `coverage/**`, `.open-next/**`, `.wrangler/**`, `cloudflare-env.d.ts`.
- **Run commands:** `npm run lint` (`eslint .`), `npm run typecheck` (`tsc --noEmit`). **Both verified clean in this workspace** — each exits 0 with no output.
- **Additional gate:** `npm run impeccable:source` (`impeccable detect app components`) — verified: 102 files scanned, **0 anti-patterns**, 1 advisory note for `#0f172a` in `app/opengraph-image.tsx:26` (undocumented palette colour).
- **Two lint configs coexist:** `eslint.config.mjs` (flat, authoritative for ESLint 9) and a legacy `.eslintrc.json` containing only `{ "extends": "next" }`. ESLint 9 does not read `.eslintrc.json` when a flat config is present, so the JSON file is inert. `[ASK USER 4]`

### 3) Import and Module Conventions

- **Alias policy:** `@/*` → repo root (`tsconfig.json` `baseUrl: "."`, `paths`). Used for **cross-module** imports: 296 `@/`-prefixed specifiers vs 45 relative. Relative imports are used **within** a module (`lib/cms/schema.ts` imports `'./types'`, `'./errors'`; `lib/supabase/oauth.ts` imports `'../safe-redirect'`).
- **Import grouping:** a consistent three-group order — (1) framework/external packages, (2) `@/` absolute imports, (3) relative imports. Blank lines are not consistently used between groups. Example, `app/api/cms/posts/route.ts:1-8`: `next/server` first, then seven `@/lib/...` imports.
- **Quote and semicolon style:** single quotes and semicolons throughout, with one exception — `app/api/generate/route.ts` uses double quotes (the only file matched by `grep -rl '= "'`). `hooks/use-mobile.ts` uses double quotes and omits semicolons.
- **Runtime-boundary directives are the first statement:** `'use client'` at line 1 in 48 files; `import 'server-only'` at line 1 in 5 files (`lib/cms/auth.ts`, `lib/cms/catalogue.ts`, `lib/cms/read.ts`, `lib/cms/store.ts`, `lib/supabase/server.ts`).
- **Barrel exports:** essentially none. `lib/blog-data.ts:79` re-exports from `./categories`, which is the only re-export chain found; modules are imported by direct path.
- **Type-only imports** use `import type` consistently (`import type { CmsPost } from './types'`, `import type { Metadata } from 'next'`), which `isolatedModules: true` requires.

### 4) Error and Logging Conventions

**Error strategy by layer:**

| Layer | Strategy | Evidence |
|---|---|---|
| Validation (`lib/cms/schema.ts`, `lib/validation.ts`) | Return a discriminated union with `fieldErrors`. Never throws | `lib/cms/schema.ts:80-83` |
| Store adapters (`lib/cms/*-store.ts`) | Throw the typed `Cms*Error` hierarchy | `lib/cms/local-store.ts:107`, `lib/cms/supabase-store.ts` |
| Public reads (`lib/cms/read.ts`) | Catch everything, `console.error`, return an empty result | `lib/cms/read.ts:15-18` |
| Route handlers | `try/catch` → `errorResponse(error)` (`lib/cms/http.ts:58-64`), or hand-built `NextResponse.json({ error }, { status })` | `app/api/cms/posts/route.ts:24-26` |
| Browser API client | `cmsFetch` throws `ApiError` carrying `status` + `fieldErrors`; a 401 redirects to `/login?next=…` | `lib/cms/client-api.ts:5-56` |
| React surfaces | `app/error.tsx` (route-level) and `app/global-error.tsx` (root-level) | those files |

Errors returned to clients are **always plain prose strings** in a `{ error: string }` envelope, never stack traces — with two exceptions noted in CONCERNS.md (`/api/generate` and `/api/author-avatar` echo `error.message` from the upstream provider).

**Logging:** `console.*` only — no structured logger, no log levels, no correlation IDs. 20 source files log (excluding tests). Convention is `console.error('<human sentence>:', error)` for failures and `console.warn` for a recoverable fallback (`lib/cms/read.ts:16`, `app/api/author-avatar/route.ts:110`). In the assistant route, only the message is logged rather than the full error: `console.error('Research assistant model call failed:', error instanceof Error ? error.message : error)` (`app/api/research-assistant/route.ts:153`).

**Sensitive-data redaction:** no explicit redaction layer. Two deliberate practices stand in for one: the revalidation secret is read from the `x-revalidate-secret` **header** rather than the query string *"so it never lands in access logs"* (`app/api/revalidate/route.ts:19-21`), and secret comparison hashes both values before `timingSafeEqual` so length cannot leak (`lib/cms/secret.ts:17-22`). `wrangler.jsonc` sets `observability.redact_query_string: false`, so query strings **are** persisted to Cloudflare logs — which matters because `/api/revalidate` still accepts `?secret=` as a fallback (`app/api/revalidate/route.ts:41`).

### 5) Testing Conventions

- **Test file naming/location:** `lib/__tests__/<subject>.test.ts`. Collocated under `lib/` only — `vitest.config.ts` sets `include: ['lib/**/*.test.ts']`, so tests anywhere else would silently not run.
- **Mocking strategy norm:** prefer real modules with injected configuration over mocks. `lib/cms/local-store.ts:60` accepts `{ dataDir }`, so tests point a real store at a temp directory instead of mocking `fs`. Environment variables are saved, mutated, and restored in `beforeEach`/`afterEach` (`lib/__tests__/cms-secret.test.ts:5-17`).
- **Coverage expectation:** none configured. No coverage provider, threshold, or `coverage/` script exists in `vitest.config.ts` or `package.json`. `coverage/` appears only in ignore lists.
- Detail in [TESTING.md](./TESTING.md).

### 6) Evidence

- `eslint.config.mjs` — flat config, extends, rules, ignores
- `.eslintrc.json` — legacy config, inert under ESLint 9
- `tsconfig.json` — `strict`, `isolatedModules`, `paths`, `plugins: [{ name: 'next' }]`
- `vitest.config.ts` — alias, `environment: 'node'`, `include`
- `lib/cms/errors.ts` + `lib/cms/http.ts` — the error taxonomy and its HTTP mapping
- `lib/cms/schema.ts` — representative source file for naming, unions, and normalisation style
- `app/api/cms/posts/route.ts` — representative route handler
- `lib/cms/local-store.ts` — representative adapter
- `DESIGN.md`, `CLAUDE.md` — stated conventions (Tailwind v4 tokens, conventional commits, `npm run quality` before PR)

## Extended Sections

### TypeScript strictness detail

`tsconfig.json` sets `strict: true` (which enables `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`). Additional flags: `isolatedModules: true`, `noEmit: true`, `allowJs: true`, `skipLibCheck: true`, `resolveJsonModule: true` (which is what lets `app/sitemap.ts:6` do `import persistedArticles from '@/data/articles.json'`), `allowImportingTsExtensions: true`, `incremental: true`, `jsx: 'preserve'`. Excludes: `node_modules`, `.open-next`, `.wrangler`.

Notably **absent**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`. With `noUncheckedIndexedAccess` off, patterns like `dataArray[1]` in `app/api/generate/route.ts:75-79` are typed non-undefined and guarded manually instead.

Catch clauses are `unknown` under `strict`, and the codebase consistently narrows with `error instanceof Error ? error.message : '…'` rather than casting — `@typescript-eslint/no-explicit-any: 'error'` makes the cast route unattractive.

### Stated repo conventions (from `CLAUDE.md`)

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- `npm run quality` must pass before any commit or PR.
- CMS writes go through `/api/cms/*`, never directly to Supabase client-side with a service-role key. (No service-role key is present anywhere in the repo — verified.)
- Supabase migrations are idempotent SQL in `supabase/migrations/`.
- Tailwind v4: no arbitrary values for spacing or colour that already exist as tokens; tokens live in `DESIGN.md`.
- Read `PRODUCT.md` and `DESIGN.md` before touching a UI surface; keep `.impeccable/surfaces/` briefs in sync with every route change.

**Unverifiable here:** the commit-message convention cannot be checked — this is a shallow clone with a single visible commit (`8ca0f81 Merge branch 'main' …`), which does not follow the conventional format. See CONCERNS.md.

---

## Updated 2026-11-08

- `.eslintrc.json` has been deleted; `eslint.config.mjs` is the only lint config.
- `hooks/use-mobile.ts` and the `hooks/` directory have been deleted, so the
  double-quote/semicolon exception it represented is gone.
- `app/api/generate/route.ts` was rewritten and no longer uses double quotes,
  so the codebase is now uniform on single quotes with semicolons.
- **Bun is the only package manager.** `package.json` declares
  `packageManager: "bun@1.4.4"`, `package-lock.json` is deleted, and the README
  documents `bun install`.
- New convention for model-supplied markup: never `dangerouslySetInnerHTML`.
  Pass it through `sanitizeSvgMarkup()` from `lib/svg.ts` and render it as an
  `<img>` data URI.
