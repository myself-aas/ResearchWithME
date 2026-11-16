# Remaining Frontend Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user previously approved inline execution because this environment has no subagent tool; do not claim independent review unless a real independent reviewer is available.

**Goal:** Finish the remaining editorial frontend work without changing factual content, authentication, storage, billing, publishing or routing contracts, and record exactly what was and was not verified.

**Architecture:** Keep Next App Router and Cloudflare Pages/React Router route loaders independent; use shared components where both targets already share them. Treat the plan as four independently reviewable subprojects (reader/discovery; tools; account/studio; cross-cutting verification), delivered in the dependency order below. A failure state is simulated at an existing API/storage boundary; no test-only authentication switch, production mutation or mock data enters a production route.

**Tech Stack:** TypeScript, React 19, Next.js 15, Vite/React Router/Cloudflare Pages, Tailwind/DaisyUI, Vitest/jsdom, Playwright/Chromium, axe-core, existing token pipeline and motion library.

**Spec:** `docs/frontend-refactoring-plan-2026-11-15.md` (requirements and acceptance criteria), `docs/superpowers/plans/2026-11-15-editorial-foundation-and-reader.md` (prior slice), `docs/editorial-verification-2026-11-15.md` (latest actual results), and `docs/impeccable-frontend-audit-2026-11-15.md` (sampled audit and remaining candidates). If an older baseline conflicts with a later verification entry, the later measured result wins. This plan decomposes the broad roadmap into independently shippable subprojects rather than treating every surface as one release.

## Global Constraints

- Work only on current branch `arena/e6ad9348-researchwithme`; preserve the existing open PR and all working-tree changes. Never switch/create/rename another branch.
- **Do not commit, push, open/merge/close a PR, deploy, change integration settings or contact production services without the user's explicit request for that operation.** At an approved checkpoint stage only the task's reviewed files. The user explicitly requested a plan, not execution or a new commit.
- The assistant clipboard batch is present in the workspace and was tested but has not been pushed; confirm with `git status` and compare with the PR head before touching it. Some sandbox restarts reconstruct the working tree from the branch base: inspect `git log`, `git status`, and remote PR head before interpreting a large diff; do not reset or discard edits as a cleanup shortcut.
- Skip Supabase Preview workflow/integration actions. Preserve SSR/auth/data contracts and only use isolated test data; never store secrets or create production accounts/content, publications, purchases or uploads.
- Keep the article direction light, support dark mode, no mobile bottom dock or fixed reader dock; preserve the larger brand. Use the user-supplied editorial direction, not a claim of byte-identical `blog.google`; Material Web is reference only.
- Keep related same-page controls consistent in size, pill shape, typography and spacing, with filled/unfilled variants; preserve deliberate destructive and icon-only exceptions. Keep native form and keyboard semantics.
- Prefer existing dependencies and routes; no new UI dependency or broad rewrite. No invented article metadata, citations, benchmarks, testimonials or product claims. Do not present synthetic measurements as real-user metrics.
- Use TDD for changes: write a behavioral regression, observe the expected failure, implement the smallest fix, rerun focused tests. Where an assertion already passes, record it as coverage and find a separate failing reproduction before changing behavior.
- Never conflate the Pages Node-dispatcher fixture with workerd, `next start` with standalone, an automated axe/Impeccable scan with manual accessibility review, or Chromium emulation with a physical device. Mark blocked checks explicitly.
- Review at 320, 390, 768, 1024 and 1440 CSS pixels, in light/dark and reduced motion where applicable; use 200% browser zoom/manual reflow (or explicitly report an emulation rather than calling it real browser zoom). Preserve content, focus, labels, links and 404 status.

## Review Focus

1. **Sparse or inconsistent article metadata:** no fabricated year, venue, author, DOI or publisher; see Tasks 2 and 6.
2. **A storage/API failure after visible progress:** retain a recoverable draft, reading list, or answer and distinguish persistence/copy failure from request failure; see Tasks 6, 7, 10 and 11.
3. **Unauthenticated, unauthorized, expired and missing records:** correct route/permission/error behavior, no protected data leak, and no live access bypass; see Tasks 8–11.
4. **Long localized/user-provided text, missing assets and 200% zoom:** content remains reachable, scrolls only where intended and never hides essential controls; see Tasks 2–5 and 14.
5. **Race and duplicate actions:** navigation/unmount, delayed response, double submit and failed retry must not overwrite a newer result, publish twice or lose edits; see Tasks 7, 10 and 11.

## File structure and ownership

| Area | Existing implementation / contracts | Tests and records |
| --- | --- | --- |
| Reader | `app/post/[slug]/page.tsx`; `cloudflare-pages/src/routes/post.tsx`; `cloudflare-pages/src/server/loaders/public.ts`; `components/ArticleInteractions.tsx`; `components/reader/ReadingProgressDock.tsx` | `lib/__tests__/next-article-route.test.tsx`, `pages-article-loader.test.ts`, `article-interactions-behavior.test.tsx`; `test/browser/next-article.spec.ts`; `test/pages/editorial-browser.test.ts`; `test/e2e/reader-tools.spec.ts` |
| Discovery / authors | `components/BlogHero.tsx`, `HomeFeed.tsx`, `ArticleFeed.tsx`, `FeaturedArticle.tsx`, `AuthorDirectory.tsx`, `AuthorProfileCard.tsx`; category and author routes under `app/` and `cloudflare-pages/src/routes/` | `lib/__tests__/blog-hero-search.test.tsx`, `discovery-actions.test.tsx`, `author-directory-controls.test.tsx`, `author-profile-actions.test.tsx`; browser suites |
| Tools | `components/CitationTool.tsx`, `lib/citations.ts`, `components/BookmarksPanel.tsx`, `components/AssistantPanel.tsx`, `components/SettingsPage.tsx`, `components/ThemeToggle.tsx` | `lib/__tests__/citations.test.ts`, `assistant-panel-actions.test.tsx`, `theme-typography.test.tsx`; `test/e2e/assistant-actions.spec.ts`, `theme.spec.ts`, `reader-tools.spec.ts` |
| Account / studio | `app/login/page.tsx`, `app/pricing/page.tsx`, `app/dashboard/**/page.tsx`, `app/write/page.tsx`, `components/cms/PostEditor.tsx`, `components/editor/PlateBodyEditor.tsx`, `components/billing/CheckoutButton.tsx`; existing auth/CMS clients | `lib/__tests__/login-error.test.tsx`, `pricing-page.test.tsx`, `billing-checkout.test.ts`, `plate-body-editor.test.tsx`; new isolated component/browser tests named in tasks |
| Error / shared styles | `app/not-found.tsx` and other existing Next error boundaries; `cloudflare-pages/src/not-found.tsx`, `cloudflare-pages/src/routes.tsx`; `app/globals.css`, `cloudflare-pages/src/globals.css`, `styles/daisy-themes.css`, `tokens/src/` | `test/pages/public-routes.test.ts`, `test/e2e/public-axe.spec.ts`, token/theme tests, `docs/editorial-verification-2026-11-15.md` |
| Test fixture boundary | `test/support/pages.ts`: `createTestApp(options?: TestAppOptions): TestApp`, whose `seedPost(post: Partial<CmsPost> & Pick<CmsPost, 'slug' | 'status'>): Promise<CmsPost>` seeds only the local fake; `test/fixtures/editorial-cms-posts.json` seeds Next's local CMS | New fixtures must stay under `test/fixtures/`; no production endpoint, secret or deployment flag is added |

## Standard commands and execution gate

Run from the repository root. Use `npm ci` only if dependencies are absent. Select an installed Chromium via `RWM_CHROMIUM_PATH` if needed; it and its system libraries are environment prerequisites, not project dependencies. Do not assume `/tmp` paths from an earlier sandbox still exist. If the browser cannot start, record the exact failure and mark all dependent checks **blocked**, not passed.

```bash
npm run tokens:check
npm run typecheck
npm run lint
npm test
RWM_BUILD_TARGET=test NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= NEXT_PUBLIC_SUPABASE_ANON_KEY= npm run build:pages
RWM_BROWSER_TESTS=1 npx vitest run test/pages/editorial-browser.test.ts
npx playwright test --project=e2e --config test/playwright.config.ts test/e2e/public-axe.spec.ts
npm run build
npm run budgets
npm run release:gate
```

`test/playwright.config.ts` starts local Wrangler and builds Pages itself; `test/playwright.next.config.ts` requires an already-running isolated local Next server. The full suite normally skips the 15 opt-in dispatcher tests; run them with `RWM_BROWSER_TESTS=1` after a Pages build. `test/pages/env.test.ts` has a post-build conditional case; run it after `build:pages`. Never run `npm run typecheck` concurrently with a Next build that rewrites `.next/types`. Release gate can rewrite `docs/design-system/release-manifest.json`; inspect and preserve/restore only the generated changes from that command after recording results.

## Subproject A — reader and discovery

### Task 1: Reconcile the baseline and finish the pending assistant batch

**Files:** inspect `components/AssistantPanel.tsx`, `lib/__tests__/assistant-panel-actions.test.tsx`, `test/e2e/assistant-actions.spec.ts`, and `docs/editorial-verification-2026-11-15.md`; modify only if an actual regression is found.

**Interfaces:** Assistant POST remains `/api/research-assistant` with `{ query: string }`; clipboard error stays separate from request error.

- [ ] Record `git branch --show-current`, `git status -sb`, `git log -6 --oneline`, `gh pr view 34 --json headRefOid,headRefName,state` and `gh pr checks 34`. If the checkout is reconstructed, fetch the current branch and compare the working-tree content against the fetched head without overwriting any work. Resolve unexpected divergence with the user.
- [ ] Run `npx vitest run lib/__tests__/assistant-panel-actions.test.tsx` and `npx playwright test --project=e2e --config test/playwright.config.ts test/e2e/assistant-actions.spec.ts`. Expected: copy denial keeps the answer, exposes an actionable alert, copy retry succeeds, and exactly one assistant request was sent. If it fails, first reproduce with a focused failing assertion, then fix.
- [ ] Record browser executable, mock boundaries, result and Wrangler `Request.cf` warning if observed. Do not commit/push unless specifically requested.

### Task 2: Reader source fidelity and edge-case rendering

**Files:** modify only as needed `app/post/[slug]/page.tsx`, `cloudflare-pages/src/routes/post.tsx`, `cloudflare-pages/src/server/loaders/public.ts`, `components/ArticleInteractions.tsx`; extend `lib/__tests__/next-article-route.test.tsx`, `lib/__tests__/pages-article-loader.test.ts`, `test/pages/editorial-browser.test.ts` and `test/browser/next-article.spec.ts`.

**Interfaces:** Next `generateMetadata` / route and Pages `loadPost` return existing types; public missing slug remains HTTP 404. No new metadata defaults.

- [ ] Add deterministic fixture cases for published long title/tags; absent cover, profile and artifact; no markdown; empty related articles; one code block with a long unbroken line; and unpublished/missing slug. Assert text/links are real fixture values, missing values do not render invented facts, protected/draft content is absent, and missing slug is 404 in both route paths. Assert code scrolls within its region without horizontal document overflow.
- [ ] Run `npx vitest run lib/__tests__/next-article-route.test.tsx lib/__tests__/pages-article-loader.test.ts lib/__tests__/article-interactions-behavior.test.tsx`; record baseline and an observed failing assertion for any proposed fix.
- [ ] Implement only reproduced failures; keep Page loader/SSR boundaries and article actions intact. Run the same focused tests and, after `build:pages`, `RWM_BROWSER_TESTS=1 npx vitest run test/pages/editorial-browser.test.ts`. Expected: all targeted tests pass with no invented citation/metadata or global overflow.
- [ ] Exercise Save, like, cite, share failure, discussion navigation and inline progress with keyboard against fixtures; verify actions preserve correct article IDs and URL. If an API does not support a fixture, document it as blocked, not mocked success.

### Task 3: Real runtime reader verification

**Files:** `test/e2e/reader-tools.spec.ts`, `test/browser/next-article.spec.ts`, `test/fixtures/editorial-cms-posts.json`, `test/playwright.next.config.ts`; create `test/e2e/seeded-reader.spec.ts` only if an isolated Wrangler fixture seam can be implemented without exposing it to production; update verification notes.

**Interfaces:** Next uses isolated `RWM_DATA_DIR` and blank public Supabase variables; Pages `createTestApp().seedPost` is an in-process fake and is not proof of workerd.

- [ ] Copy `test/fixtures/editorial-cms-posts.json` to `cms-posts.json` inside a fresh temporary directory; start Next with `RWM_DATA_DIR` set to it and blank public Supabase variables. Run `RWM_ARTICLE_FIXTURE=1 npx playwright test --config test/playwright.next.config.ts`; assert existing 404, five width, light/dark and keyboard Save checks pass.
- [ ] Inspect Wrangler local bindings and determine whether a disposable local seed is supported. If yes, add a real-workerd fixture with no production flag/route; test a published article, missing 404, save/reload and keyboard focus at 390px. If no safe seam exists, document why and leave seeded Wrangler as a blocker; do not relabel the Node dispatcher test as workerd.
- [ ] Test Next standalone via the actual `.next/standalone` server after the production build; test deployed Worker only with a separately authorized isolated preview origin. Record HTTP status and evidence separately; never deploy or use production data to satisfy this step.

### Task 4: Home, category and featured discovery

**Files:** `components/BlogHero.tsx`, `HomeFeed.tsx`, `ArticleFeed.tsx`, `FeaturedArticle.tsx`, `app/category/[slug]/page.tsx`, `cloudflare-pages/src/routes/category.tsx`; tests `lib/__tests__/blog-hero-search.test.tsx`, `discovery-actions.test.tsx`, `test/pages/editorial-browser.test.ts`.

**Interfaces:** `ArticleFeed` callbacks and query/filter state remain the existing props; route URLs and server-rendered content remain unchanged.

- [ ] Add tests for a keyboard-entered query with no matches, clearing it, category + format combination, and reset preserving real article links. Assert 44px target minimum for chips and clear controls; assert reduced/static motion does not smooth-scroll.
- [ ] Add SSR/no-JavaScript checks that the initial published fixture's title and href appear in HTML without client hydration on both supported route implementations. Verify missing category behavior before writing any new expectation.
- [ ] Run `npx vitest run lib/__tests__/blog-hero-search.test.tsx lib/__tests__/discovery-actions.test.tsx test/pages/public-routes.test.ts` and the opt-in Pages browser suite. Fix only failed behavior or documented inconsistent peer action geometry; retain actual content and destinations.

### Task 5: Author directory and profile states

**Files:** `components/AuthorDirectory.tsx`, `AuthorProfileCard.tsx`, `app/author/[id]/page.tsx`, `cloudflare-pages/src/routes/author.tsx`; extend `lib/__tests__/author-directory-controls.test.tsx`, `author-profile-actions.test.tsx`, `test/pages/editorial-browser.test.ts`.

**Interfaces:** preserve profile identifiers and existing public route URL; identifier filtering remains as implemented.

- [ ] Seed profiles with long name/bio, missing avatar/ORCID/GitHub, no published posts, and a nonexistent author. Assert empty/search reset state, correct link destinations, no placeholder identifier presented as real, and existing missing-route status. Test share failure without losing content.
- [ ] Run `npx vitest run lib/__tests__/author-directory-controls.test.tsx lib/__tests__/author-profile-actions.test.tsx lib/__tests__/author-directory-component.test.tsx` and the opt-in Pages browser suite. Observe failure before each fix; do not change already-working behavior merely to satisfy a style preference.
- [ ] Check mobile target size, keyboard focus, overflow and dark-mode legibility at 320/390px; capture evidence and label Node-dispatcher versus Wrangler precisely.

## Subproject B — tools and shared controls

### Task 6: Citation provenance and reading-list failure states

**Files:** `components/CitationTool.tsx`, `lib/citations.ts`, `components/BookmarksPanel.tsx`, `lib/stores/preferences-store.ts`; extend `lib/__tests__/citations.test.ts`, add `lib/__tests__/citation-source-provenance.test.tsx`, extend `test/e2e/reader-tools.spec.ts`.

**Interfaces:** `CitationSource` keeps explicit title/author/year/journal/DOI/URL fields; `buildCitation(format: CitationFormat, source: CitationSource): string` must not infer an unverified venue or publisher. Derive a year only from an actually available publication date; absent metadata must remain visibly unspecified or omitted.

- [ ] Write source-provenance tests: a 2024 fixture outputs 2024 rather than hard-coded 2026; missing date does not output 2026; external sources never acquire selected internal article author/URL/venue/publisher; empty title disables copy/download; DOI normalization is preserved. Verify BibTeX/RIS output does not assert an unprovided venue/publisher. Run `npx vitest run lib/__tests__/citations.test.ts lib/__tests__/citation-source-provenance.test.tsx` and observe the relevant existing defaults fail.
- [ ] Trace actual `BlogPost` and publication date fields before mapping. Replace only unsupported defaults with explicit missing values or omitted fields across formats, maintaining existing format/export contracts. Do not invent dates or silently convert a general web article into a journal article.
- [ ] Add reading-list tests for storage denial on removing the last item and clearing, cancel confirmation, and reload after failed persistence; assert alert remains visible and no success is announced. Run `npx vitest run lib/__tests__/citations.test.ts lib/__tests__/citation-source-provenance.test.tsx lib/__tests__/preferences-store.test.ts` and `npx playwright test --project=e2e --config test/playwright.config.ts test/e2e/reader-tools.spec.ts`; use the existing opt-in fixture for realistic saved articles.

### Task 7: Assistant, settings and concurrent interactions

**Files:** `components/AssistantPanel.tsx`, `components/ThemeToggle.tsx`; `lib/__tests__/assistant-panel-actions.test.tsx`, `lib/__tests__/theme-typography.test.tsx`, `test/e2e/assistant-actions.spec.ts`, `test/e2e/theme.spec.ts`.

**Interfaces:** request payload `{ query: string }`, selected scope behavior and theme change event/storage key remain unchanged.

- [ ] Add behavioral tests for assistant 500 → request alert → retry success, empty model response, disabled submit during a pending request, and a new request after a copy error. Assert failure retains user query and no duplicate POST is made while pending. Add an unmount/delayed-response test; do not claim stale-response protection until reproduced.
- [ ] Test two mounted theme selectors with independent native radio groups, synchronized selection, OS system change, denied storage and keyboard arrow keys; verify visible focus in both themes manually.
- [ ] Run `npx vitest run lib/__tests__/assistant-panel-actions.test.tsx lib/__tests__/theme-typography.test.tsx` and `npx playwright test --project=e2e --config test/playwright.config.ts test/e2e/assistant-actions.spec.ts test/e2e/theme.spec.ts`. Record API/clipboard mocks; no external model calls.

### Task 8: Login, pricing and checkout

**Files:** `app/login/page.tsx`, `app/pricing/page.tsx`, `components/billing/CheckoutButton.tsx`, existing auth/billing clients; extend `lib/__tests__/login-error.test.tsx`, `pricing-page.test.tsx`, `billing-checkout.test.ts`; add `test/browser/account-pricing.spec.ts` if local Next fixture supports isolated auth.

**Interfaces:** `BILLING_PRODUCTS` in `lib/billing/catalogue.ts` remains the source of names and prices; Lemon Squeezy controls real charges. Do not add synthetic pricing, secrets or checkout variants to the client.

- [ ] Add tests for invalid login, expired/denied session, signed-out sign-in link, missing checkout configuration, signed-in checkout initiation with mocked boundary, provider error and duplicate activation. Assert no secret/variant ID in client markup, no fake purchase success, correct $19/$5 structured values, and meaningful focus/alert.
- [ ] Run `npx vitest run lib/__tests__/login-error.test.tsx lib/__tests__/pricing-page.test.tsx lib/__tests__/billing-checkout.test.ts` and run any fixture browser test against local Next only. If isolated signed-in fixture cannot be supplied safely, keep browser authentication cases blocked, while running component-level mocks; never weaken auth.

## Subproject C — account, studio and errors

### Task 9: Dashboard authorization and empty/error states

**Files:** `app/dashboard/layout.tsx`, `app/dashboard/access/page.tsx`, `app/dashboard/account/page.tsx`, `app/dashboard/reading/page.tsx`, `app/dashboard/(studio)/layout.tsx`, associated existing CMS components; add `lib/__tests__/dashboard-states.test.tsx` and, only with safe local fixtures, `test/browser/dashboard-states.spec.ts`.

**Interfaces:** preserve existing `getDashboardUser`/session/CMS authorization contracts and existing redirects/statuses; test actual boundary outcomes, not a new bypass.

- [ ] Test signed-out, ordinary reader, authorized writer/editor, expired session, missing record and failed API. Assert no private post or account data is rendered to unauthorized users; empty/error states provide a valid next action and no invented account records. Inspect actual roles and expected redirects before encoding them.
- [ ] Run `npx vitest run lib/__tests__/dashboard-states.test.tsx lib/__tests__/dashboard-metrics.test.ts` and any authorized local fixture browser test. Add no production test-only identity or secrets; document cases impossible without a safely isolated session.

### Task 10: Writer autosave, editor and publish safety

**Files:** `app/write/page.tsx`, `components/cms/PostEditor.tsx`, `components/editor/PlateBodyEditor.tsx`, `lib/cms/client-api.ts` only if a reproduced UI bug requires it; extend `lib/__tests__/plate-body-editor.test.tsx`; add `lib/__tests__/writer-failure-states.test.tsx` and `test/browser/writer-flow.spec.ts` if safe fixture exists.

**Interfaces:** preserve existing `cmsFetch` and draft storage key `rwm_writer_draft`, existing save/publish API and authorization. Fake all mutations in tests; no real publication or upload.

- [ ] Reproduce tests for empty required title/content, a long title and body, autosave write failure, failed image upload, failed publish, repeated click during pending publish, and navigation/unmount during a pending request. Assert draft text remains recoverable, errors name the failed operation, and at most one publish request is issued during one pending action.
- [ ] Run `npx vitest run lib/__tests__/writer-failure-states.test.tsx lib/__tests__/plate-body-editor.test.tsx` to see the specific failure. Fix minimal UI state handling without changing API, auth, autosave interval or content semantics. Rerun tests; verify valid keyboard workflow and editor focus at 320px/200% where supported.
- [ ] If a safe writer-session fixture exists, run the local Next browser spec with mocked CMS/upload routes and verify draft remains after failed save/reload. Otherwise document the real-session/deployed cases as blocked.

### Task 11: Studio editing, conflicts and permissions

**Files:** `app/dashboard/(studio)/edit/[id]/page.tsx`, `components/cms/PostEditor.tsx`, `components/editor/ConflictPanel.tsx`, dashboard comments/manage pages; extend `lib/__tests__/conflict-panel-interaction.test.tsx`; add `lib/__tests__/studio-edit-failures.test.tsx`.

**Interfaces:** existing `CmsPost` and `cmsFetch` contract; preserve conflict versions/rationale and authorization errors.

- [ ] Test missing post, unauthorized response, failed save with edits retained, conflict with both versions preserved, retry success and no duplicate save/publish while pending. Assert stale response after unmount does not make a visible change to a different record.
- [ ] Run `npx vitest run lib/__tests__/studio-edit-failures.test.tsx lib/__tests__/conflict-panel-interaction.test.tsx`; reproduce each change before implementation and retest. Document whether component mocks or real local boundary covered each case.

### Task 12: Error surfaces and control consistency

**Files:** actual existing Next not-found/error/loading files discovered under `app/`, `cloudflare-pages/src/not-found.tsx`, `cloudflare-pages/src/routes.tsx`, `components/primitives/Button.tsx`, `components/ui/button.tsx`, page-specific controls; `test/pages/public-routes.test.ts`, `test/e2e/public-axe.spec.ts`, new `lib/__tests__/error-actions.test.tsx`.

**Interfaces:** preserve error HTTP status and destination URLs; icon-only/destructive controls remain deliberate exceptions. Do not restore `app/post/[slug]/loading.tsx` if it causes a streamed 200 for a missing article.

- [ ] Inventory actual 404/500/loading/permission UI in each build. Test missing page/article 404, recoverable API failure, focusable recovery link and visible alert; assert no 200 for missing post. Add consistency tests for each peer action group that is actually changed: `min-height >= 44px`, same typography/radius/spacing, functioning filled/outline variants.
- [ ] Run `npx vitest run test/pages/public-routes.test.ts lib/__tests__/error-actions.test.tsx` and `npx playwright test --project=e2e --config test/playwright.config.ts test/e2e/public-axe.spec.ts test/e2e/reader-tools.spec.ts`. If rendered issue does not fail a test, add a targeted red regression before changing CSS.

## Subproject D — visual, accessibility, performance and release

### Task 13: Palette, font and detector-candidate review

**Files:** `tokens/src/semantic-light.json`, `tokens/src/semantic-dark.json`, `styles/daisy-themes.css`, both global CSS files, `app/post/[slug]/page.tsx`, `components/motion/MotionLab.tsx`, `DESIGN.md`, `docs/impeccable-frontend-audit-2026-11-15.md`; existing token/theme tests.

**Interfaces:** semantic source JSON drives generated tokens; do not hand-edit `tokens/generated/`. Current approved action colors light `#005BBF`, dark `#ADC7FF`; font Plus Jakarta Sans remains user-approved.

- [ ] Inspect print-only `#161c1a`, MotionLab shadow, 3.5rem article title, and sampled long lines at actual rendered sizes. Classify each as intentional, actual defect or unverified; do not blindly eliminate intentional colors or approved font because of an aesthetic detector warning.
- [ ] For each changed role add a token/contrast or rendered assertion first. Run `npm run tokens:build && npm run tokens:check`, `npx vitest run lib/__tests__/tokens-pipeline.test.ts lib/__tests__/daisy-theme-contrast.test.ts lib/__tests__/theme-typography.test.tsx`, and `npm run impeccable:source`. Inspect generated diffs and record remaining advisories and any scoped exceptions.

### Task 14: Keyboard, responsive, zoom and theme verification

**Files:** extend `test/e2e/public-axe.spec.ts`, `test/browser/next-article.spec.ts`, `test/pages/editorial-browser.test.ts`; create `docs/frontend-manual-review-2026-11-15.md` with route/state/evidence table.

**Interfaces:** use existing route implementations and fixture mechanisms; screenshots are evidence, not substitutes for checking controls. Do not save screenshots containing real user information.

- [ ] Add route geometry tests at 320/390/768/1024/1440px for representative home, article, authors, tools, pricing and safe studio fixture. Assert document `scrollWidth <= clientWidth`, except explicitly contained code/table scrollers; ensure selected controls have >=44px target height or document purposeful exceptions. Confirm both themes and reduced/static motion for relevant states.
- [ ] Run `npx playwright test --project=e2e --config test/playwright.config.ts test/e2e/public-axe.spec.ts test/e2e/theme.spec.ts` plus the Next and opt-in Pages fixture suites. Record route, viewport, engine, real vs mocked fixture, results and skips.
- [ ] Perform an actual keyboard-only pass: focus ring visibility, logical order, menus/dialogs, theme radios, forms, error announcements, and no trap. Perform 200% browser zoom and readable reflow (include long code and form errors), plus physical touch if available. Record actual browser, OS, method, screenshots and any untested states. If real zoom, assistive technology or physical touch is unavailable, mark each **blocked** rather than passing an emulated substitute.

### Task 15: Performance baseline and justified optimization

**Files:** `scripts/check-budgets.mjs`, `cloudflare-pages/vite.config.ts`, `cloudflare-pages/src/entry-client.tsx`, existing route imports and `docs/frontend-performance-review-2026-11-15.md`; modify imports/boundaries only after evidence and targeted tests.

**Interfaces:** preserve server-rendered content, navigation, hydration, auth boundaries and existing budget; no new dependencies or assets without approval.

- [ ] After sequential `npm run build`, run `npm run budgets`; record shell gzip and compare to <=200 KB. Run `npm run build:pages`, record actual built client sizes and gzip, and retain the existing Vite large-chunk warning if present. Capture build environment and commands; never equate bundle size with LCP.
- [ ] In a local representative production-like browser, measure LCP/CLS/INP where supported for home, article and tools at mobile and desktop; record methodology, cold/warm cache, viewport, throttling and sample count. If INP or deployed measurements are unavailable, state that explicitly; no fabricated field data.
- [ ] Identify a specific measured offender before proposing code splitting. For any proposed boundary, add a behavioral/SSR regression first, measure before/after under identical conditions, verify no worsened loading state or disclosure/auth leak, and keep only justified changes. Run the affected browser tests and budget again.

### Task 16: Completion, audit and human handoff

**Files:** `docs/editorial-verification-2026-11-15.md`, `docs/editorial-refresh-2026-11-15.md`, `docs/impeccable-frontend-audit-2026-11-15.md`, manual/performance review documents; existing full test/build configs.

**Interfaces:** no runtime interface change; final evidence is an auditable table listing target, route/state, environment, command, result, date and limitation.

- [ ] Run sequentially `npm run tokens:build`, `npm run tokens:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run impeccable:source`, `npm run reme:check`, `npm run reme:test`, `npm run build`, `npm run budgets`, `npm run release:gate`, `npm run build:pages`, and `npx vitest run test/pages/env.test.ts`. Re-run opt-in fixture and selected Playwright suites after the corresponding build. Record exit codes, skips, warnings and budgets; do not report a skipped check as passed.
- [ ] Re-run Impeccable on `app components cloudflare-pages/src styles`, and sample rendered public pages in both widths; validate each reported candidate in context. Reassess the prior provisional score only if evidence supports it, and separate historical findings from fixed findings. Keep the user-approved font exception; do not disable a whole rule to make a report green.
- [ ] Compare results to the acceptance criteria in the spec. List every blocked/unverified route and reason; request actual independent review and human accessibility/visual sign-off. If no independent reviewer or authorized deployed environment exists, record a release blocker rather than claiming completion.
- [ ] Run `git diff --check` and inspect `git status`, generated artifacts and secrets. If the user explicitly authorizes a commit/push, stage only reviewed task files and push only `arena/e6ad9348-researchwithme`; otherwise leave changes uncommitted. Update PR #34/checks only on explicit request. Supabase Preview remains out of scope.

## Dependency and stop rules

- Task 1 protects in-flight work; Tasks 2–5 can proceed independently after it. Task 6 establishes citation provenance before final reader sign-off. Tasks 7–12 can proceed in small independent batches using existing boundaries; Task 10/11 browser validation requires safe isolated authorization, not a production bypass. Tasks 13–15 follow the surfaces they measure; Task 16 is last.
- Stop a task on an unexpected data/auth/billing behavior, inability to exercise a required state safely, failing baseline unrelated to the task, or any missing source needed to avoid a fabricated claim. Report the blocker with commands and evidence; do not fix unrelated application behavior opportunistically.
- Each task is a reviewable checkpoint. After each green batch, document tests and limitations; get explicit user approval before any commit/push. A partial pass is never an overall WCAG or production-readiness certification.
