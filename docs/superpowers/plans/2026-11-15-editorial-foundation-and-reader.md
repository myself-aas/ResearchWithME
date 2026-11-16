# Editorial Foundation and Reader Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` for sequential execution or `superpowers:subagent-driven-development` if that capability is available. Steps use checkboxes. Review existing uncommitted changes first; do not commit or push unless the user explicitly requests it.

**Goal:** Make the existing editorial theme and article reader reliable across the Next and Pages builds, with real behavioral and cross-build regression coverage.

**Architecture:** Keep both route/data implementations and shared React components; change the smallest owning unit and test each deliverable independently. `tokens/src/` remains the source of semantic colors, and both CSS entry points consume generated tokens; distinguish actual rendering tests from source checks.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, DaisyUI, Vite/React Router Pages, Vitest and Playwright.

**Spec:** `docs/frontend-refactoring-plan-2026-11-15.md` (scope and acceptance criteria), `docs/editorial-refresh-2026-11-15.md` (current visual decisions), and the user's supplied editorial briefs and article-layout confirmation. Existing audit files are historical context, not current verification.

## Global Constraints

- Preserve current working-tree changes, article content, citations, routes, SSR/404 behavior, author identity, Plus Jakarta Sans, enlarged logo and functionality.
- Light palette uses `#005BBF` for primary actions; dark uses `#ADC7FF` with `#002E68` on-primary. Do not assert byte-equivalence to Google.
- No mobile bottom navigation or fixed article dock; preserve reading controls inline. Keep the existing light/dark selection and reduced-motion support.
- Related buttons use matching size, shape, typography and spacing, with filled/unfilled variants; destructive and icon controls may be exceptions. Default touch targets are at least 44 CSS pixels.
- No new UI dependency or backend, billing, authentication, Supabase Preview, deployment, or production data changes. Material Web is reference only.
- Do not alter generated token files manually: use `npm run tokens:build`. Use local fixture data and blank public Supabase build variables for Pages tests.
- Work on the existing branch only; any commits require explicit user authorization. Source-only assertions, a passing build or a successful HTTP request do not constitute a visual or accessibility audit.

## Review Focus

1. Updated palette invalidates old literal browser expectations: Task 1 tests actual light and dark component aliases and domain badge contrast.
2. Empty catalogue or unknown article slug must return a real 404 rather than fake content or a 200: Task 4 tests the missing route through each available server.
3. Long text at narrow widths must not overflow or hide inline controls: Task 5 tests 320px and 390px geometry.
4. Failed clipboard or like requests must not falsely report success or leave a false liked state: Task 3 tests failure and rollback.
5. System dark preference, explicit theme selection and reduced motion must not obscure content: Task 5 tests both theme selections and reduced motion; automatic system selection is checked separately in Task 1.

## Scope and file map

This is the first independently shippable slice of the broader roadmap. Home/discovery, authors, tools, studio and performance work are separate subsystems: after this slice, write separate implementation plans against the remaining sections of the spec rather than treating the roadmap's broad descriptions as ready-to-execute tasks. Do not redesign or refactor unrelated routes in this slice.

- `tokens/src/semantic-{light,dark}.json`, `tokens/generated/`, `styles/daisy-themes.css`, `app/globals.css`, `cloudflare-pages/src/globals.css`: current shared theme sources and build-specific aliases.
- `test/e2e/token-theme.spec.ts`: browser checks for generated component token aliases and badge contrast.
- `components/primitives/Button.tsx`, `components/ui/button.tsx`: existing distinct APIs; preserve Pressable feedback, Radix `asChild` and legacy variant names.
- `components/ArticleInteractions.tsx`, `components/reader/ReadingProgressDock.tsx`: existing article actions and inline controls.
- `app/post/[slug]/page.tsx`, `cloudflare-pages/src/routes/post.tsx`: distinct server routes, each keeps its own data loading and rendering contract.
- `lib/__tests__/`, `test/e2e/`: focused unit and browser coverage; `test/fixtures/articles.ts` supplies synthetic fixture data, never published content.

## Task 0: Baseline and execution gate

**Files:** Read `README.md`, `test/playwright.config.ts`, `docs/frontend-refactoring-plan-2026-11-15.md`; create `docs/editorial-verification-2026-11-15.md` as the result log.

**Interfaces:** No production changes. The log records commands, date, results, environment, skips, and actual route coverage for later tasks.

- [ ] Record `git status --short`, current supported overlapping routes and existing untracked changes in the log; do not discard or reset anything.
- [ ] Run `npm run tokens:check`, `npm run typecheck`, `npx vitest run lib/__tests__/article-editorial-layout.test.ts lib/__tests__/branding-header.test.tsx lib/__tests__/daisy-theme-contrast.test.ts`, then `npm test`. Record pass/fail/skip counts and failures verbatim; do not attribute failures to this plan without evidence.
- [ ] Run `RWM_BUILD_TARGET=test NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm run build:pages`. Record exit status and chunk warnings; this is not visual verification.
- [ ] Check Chromium availability per `test/playwright.config.ts` (`RWM_CHROMIUM_PATH` and required libraries). If the previously missing NSS/NSPR libraries remain missing, record the browser blocker and continue non-browser tasks; do not rerun the previously failed gate unchanged. Browser-dependent tasks remain **blocked**, not passed, until a working browser is available.

## Task 1: Correct live theme regressions

**Files:** Modify `test/e2e/token-theme.spec.ts`; test `tokens/generated/tokens.css`; change `tokens/src/semantic-{light,dark}.json` and regenerate only if a real contrast or behavior defect is confirmed.

**Interfaces:** Existing `--reme-component-{source,evidence,claim}-card-background` and semantic variables; preserve their names. CSS generation is `npm run tokens:build`.

- [ ] Run `npx playwright test --config test/playwright.config.ts --project=e2e test/e2e/token-theme.spec.ts` before editing. Record whether stale palette literals fail. If browser setup is blocked, do not claim this check passed.
- [ ] Adjust the existing component alias tests to assert card background is `rgb(255, 255, 255)` in light and `rgb(19, 24, 35)` in dark, and title text is `rgb(32, 33, 36)` light and `rgb(248, 249, 250)` dark; preserve the existing emerging/uncertain contrast tests. These values follow the current surface and text aliases in `tokens/src/component.json`.
- [ ] Add an explicit system-color-scheme test: with no `.dark` class, emulate `dark` and assert the dark semantic background; emulate `light` and assert light background. Verify any explicit light override supported by the current theme implementation separately; do not assume removing `.dark` overrides a dark OS preference.
- [ ] Run `npm run tokens:check` and the Playwright command again; record outputs. If tokens require a fix, update source JSON, run `npm run tokens:build`, rerun both checks, and inspect the generated diff.

## Task 2: Consistent article action geometry

**Files:** Modify `components/ArticleInteractions.tsx`; create `lib/__tests__/article-interactions-layout.test.tsx`.

**Interfaces:** `ArticleInteractions({ postId: string, title: string, initialLikes: number })`; keep accessible labels, callbacks and API calls unchanged. Existing button components remain separate in this task.

- [ ] Write a jsdom test `article actions share the same control geometry` rendering with `{ postId: 'p1', title: 'Fixture', initialLikes: 2 }`; assert Like, Save, Share and Copy link buttons have `min-h-11`, `rounded-full`, `px-3`, `py-2`, `font-sans`, `text-xs` and `font-medium`. Assert their accessible names remain present and Save has `aria-pressed="false"`. Use the existing render/mocking conventions in `lib/__tests__/reader-dock-lenis.test.tsx`.
- [ ] Run `npx vitest run lib/__tests__/article-interactions-layout.test.tsx`; expect failure if any of those shared classes differ. If it already passes, record that and do not manufacture a failure.
- [ ] Make only the missing class adjustments in `components/ArticleInteractions.tsx`; do not unify unrelated button implementations or change save/like semantics.
- [ ] Rerun that test and `npx eslint components/ArticleInteractions.tsx lib/__tests__/article-interactions-layout.test.tsx`; expect zero failures.

## Task 3: Preserve article action failures and inline controls

**Files:** Create `lib/__tests__/article-interactions-behavior.test.tsx`; modify `components/ArticleInteractions.tsx` or `components/reader/ReadingProgressDock.tsx` only if a test exposes a defect; extend `lib/__tests__/reader-dock-lenis.test.tsx`.

**Interfaces:** Like sends `PATCH /api/articles/<encoded postId>`; save uses the existing preferences store; inline dock takes `inline?: boolean`, `discussionAnchor?: string`, `citationSource`, `citeHref`, `itemId`, `itemKind`, and `readTime`.

- [ ] Write test `failed like rolls back and reports failure`: mock `fetch` to reject, click Like, wait for status `The like could not be recorded. Check your connection and try again.`, assert count returns to `2` and the like button has `aria-pressed="false"`. Reset the preferences store and mocks between tests.
- [ ] Write test `clipboard rejection reports failure`: reject `navigator.clipboard.writeText`, click Copy link, and assert status `Clipboard access was blocked. Copy the address from your browser.` with no `Copied` success label.
- [ ] Add a test `inline reading controls are not fixed` to the reader-dock test: render `inline` with `discussionAnchor="#discussion"`; assert `aside[aria-label="Reading controls"]` lacks `fixed`, includes the discussion link, and includes an accessible scroll-to-top and save control. Keep existing fixed-mode behavior for other callers if any.
- [ ] Run `npx vitest run lib/__tests__/article-interactions-behavior.test.tsx lib/__tests__/reader-dock-lenis.test.tsx`; expect tests to pass if current behavior already meets them, otherwise observe the specific failure and make the smallest correction. Rerun the same command and lint changed files.

## Task 4: Article SSR and missing-slug contracts

**Files:** Extend existing Next article tests if present or create `lib/__tests__/article-route-contract.test.tsx`; extend Pages route loader tests in their existing owner after locating them with `rg -n 'PostLoaderData|postLoader|findArticle' lib cloudflare-pages test`. Modify the corresponding route files only for proven regressions.

**Interfaces:** Next `ArticlePage({ params: Promise<{ slug: string }> })` and `generateMetadata` use `notFound()` for a missing article; Pages `/post/:slug` uses its loader. Existing `makeTestArticle(overrides: Partial<BlogPost>): BlogPost` is fixture input.

- [ ] Add a Next route test `unknown article invokes notFound` with an empty mocked catalogue and `{ params: Promise.resolve({ slug: 'missing' }) }`; assert `notFound` is invoked and no article content is rendered. Also test `fixture title and markdown are server rendered` using `makeTestArticle({ title: 'Fixture title', bodyMarkdown: 'Fixture body' })` and assert both appear in server-rendered markup.
- [ ] Add a Pages loader/route test `unknown article returns 404` with an empty fixture catalogue and `fixture article is rendered with title and body` with the same fixture; assert the loader response status is 404 for missing and content exists for the known article. Use the repository's existing loader setup instead of inventing network data. Inspect the loader's actual signature before writing the mock.
- [ ] Run the exact Vitest paths created or extended in this task plus `npx vitest run lib/__tests__/article-editorial-layout.test.ts`; all must pass. If a server-rendered test cannot prove HTTP status, record that limitation and verify it in the browser/server gate rather than claiming a status result.

## Task 5: Responsive, theme and keyboard reader checks

**Files:** Create `test/e2e/article-editorial.spec.ts`; use `test/fixtures/articles.ts` and the existing local Pages server/test configuration. Only change route CSS/classes if a test demonstrates a defect.

**Interfaces:** `/post/:slug` is the article route. The available test data mechanism must populate the server-side catalogue before navigation; a browser-only `page.route` mock is not sufficient to seed an SSR loader. If no supported local server fixture mechanism exists, document the blocker and implement the test fixture at the existing server adapter boundary without touching production data.

- [ ] Write `article fits a narrow viewport` for widths 320 and 390, using a deterministic fixture with a long title and tags; assert the title and reading controls are visible and `document.documentElement.scrollWidth <= document.documentElement.clientWidth`. At 320px assert no `aside[aria-label="Reading controls"]` has computed `position: fixed`.
- [ ] Write `article remains usable in light, dark and reduced motion`: in each explicit theme, assert title and citation link are visible; with reduced motion enabled, assert article text remains visible. Use existing `test/e2e/theme.spec.ts` setup for theme selection rather than inventing a storage key.
- [ ] Write `reader actions are keyboard reachable`: tab to Save and the citation link, assert visible focus indicator and invoke Save with Enter; verify its pressed state and reload persistence. Assert a missing slug returns HTTP 404 in the Pages local server.
- [ ] Run `npx playwright test --config test/playwright.config.ts --project=e2e test/e2e/article-editorial.spec.ts`; expect all cases to pass. Repeat equivalent checks for the Next server using a separately configured local test runner and the same fixture, including real 404; document the actual command and fixture mechanism. If browser or server fixture support is unavailable, mark the affected checks blocked, not complete.
- [ ] Manually inspect 768, 1024 and 1440px, 200% zoom, screenshots and keyboard order in both themes and builds. Record viewport, build, browser, failures and screenshots in the verification log; do not describe this as comprehensive accessibility certification.

## Task 6: Handoff and gates

**Files:** Modify `docs/editorial-refresh-2026-11-15.md` and `docs/editorial-verification-2026-11-15.md`; no further implementation.

**Interfaces:** Handoff lists completed tasks, remaining broader subsystem plans, route/build coverage, and unresolved issues.

- [ ] Run `npm run tokens:check`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build:pages` with Task 0's blank public variables, and the available focused browser tests. Record exact output status, skips and large-chunk warnings; do not claim the full Next production build or browser review unless actually run.
- [ ] Update the refresh note to distinguish shipped changes from planned work and record all blocked browser checks. Run `git diff --check`; review `git diff` plus `git status --short` including untracked deliverables.
- [ ] Obtain user review before writing or executing the next independent plan for homepage/discovery, tools/studio, or performance. Do not commit without authorization.

## Self-review and remaining scope

The task tests cover the five review-focus cases, current theme behavior, article interactions and SSR contracts. The broader spec's homepage/author, studio/tools, cross-page button migration and full performance audit are intentionally separate plans, not represented as completed by this slice. Existing no-browser and SSR-fixture constraints can block visual gates; they cannot be waived by source tests. This document specifies a plan only; none of these tasks have been executed as part of writing it.
