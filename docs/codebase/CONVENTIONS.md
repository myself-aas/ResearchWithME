# Coding Conventions

> Regenerated 2026-11-13 against `944f45c`. Counts come from `git grep` over tracked
> `app components lib cloudflare-pages/src` unless stated otherwise.

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Route files and dirs | Next reserved names; kebab-case segments; `[param]`; route groups in parens | `app/dashboard/(studio)/edit/[id]/page.tsx` | `app/` |
| Components | PascalCase `.tsx`, mostly default export (89 of 107 `.tsx` files in `components/`) | `PapersArchive.tsx`, `AssistantPanel.tsx` | `components/` |
| `lib/` modules | kebab-case `.ts`; `-core` suffix for platform-free logic | `rate-limit-core.ts`, `author-directory-core.ts` | `lib/` |
| Functions | camelCase, verb-first; factories `create*`; predicates `is*`/`has*` | `normalizePostInput`, `createSupabaseCmsStore`, `isSameOrigin` | `lib/cms/*` |
| Types | PascalCase. `interface` is the majority (170 exported vs 96 exported `type`); `type` for unions | `interface CmsPost`, `type EditorGate` | `lib/cms/types.ts`, `lib/cms/auth.ts` |
| Result unions | `{ ok: true; … } \| { ok: false; … }` | `EditorGate`, normalisation results | `lib/cms/schema.ts`, `lib/cms/auth.ts` |
| Errors | `Cms<Kind>Error` extends `CmsError` | `CmsConflictError`, `CmsUnavailableError` | `lib/cms/errors.ts` |
| Constants | UPPER_SNAKE_CASE | `CATALOGUE_TAG`, `SPACE_TIMEOUT_MS`, `DEFAULT_LEGACY_SEEDS` | `lib/cms/catalogue.ts`, `app/api/generate/route.ts` |
| Rate-limit scopes | `area:action` strings | `cms:create`, `author:apply`, `likes` | `app/api/**` |
| DB | snake_case SQL, `public.`-qualified; camelCase in TS with explicit mapping | `key_takeaways` ↔ `keyTakeaways` | `supabase/migrations/`, `lib/cms/supabase-store.ts` |
| Unused bindings | Leading `_` (lint-enforced ignore pattern) | `bodyMarkdown: _bodyMarkdown` | `eslint.config.mjs`, `lib/cms/catalogue.ts` |
| Private members | No `_`/`#` convention. Privacy means "not exported" | — | `lib/` |

### 2) Formatting and Linting

- **Formatter:** none (no Prettier, Biome or EditorConfig). The style is single quotes, semicolons and 2-space indentation. One outlier: `lib/utils.ts` (double quotes, no semicolons, shadcn-generated).
- **Linter:** ESLint 9 flat config (`eslint.config.mjs`): `next/core-web-vitals` + `next/typescript`, plus these as **errors**: `no-explicit-any`, `no-unused-vars` (with `^_` ignore), `react/jsx-no-target-blank`, `jsx-a11y/alt-text`, `jsx-a11y/aria-props`, `jsx-a11y/label-has-associated-control`. Relaxed: `react-hooks/set-state-in-effect: off`.
- **Current state (run 2026-11-13):** `eslint .` → 0 errors, 1 warning (`import/no-anonymous-default-export` at `open-next.config.ts:18`). `tsc --noEmit` → exit 0.
- **Design gates** (also part of `npm run quality`):
  - `impeccable detect app components` → 197 files, **0 findings**, 7 advisories. All 7 are literal colours outside the DESIGN.md palette (e.g. `#4F46E5`, `#555955` in `app/opengraph-image.tsx`, `components/AuthorImpactRadarChart.tsx`).
  - `tokens:check` validates tokens and contrast.
  - `lib/__tests__/design-token-usage.test.ts` enforces token use in source.
- **Stated in `CLAUDE.md`:** Tailwind v4 without arbitrary values where a token exists; motion only via `lib/motion/tokens.ts` and the `@/components/motion` primitives (`docs/motion-system.md`).

### 3) Import and Module Conventions

- **Alias:** `@/` → repo root. 867 `@/` imports vs 299 relative. Relative imports stay within a module folder (`lib/cms/*` → `./types`).
- **Order:** framework/packages, then `@/…`, then relative (e.g. `app/api/cms/posts/route.ts:1-10`).
- **Boundary directives first:** `'use client'` in 80 files; `import 'server-only'` in 7. Shared `components/` must stay free of `server-only`, or the Pages build fails.
- **Type-only imports** use `import type` (required by `isolatedModules`).
- **Barrels:** `components/motion/index.ts` exists, but app code imports each primitive by direct path (`@/components/motion/Reveal`, `…/Pressable`); nothing imports the barrel. `CLAUDE.md` describes the primitives as `from '@/components/motion'`. Both work.
- **Class-name helper, three copies:** `cn` from `@/lib/utils` (clsx + tailwind-merge, 14 importers); `cx` from `components/primitives/cx` (imported `as cn`, 13 importers inside `components/primitives/`); and `cn` in `lib/format.ts` (plain join, 0 importers). Use `@/lib/utils` for new code outside `primitives/`.
- **Markup safety:** `dangerouslySetInnerHTML` is used only for JSON-LD (via `jsonLdScript()`, which escapes `<` at `lib/seo/jsonld.ts:166-167`) and the theme-init script in `app/layout.tsx:91`. Model-supplied SVG goes through `sanitizeSvgMarkup()` (`lib/svg.ts`) and is rendered as an `<img>` data URI.

### 4) Error and Logging Conventions

| Layer | Strategy | Evidence |
|---|---|---|
| Validation | Return a result union with `fieldErrors`; never throw | `lib/cms/schema.ts` |
| Stores | Throw typed `Cms*Error`; the legacy bridge throws on persistence failure | `lib/cms/errors.ts`, `lib/db.ts` header |
| Public reads | Catch, `console.error`, return empty | `lib/cms/read.ts` |
| Route handlers | `errorResponse(error)` or `NextResponse.json({ error: '<sentence>' }, { status })`; `Retry-After` on 429; `noStoreHeaders()` on studio responses | `lib/cms/http.ts`, `app/api/cms/posts/route.ts` |
| Browser client | `cmsFetch` throws `ApiError` (status + fieldErrors); 401 → `/login?next=` | `lib/cms/client-api.ts` |
| React | `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` | — |

Client-facing errors are plain-prose `{ error }` strings. Model routes return a generic message (`GENERIC_ERROR` in `app/api/generate/route.ts`).

**Logging:** `console.error`/`console.warn` only, in 44 non-test files. No logger, levels or request IDs. Pattern: `console.error('<sentence>:', error)`.

### 5) Testing Conventions

- Unit tests: `lib/__tests__/<subject>.test.ts(x)`. Harness tests: `test/pages/*.test.ts`, built with `createTestApp()` fakes from `test/support/pages.ts`.
- `node` environment by default; DOM tests opt in per file with `// @vitest-environment jsdom` (9 files).
- Real subsystems over mocks: temp dirs via `RWM_DATA_DIR`/`dataDir`, injected stores, `setRateLimitStoreForTesting()`. `vi.mock` appears in 5 files.
- No coverage threshold. Details in [TESTING.md](./TESTING.md).

### 6) Evidence

- `eslint.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `package.json` (`quality`)
- `lib/cms/{schema,errors,http,auth,client-api}.ts`, `app/api/cms/posts/route.ts`
- `lib/utils.ts`, `lib/format.ts`, `lib/seo/jsonld.ts`, `lib/svg.ts`
- `CLAUDE.md`, `DESIGN.md`, `docs/motion-system.md`
- Command output 2026-11-13: lint (1 warning), typecheck (clean), Impeccable (0 findings / 7 advisories)

## Extended Sections

### Commit messages

`CLAUDE.md` requires Conventional Commits. In practice, **9 of the last 30** subjects follow the format (`git log --format=%s -30`). Others read like `Add migration for blog-images storage bucket…` or `Fix legacy catalogue counters…`. See CONCERNS `[ASK USER 6]`.

### TypeScript strictness

`strict: true`, `isolatedModules`, `noEmit`, `allowJs`, `resolveJsonModule`, `allowImportingTsExtensions`. Not enabled: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Catch variables are narrowed with `error instanceof Error`, not cast.
