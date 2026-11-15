# Purposeful Whitespace and Responsive Page Layouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wide-screen space useful across ResearchWithMe by adding relevant contextual navigation and factual summaries where they improve discovery, while preserving focused single-column reading and task flows.

**Architecture:** Use the existing page-family components and data sources rather than introducing a global dashboard-like layout or generic filler. Add a small shared section-navigation component for long reference pages, add a factual author-work summary rail to author profiles, and tune card-grid breakpoints so three columns are reserved for wide viewports. Preserve existing two-column patterns in reader, assistant, login, and studio surfaces; preserve single-column patterns for forms and concentrated reading.

**Tech Stack:** Next.js App Router, shared React/TypeScript components, Tailwind CSS v4 utilities, existing `motion/react` 14.12.0 where already used, Vitest, Playwright (`test:pages`), and the existing reme v3.1 design tokens; no new motion/video dependencies.

**Spec:** `docs/reme-design-system-v3.1.md` §5 (Responsive Layout), §17 (accessibility), §41 (Test Matrix), plus the user's direction in this conversation: use two columns for primary content plus useful context, use three columns only for equal-weight collections on wide screens, and do not fill whitespace with irrelevant content.

## Global Constraints

- Preferred reading width is `48rem`; preferred line length is **60–72 characters** (`docs/reme-design-system-v3.1.md` §5).
- Use the specified layout breakpoints: `sm: 36rem`, `md: 48rem`, `lg: 64rem`, `xl: 80rem`, `2xl: 96rem`.
- The grid spec is desktop 12 columns with `1.5rem` gutters and `3rem` margins; tablet 8 columns with `1rem` gutters and `2rem` margins; mobile 4 columns with `0.75rem` gutters and `1rem` margins.
- Reflow at **320 CSS px** and remain usable at **200% zoom**. Test responsive layouts at **320, 768, 1024, 1440, and 1920 CSS px**.
- Core workflows must be keyboard-operable. Minimum target size is **24 × 24 CSS px**; prefer **44 × 44 CSS px** for primary touch actions.
- Keep source prose, articles, and legal copy readable; do not widen text merely to consume space.
- Do not add a new dependency, backend endpoint, invented metric, promotional filler, or duplicate navigation item to occupy a rail.
- Keep the shared component behavior aligned between the Next app and the Cloudflare Pages routes that reuse the same components.
- New layout rails and grid reflows are static: do not add `Page transition`, `View transition`, `Scroll reveal`, `Stagger`, smooth-scroll JavaScript, or animated `grid-template-columns`/width/margins. New panels should not delay reading or keyboard navigation.
- Search-result filtering is high-frequency and text-driven. Results must update without enter/exit/layout animation; keep the existing state-indicator pill transitions in `BlogHero.tsx` and `PapersArchive.tsx` unchanged.
- No new motion, anime.js, Framer Motion, Remotion, or HyperFrames dependency. Use the existing `motion/react` only where already present; no new motion feature is needed to use the page canvas.

## Motion Decision Record

The layout pass adds static content structure, not spectacle. This follows the motion audit's frequency and function gate:

| Location | Existing behavior | Decision |
| --- | --- | --- |
| `components/ArticleFeed.tsx:269-282` | Search/filter result cards run `AnimatePresence`, list/card layout animation, and 180ms opacity/translate transitions after each filtered render; the search query changes per keystroke. | Remove result-list enter/exit/layout motion. Frequent text filtering should feel immediate, and `layout` work runs on the main thread. |
| `components/PapersArchive.tsx:265-278` | Search/sort results use the same animated list pattern while the input updates on each keystroke. | Remove result-list enter/exit/layout motion; preserve immediate data scanning and avoid frame work for routine filter changes. |
| `components/BlogHero.tsx:119-124` and `components/PapersArchive.tsx:187-190` | Active filter pills use a 180ms Motion layout indicator inside `MotionConfig reducedMotion="user"`. | Keep. This is state indication for a discrete choice; do not duplicate it on the new rails. |
| `app/globals.css:472-486` | Global main-content settle animation and project reduced-motion override. | Leave outside this layout pass; verify new content remains visible and operable with reduced motion enabled. |

Rejected opportunities: no scroll-reveal for section navigation (it is navigation, not content to dramatize); no card-grid stagger or number ticker (cards and counts are read as information); no route/view transition (no spatial continuity is needed for the new side rails); no Remotion/HyperFrames work (there is no video deliverable in this request). New page layout reflow is CSS layout, not an animated transition.

## Review Focus

1. **320px reflow / 200% zoom:** Rails and controls must stack without horizontal document overflow; verify 320px with the responsive Playwright test in Task 5 and verify actual browser zoom at 200% during Task 5's visual review.
2. **768px tablet widths:** A rail must not remain cramped beside its main content; verify stacking and no clipping in Task 5.
3. **1024px layout threshold:** The documentation and author layouts must use the planned rail only when both columns fit; verify bounding boxes and computed column count in Tasks 4 and 5.
4. **1440px and 1920px widths:** Reading measure must remain at or below the `48rem` content cap even when there is ample remaining canvas; verify the measured content width in Task 5.
5. **Missing or short content:** Empty section arrays and authors with zero works must not show an empty decorative rail or fabricated counts; pin this in Tasks 1 and 3 tests.

---

## File Structure and Page-Family Decisions

The codebase already uses several layouts that should be retained instead of rebuilt:

- **Discovery and collections:** `components/BlogHero.tsx`, `components/ArticleFeed.tsx`, `components/AuthorDirectory.tsx`, `components/PapersArchive.tsx`, and `components/EditionsArchive.tsx`. These have meaningful search, filters, metadata, and/or card grids. Three equal-weight cards should begin at `xl` (80rem), not at tablet widths.
- **Reader detail:** `app/paper/[slug]/page.tsx`, `app/post/[slug]/page.tsx`, and their Cloudflare equivalents already use primary content plus a record/context aside. Preserve this pattern and the `reading-column` measure.
- **Editorial studio:** `components/cms/DashboardShell.tsx` already provides the navigation rail. Keep the existing shell and do not add a second global sidebar to studio pages.
- **Focused workflows:** `/write`, `/cite`, `/dashboard/access`, and editor forms remain focused single-column or task-specific layouts; do not add unrelated panels.
- **Long reference pages:** `components/AboutPage.tsx`, `components/PrivacyPage.tsx`, and `components/ApiDocsReference.tsx` have explicit section/group structure suitable for a navigable table-of-contents rail.
- **Author profiles:** `app/author/[id]/page.tsx` and `cloudflare-pages/src/routes/author.tsx` can add a compact work summary beside the searchable archive, derived only from published article data.
- **Redirect:** `/articles` redirects to `/`; it needs no separate layout.

## Task 1: Add a reusable accessible section-navigation rail

**Files:**
- Create: `components/layout/SectionNavigation.tsx`
- Test: `lib/__tests__/section-navigation.test.tsx`
- Create/update directory notes: `docs/design-system/page-layout-matrix.md`

**Interfaces:**
- Produces `SectionNavigationItem = { id: string; label: string }`.
- Produces `SectionNavigationProps = { items: readonly SectionNavigationItem[]; ariaLabel: string; heading?: string }`.
- Produces default component `SectionNavigation(props): ReactElement | null`; it returns `null` for an empty `items` array, otherwise renders a labelled `<nav>` and ordered in-page links.
- The component adds `data-layout-rail="section-navigation"` for layout verification, not styling logic.
- Consumes no route data and performs no client-side navigation or scroll state. Native anchor behavior is intentional.

- [ ] **Step 1: Write the failing tests**

  In `lib/__tests__/section-navigation.test.tsx`, cover:
  - `renders_labelled_ordered_anchor_links`: render two items and assert the `<nav>` has the supplied accessible name, the visible heading defaults to `On this page`, and anchors appear in input order with exact `href="#section-id"` values and labels.
  - `uses_custom_heading_without_changing_accessible_name`: provide `heading` and `ariaLabel`; assert both render independently.
  - `renders_nothing_when_items_are_empty`: render `items={[]}` and assert there is no `<nav>`.

- [ ] **Step 2: Run the focused tests and verify they fail**

  Run: `npx vitest run lib/__tests__/section-navigation.test.tsx`
  Expected: FAIL because `components/layout/SectionNavigation.tsx` does not yet exist.

- [ ] **Step 3: Implement `SectionNavigation`**

  In `components/layout/SectionNavigation.tsx`, export the two interfaces and default component above. Render a semantic `<nav aria-label={ariaLabel}>`, an `<h2>`, and an ordered list of native links. Use existing semantic tokens (`border-line`, `bg-surface`, `text-ink`, `text-ink-secondary`, `text-brand`) and visible focus styling; do not add `position: sticky` inside the component because its page-specific parent controls placement.

- [ ] **Step 4: Run the focused tests and verify they pass**

  Run: `npx vitest run lib/__tests__/section-navigation.test.tsx`
  Expected: all three named tests PASS.

- [ ] **Step 5: Document the route-to-layout contract**

  Create `docs/design-system/page-layout-matrix.md` with a route-by-route family inventory: `/`, `/category/[slug]`, `/papers`, `/authors`, `/editions`, `/author/[id]`, `/paper/[slug]`, `/post/[slug]`, `/about`, `/privacy`, `/api-docs`, `/contact`, `/editorial-board`, `/assistant`, `/bookmarks`, `/cite`, `/login`, `/write`, `/dashboard`, `/dashboard/access`, `/dashboard/applications`, `/dashboard/comments`, `/dashboard/manage`, and `/dashboard/edit/[id]`. Mark `/articles` as a redirect and `/not-found`, `/error`, and `global-error` as focused states. For each route record the existing or planned one-/two-/three-column pattern and the content that justifies it. State explicitly that a rail is added only when it contains useful navigation or facts.

- [ ] **Step 6: Commit the independently testable component and matrix**

  ```bash
  git add components/layout/SectionNavigation.tsx lib/__tests__/section-navigation.test.tsx docs/design-system/page-layout-matrix.md
  git commit -m "feat: add accessible section navigation rail"
  ```

## Task 2: Use section-navigation rails on long reference pages

**Files:**
- Modify: `components/AboutPage.tsx`
- Modify: `components/PrivacyPage.tsx`
- Modify: `components/ApiDocsReference.tsx`
- Test: `lib/__tests__/content-page-layout.test.tsx`
- Consumes: `SectionNavigation` from Task 1.

**Interfaces:**
- `AboutPage` section links: `mission-heading`, `verification-heading`, `representative-heading`, `governance-heading`.
- `PrivacyPage` section links: `principles-heading`, `local-storage-heading`, `accounts-heading`, `rights-heading`.
- `ApiDocsReference` section links: `{ id: group.id, label: group.name }` for each existing `API_GROUPS` entry.
- Each page retains its current content and section IDs; no user-visible copy or APIs change in this task.

- [ ] **Step 1: Write the failing markup/layout tests**

  In `lib/__tests__/content-page-layout.test.tsx`, use `renderToStaticMarkup` for each component and assert:
  - `about_toc_links_resolve_to_existing_sections`: the navigation landmark named `About page sections` links to all four existing section IDs exactly once.
  - `privacy_toc_links_resolve_to_existing_sections`: the navigation landmark named `Privacy policy sections` links to all four existing section IDs exactly once.
  - `api_reference_toc_uses_api_group_ids`: every `API_GROUPS` ID appears as a TOC anchor and as exactly one destination section ID.
  - `reference_pages_keep_a_single_main_landmark`: each rendered page has one `<main>` and one primary `<h1>`.

- [ ] **Step 2: Run the focused tests and verify they fail**

  Run: `npx vitest run lib/__tests__/content-page-layout.test.tsx`
  Expected: FAIL because the pages do not yet render the planned navigation landmarks.

- [ ] **Step 3: Add the two-column document layout to About and Privacy**

  In `components/AboutPage.tsx` and `components/PrivacyPage.tsx`, widen only the outer `<main>` container from its current reading-width shell to `max-w-7xl`; keep each page header full-width. Below each header, render the `SectionNavigation` first in DOM order, followed by the existing sections inside a wrapper marked `data-layout-content="reading"`. Use a one-column stack below `lg`; at `lg` and wider use `lg:grid-cols-[minmax(0,1fr)_16rem]`, place the navigation in column 2 and the content in column 1, cap the text wrapper at `48rem`, and keep the rail `self-start` with a top offset below the global header. Do not make the entire reading column sticky.

- [ ] **Step 4: Add the API operation-group navigation rail**

  In `components/ApiDocsReference.tsx`, widen the outer `<main>` container to `max-w-7xl`, but leave the introduction and “Using the API” guidance full-width. Place the generated `API_GROUPS` navigation before the operation-group content in DOM order; on desktop, position it in a `16rem` right rail beside the operations. Wrap the operation-group content in `data-layout-content="reading"`, cap it at `48rem`, and keep long code examples horizontally scrollable within their own `<pre>` blocks.

- [ ] **Step 5: Run the focused tests and verify they pass**

  Run: `npx vitest run lib/__tests__/section-navigation.test.tsx lib/__tests__/content-page-layout.test.tsx`
  Expected: all section-link, landmark, heading, and empty-state tests PASS.

- [ ] **Step 6: Run the accessibility test suite**

  Run: `npx vitest run lib/__tests__/a11y.test.ts`
  Expected: no axe-core violations in the existing tested components; modified-page heading and landmark behavior is asserted by `reference_pages_keep_a_single_main_landmark`.

- [ ] **Step 7: Commit the document rails**

  ```bash
  git add components/AboutPage.tsx components/PrivacyPage.tsx components/ApiDocsReference.tsx lib/__tests__/content-page-layout.test.tsx
  git commit -m "feat: add responsive section navigation to reference pages"
  ```

## Task 3: Add a factual author-work summary beside the author archive

**Files:**
- Create: `lib/author-work-summary.ts`
- Create: `components/AuthorWorkSummary.tsx`
- Create: `components/AuthorArchiveLayout.tsx`
- Modify: `app/author/[id]/page.tsx`
- Modify: `cloudflare-pages/src/routes/author.tsx`
- Test: `lib/__tests__/author-work-summary.test.ts`
- Test: `lib/__tests__/author-work-summary-component.test.tsx`
- Test: `lib/__tests__/author-archive-layout.test.tsx`

**Interfaces:**
- `AuthorWorkSummaryData = { totalWorks: number; reviewedArtifactCount: number; byCategory: Array<{ category: string; count: number }>; latestWorks: Array<Pick<BlogPost, 'slug' | 'title' | 'category' | 'publishedAt' | 'dateISO'>> }`.
- `summarizeAuthorWork(articles: readonly BlogPost[]): AuthorWorkSummaryData` derives only from the supplied articles. Categories sort by descending count then ascending category name; latest works sort by `dateISO ?? publishedAt` descending and take at most three; invalid dates sort after valid dates; an empty list returns zero counts and empty arrays.
- `AuthorWorkSummary({ articles }: { articles: readonly BlogPost[] }): ReactElement | null` renders `null` when no works exist; otherwise it renders factual counts, category counts, and links to the latest works.
- `AuthorArchiveLayout({ articles }: { articles: readonly BlogPost[] }): ReactElement` renders the archive full-width when there are no works; otherwise it renders the archive and summary in the responsive grid. It owns `data-layout-grid="author-archive"` for browser verification.
- Both Next and Cloudflare route variants use `AuthorArchiveLayout` and the same `articles` value returned by `getAuthorArchive` / their loader.

- [ ] **Step 1: Write the failing pure-function tests**

  In `lib/__tests__/author-work-summary.test.ts`, add:
  - `summarizes_article_and_reviewed_artifact_counts`: assert `totalWorks` equals input length and `reviewedArtifactCount` counts only posts with `reviewedArtifact`.
  - `sorts_categories_by_count_then_name`: use tied and unequal categories and assert deterministic order.
  - `returns_three_latest_works_in_date_order`: mix `dateISO` and `publishedAt`; assert descending order and the three-item cap.
  - `sorts_invalid_dates_after_valid_dates`: assert invalid timestamps do not displace a valid latest work.
  - `returns_empty_summary_for_no_works`: assert zero counts and empty arrays.

- [ ] **Step 2: Run the focused pure-function tests and verify they fail**

  Run: `npx vitest run lib/__tests__/author-work-summary.test.ts`
  Expected: FAIL because `lib/author-work-summary.ts` does not yet exist.

- [ ] **Step 3: Implement `summarizeAuthorWork`**

  In `lib/author-work-summary.ts`, define the exact types above and compute the summary without I/O, randomness, inferred “impact” scores, or browser APIs. Treat a missing `dateISO` as `publishedAt`; treat an invalid parsed date as timestamp `0` for ordering.

- [ ] **Step 4: Run the pure-function tests and verify they pass**

  Run: `npx vitest run lib/__tests__/author-work-summary.test.ts`
  Expected: all five summary tests PASS.

- [ ] **Step 5: Write the failing author-summary component tests**

  In `lib/__tests__/author-work-summary-component.test.tsx`, render `AuthorWorkSummary` to static markup and assert:
  - `renders_factual_counts_and_category_breakdown`: summary values and category labels are visible.
  - `links_latest_works_to_their_post_routes`: each latest work links to `/post/${slug}` and no unrelated article is linked.
  - `renders_nothing_for_empty_work_list`: an empty article array produces no `<aside>` or empty summary heading.

- [ ] **Step 6: Run the component tests and verify they fail**

  Run: `npx vitest run lib/__tests__/author-work-summary-component.test.tsx`
  Expected: FAIL because `components/AuthorWorkSummary.tsx` does not yet exist.

- [ ] **Step 7: Implement the summary and shared archive layout**

  Implement `components/AuthorWorkSummary.tsx` as a semantic, labelled summary using `summarizeAuthorWork`. Implement `components/AuthorArchiveLayout.tsx` with the interface above: when `articles.length > 0`, render the searchable `AuthorArchive` and summary in a responsive `minmax(0, 1fr)` + `18rem` grid at `lg`, stacked below `lg`; when empty, render only `AuthorArchive` without the two-column wrapper. Do not add the existing `AuthorImpactRadarChart`'s calculated percentages to this summary; the rail must contain only verifiable article-derived counts.

- [ ] **Step 8: Write and run the archive-layout tests**

  In `lib/__tests__/author-archive-layout.test.tsx`, assert `renders_archive_and_summary_tracks_when_articles_exist` (both archive and summary are present, the grid hook is present, and the summary is an `<aside>`) and `renders_archive_full_width_without_empty_track_when_no_articles` (archive empty state remains visible and `data-layout-grid="author-archive"` plus the summary aside are absent).

  Run: `npx vitest run lib/__tests__/author-archive-layout.test.tsx`
  Expected before implementation: FAIL because `components/AuthorArchiveLayout.tsx` does not yet exist; after implementation: both tests PASS.

- [ ] **Step 9: Use the shared layout in both author routes**

  In `app/author/[id]/page.tsx` and `cloudflare-pages/src/routes/author.tsx`, retain the full-width author identity and current impact section, then render `AuthorArchiveLayout articles={articles}`. Do not duplicate layout logic in the two route adapters.

- [ ] **Step 10: Run all author and route tests**

  Run: `npx vitest run lib/__tests__/author-work-summary.test.ts lib/__tests__/author-work-summary-component.test.tsx lib/__tests__/author-archive-layout.test.tsx lib/__tests__/author-directory.test.ts`
  Expected: all summary and author-directory tests PASS; existing profile lookup behavior is unchanged.

- [ ] **Step 11: Commit the author summary rail**

  ```bash
  git add lib/author-work-summary.ts lib/__tests__/author-work-summary.test.ts components/AuthorWorkSummary.tsx lib/__tests__/author-work-summary-component.test.tsx components/AuthorArchiveLayout.tsx lib/__tests__/author-archive-layout.test.tsx app/author/[id]/page.tsx cloudflare-pages/src/routes/author.tsx
  git commit -m "feat: add factual author work summary rail"
  ```

## Task 4: Reserve three-column grids for wide card collections and keep search results immediate

**Files:**
- Modify: `components/ArticleFeed.tsx`
- Modify: `components/AuthorDirectory.tsx`
- Modify: `components/PapersArchive.tsx`
- Test: `test/e2e/layout-whitespace.spec.ts`
- Consumes: page-family decisions from `docs/design-system/page-layout-matrix.md`.

**Interfaces:**
- No component prop or data API changes.
- At `< md` (48rem), equal-weight card collections render one column; at `md` through `< xl` (80rem), they render two columns; at `xl` and wider, they render three columns.
- Search-driven article and paper result lists update instantly; they do not run entry, exit, or layout animations per typed character.
- Preserve existing active-filter pill state indication (`180ms`, `cubic-bezier(0.2, 0, 0, 1)`) in `BlogHero.tsx` and `PapersArchive.tsx`; do not add motion to the new rails or grid reflow.
- Reader, studio, login, assistant, and form layouts retain their existing task-specific column decisions.

- [ ] **Step 1: Write the Playwright layout and motion-gate assertions**

  In `test/e2e/layout-whitespace.spec.ts`, add:
  - `article_and_author_cards_use_three_columns_only_at_xl`: at `/` and `/authors`, assert two computed grid columns at 1024 CSS px and three at 1280 and 1440 CSS px. Add `data-layout-grid="article-cards"`, `data-layout-grid="category-cards"`, and `data-layout-grid="author-cards"` hooks to the respective `<ul>` elements.
  - `filtered_article_and_paper_results_do_not_animate_each_update`: at `/` and `/papers`, first await completion of animations returned by `document.querySelector('main')?.getAnimations()`, change then clear `#catalog-search` / `#paper-search`, and assert `resultList.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running')` is empty after each update. Add `data-layout-grid="paper-results"` to the paper result `<ul>` so the assertion targets only the result list.

- [ ] **Step 2: Run the focused browser tests and verify they fail**

  Run: `npx playwright test --project=e2e --config test/playwright.config.ts test/e2e/layout-whitespace.spec.ts -g "article_and_author_cards_use_three_columns_only_at_xl|filtered_article_and_paper_results_do_not_animate_each_update"`
  Expected: FAIL because the data hooks and `xl` breakpoint are missing, and filtered results currently use Motion entry/exit/layout animations.

- [ ] **Step 3: Tune the article feed grid and remove per-keystroke result motion**

  In `components/ArticleFeed.tsx`, add the category-card and article-card `data-layout-grid` hooks. Set each equal-weight collection to `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`; preserve gaps and card content. Render the filtered result list with native `<ul>` / `<li>` elements. Remove the result list's `AnimatePresence`, `layout`, `initial`, `animate`, `exit`, and `transition` props, plus the `hasMounted` state/effect and Motion imports/wrappers that are now used only for that list. This filter runs per keystroke, so static reflow is the intended behavior.

- [ ] **Step 4: Tune the author directory cards**

  In `components/AuthorDirectory.tsx`, add `data-layout-grid="author-cards"` to the actual author-card list. Use `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`. Do not move search or identifier filters into a sidebar; they currently work as full-width controls.

- [ ] **Step 5: Make paper search results immediate while retaining the active topic indicator**

  In `components/PapersArchive.tsx`, add `data-layout-grid="paper-results"` to the filtered-results `<ul>`. Replace its animated result `<m.ul>` / `<m.li>` wrappers with semantic `<ul>` / `<li>` and remove `AnimatePresence`, result `layout` / `initial` / `animate` / `exit` / `transition` props, and `hasMounted` state usage. Keep `LayoutGroup`, `MotionConfig`, and the existing topic active-pill `m.span`; that state indicator is not the search-result list.

- [ ] **Step 6: Run the focused browser tests and verify they pass**

  Run: `npx playwright test --project=e2e --config test/playwright.config.ts test/e2e/layout-whitespace.spec.ts -g "article_and_author_cards_use_three_columns_only_at_xl|filtered_article_and_paper_results_do_not_animate_each_update"`
  Expected: PASS at 1024, 1280, and 1440 CSS px; both result lists update with no running descendant animations after filters change.

- [ ] **Step 7: Commit the collection and motion changes**

  ```bash
  git add components/ArticleFeed.tsx components/AuthorDirectory.tsx components/PapersArchive.tsx test/e2e/layout-whitespace.spec.ts
  git commit -m "style: make collection layouts responsive and search immediate"
  ```

## Task 5: Verify every public page family at responsive widths

**Files:**
- Modify: `test/e2e/layout-whitespace.spec.ts`
- Modify: `docs/design-system/page-layout-matrix.md`
- Test runtime: existing `test/playwright.config.ts` Pages project (`npm run test:pages`).

**Interfaces:**
- The browser test declares one route fixture per public template supported by the Pages target and a representative subset for all five required viewport widths.
- The fixture checks browser-visible behavior, not internal Tailwind class names: response success, one main landmark, no document-level horizontal overflow, and the placement of new section-navigation rails.

- [ ] **Step 1: Add the public route smoke matrix**

  Add `publicLayoutRoutes` to `test/e2e/layout-whitespace.spec.ts` for the Pages-supported public routes: `/`, `/papers`, `/authors`, `/about`, `/privacy`, `/api-docs`, `/contact`, `/editions`, `/editorial-board`, `/assistant`, `/bookmarks`, and `/cite`. For each route, assert a successful navigation, a visible main landmark, and `document.documentElement.scrollWidth <= window.innerWidth` at 1440 CSS px. Document Next-only/authenticated route families in the page-layout matrix and retain their focused form/studio rules.

- [ ] **Step 2: Add viewport reflow coverage for representative templates**

  Parameterize representative routes `/`, `/about`, `/privacy`, `/api-docs`, `/authors`, `/papers`, and `/assistant` across 320, 768, 1024, 1440, and 1920 CSS px. At each width assert no horizontal overflow and that primary headings and controls remain visible. At 320 and 768, assert the section navigation is before the document body in visual order; at 1024 and wider, assert its bounding box sits beside the body rather than overlaying it. Select the body through `data-layout-content="reading"` and the nav through `data-layout-rail="section-navigation"`. At all widths assert the reading content width is no greater than `48rem`.

- [ ] **Step 3: Test rail behavior with reduced motion enabled**

  Add `section_navigation_remains_visible_and_operable_with_reduced_motion` to `test/e2e/layout-whitespace.spec.ts`. Set `page.emulateMedia({ reducedMotion: 'reduce' })`, visit `/about` and `/privacy`, and assert the section navigation, all in-page links, and the reading content remain visible; keyboard focus can reach and activate a section link; and the rail itself has no running Web Animations. The existing global main-settle animation is outside this task and is already gated by the project reduced-motion stylesheet.

  Run: `npx playwright test --project=e2e --config test/playwright.config.ts test/e2e/layout-whitespace.spec.ts -g section_navigation_remains_visible_and_operable_with_reduced_motion`
  Expected: PASS with reduced motion enabled; no content is hidden or interaction blocked.

- [ ] **Step 4: Run the browser suite and verify it fails only for unmet layout assertions**

  Run: `npm run test:pages -- --grep "layout|article_and_author_cards"`
  Expected before implementation: the new assertions fail for missing layout hooks or inappropriate grid/rail placement, while route response failures are treated as setup/data blockers and fixed before continuing.

- [ ] **Step 5: Fix only the measured layout regressions**

  Use the failed viewport assertions and screenshots to adjust the page-family grid utilities and `page-layout-matrix.md`. Do not add a sidebar to focused forms, duplicate existing reader metadata, expand long-form text beyond `48rem`, or fill a missing-data state with placeholder metrics. Ensure any rail with no meaningful items is omitted.

- [ ] **Step 6: Run the full browser test suite**

  Run: `npm run test:pages`
  Expected: existing route/hydration/404 tests and the new responsive layout tests PASS.

- [ ] **Step 7: Run project quality gates**

  Run: `npm run tokens:check && npm run lint && npm run typecheck && npm test`
  Expected: all token, lint, type, and unit-test gates PASS. If a command cannot run because dependencies are absent, install from the existing lockfile with `npm ci` and rerun; do not introduce dependency changes for this feature.

- [ ] **Step 8: Review all five viewport widths and both themes**

  Capture and inspect the representative routes in light and dark modes at 320, 768, 1024, 1440, and 1920 CSS px. Confirm focused forms remain single-task, reading paragraphs retain measure, rails do not collide with headers, card grids use their declared breakpoints, and 200% zoom reflows without clipping. Update the layout matrix with any intentional exception and rerun `npm run test:pages`.

- [ ] **Step 9: Commit responsive verification and final matrix**

  ```bash
  git add test/e2e/layout-whitespace.spec.ts docs/design-system/page-layout-matrix.md
  git commit -m "test: verify responsive page layout coverage"
  ```

## Self-Review

- **Spec coverage:** Responsive grid and breakpoints are copied from §5; 48rem reading width and 60–72-character measure are enforced; mobile reflow, touch target constraints, and required viewport widths are covered in the component and browser test tasks. Route families and deliberate single-column exceptions are inventoried before implementation.
- **Step scan:** Each task begins with assertions, runs the smallest relevant test, implements the smallest corresponding change, reruns the test, and commits an independently reviewable deliverable.
- **Type consistency:** The section navigation item and props are defined in Task 1 and consumed unchanged by Task 2. `summarizeAuthorWork` and `AuthorWorkSummaryData` are defined in Task 3 and consumed by the component and both route adapters without changing loader signatures.
- **Review Focus coverage:** 320px/200% zoom and 768px stack behavior are tested in Task 5; 1024px rail behavior is tested in Task 5; 1440px/1920px measure is tested in Task 5; empty section navigation is tested in Task 1; no-work summaries are tested in Task 3. High-frequency search motion is removed and tested in Task 4; reduced-motion operability is tested in Task 5.
- **Motion review:** New layout rails and responsive reflow remain static; the one existing result-list motion pattern tied to per-keystroke filtering is removed. Active-filter state pills remain at their current 180ms project curve. No view-transition, scroll-reveal, stagger, Remotion, or HyperFrames work is in scope.
- **Proportion:** The plan adds one reusable navigation component, one focused factual summary, targeted breakpoint adjustments, one high-frequency motion simplification, and route-level verification. Existing site shells and data APIs remain in place.

## Implementation Status

The user selected **Native** execution. Implementation is complete in this session. The section-navigation and author-summary features, responsive card breakpoints, high-frequency result-motion removal, route matrix, and reduced-motion/browser assertions are in place.

Validation completed:

- Focused layout/author/accessibility tests: 32 passed.
- Full Vitest suite: 632 passed, 1 skipped.
- TypeScript, ESLint, token validation/contrast, and `git diff --check`: passed (ESLint retains one unrelated existing warning in `open-next.config.ts`).
- New layout Playwright suite: all 5 tests passed at 320, 768, 1024, 1440, and 1920 CSS px.
- Full Pages browser suite: 17 passed, 1 failed in the existing bookmark-reload test because its expected seeded `post-1` article is absent from the empty bundled corpus in this local runtime. The responsive layout suite itself passes.

The responsive-layout changes are kept separate from pre-existing unrelated working-tree edits. A manual visual audit at 200% browser zoom and across both themes remains a follow-up; the automated tests cover all required viewport widths and reduced-motion navigation behavior.
