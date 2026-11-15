# Frontend review — ResearchWithMe

Date: 2026-11-14 · Branch: `arena/7c1641ff-researchwithme`

## Scope and confidence

Repository-wide **source audit**, focused on mobile responsiveness, accessibility, interaction quality, reading, authoring, visual consistency, performance, and frontend test coverage. Inventoried 187 TSX/CSS files across `app/` (53), `components/` (111), and `cloudflare-pages/src/` (23), approximately 22,895 lines. Reviewed route families and shared implementations; this is not a claim that every line has been exhaustively verified.

Read `PRODUCT.md`, `DESIGN.md`, project instructions, the complete generated UI/UX Pro Max skill output, and its professional checklist. Queried the skill for mobile reflow, keyboard focus, and Next.js image loading. The Next.js search results are labeled 16.2, whereas this project is 15.5.28: use only applicable general guidance, not version-specific prescriptions. Preserve the existing reme system rather than introducing a competing palette or framework.

**Not performed:** browser rendering, device emulation, screenshots, live accessibility scans, authenticated journeys, Lighthouse, production build, lint, typecheck, or the full test suite. Dependencies were not installed in this checkout. Layout issues below are source-confirmed missing constraints or source-derived risks, not claimed browser reproductions. No Supabase data or configuration was changed.

### Checks actually run

- `node tokens/scripts/validate.mjs` — PASS; references resolve, no cycles, dark token map complete.
- `node tokens/scripts/check-contrast.mjs` — PASS for all 22 configured semantic pairs. Secondary text on surface: 5.88:1 light, 6.15:1 dark. This does **not** certify composed components, placeholders, opacity variants, or overlays.
- `node scripts/reme-check.mjs --all` — no article drafts to check; not a frontend validation.

## Executive assessment

Keep the scholarly visual direction. The application already has mobile-first grids, constrained reading measure, local fonts, semantic themes, native controls, labeled forms, lazy interactive widgets, and reduced-motion infrastructure. The best return is fixing the shared shell and task flows, not a cosmetic redesign.

Priority meanings: **P1** core task/accessibility/trust risk; **P2** meaningful usability/robustness improvement; **P3** component-library or polish work. Conditional/beta findings are separated from current reader-facing problems.

## Highest-priority findings

### 1. P1 — Skip navigation targets the outer shell, with duplicate IDs

**Evidence:** `app/layout.tsx:92–109` links to and defines `main-content` on a wrapper that includes navigation. Pages also define the same ID on their real main, including `app/post/[slug]/page.tsx:115`, `components/AssistantPanel.tsx:130`, and `components/AboutPage.tsx:20`.

**Impact:** duplicate IDs make fragment resolution ambiguous; the first target is before the header, so “Skip to main content” does not reliably bypass it.

**Recommendation:** one target per document, on the actual main landmark with `tabIndex={-1}`. Remove the wrapper ID and give every page family, including dashboards, the same main contract. Test keyboard activation from a fresh page and client navigation.

### 2. P1 — Fixed article dock has no narrow-screen or safe-area bounds

**Evidence:** `components/reader/ReadingProgressDock.tsx:71–158`: fixed centered dock, `bottom-5`, progress text, citation trigger, and multiple 44px controls in one row; no viewport max-width, wrapping, or safe-area calculation. The article reserves `pb-24`, but it is not tied to actual dock height.

**Impact:** likely crowding/overflow at small widths or enlarged text; controls can obscure reading or focused elements. The risk increases with discussion enabled.

**Recommendation:** bound it to viewport width minus gutters; keep essential actions visible and move secondary actions into More on compact screens. Hide visual progress text before shrinking controls. Include `env(safe-area-inset-bottom)` and reserve matching content clearance. Test 320px, 375px, landscape, 200% text, and keyboard focus near the page bottom.

### 3. P1 — Expanded mobile navigation has no usable-height constraint

**Evidence:** `components/BlogHeader.tsx:129–135,281–400`: the menu expands inside the sticky header and uses `overflow-hidden`; it has primary, secondary, and account links, with no scrollable viewport-height bound.

**Impact:** on short phones/landscape or enlarged text, lower links can extend beyond the viewport while the header stays pinned.

**Recommendation:** give the inner menu `max-height: calc(100dvh - header-height - safe-area)` and `overflow-y:auto`; keep the toggle reachable. Treat it consistently as an inline disclosure (do not unnecessarily add modal focus trapping), or intentionally migrate to an accessible drawer with modal behavior. Verify Escape, focus order, active links, and close-on-navigation for reader/editor states.

### 4. P1 — Production editor can silently keep temporary image URLs

**Evidence:** `components/cms/MarkdownEditor.tsx:88–98`: upload failures are logged and return `URL.createObjectURL(file)` as though insertion succeeded; local mode also returns a blob URL.

**Impact:** a figure may appear during editing but fail after navigation/reload or for other readers. This undermines scholarly content integrity, not just polish.

**Recommendation:** show a recoverable upload error rather than a successful temporary image; block saving/publishing unresolved `blob:` URLs. For local drafts, persist actual image data through an explicit supported path, track upload status, and revoke temporary object URLs when no longer needed.

### 5. P1 — Article title and byline are removed when printing

**Evidence:** `app/globals.css:639–655` hides every `header`. Article title, subtitle, date, and byline are inside an article `header` (`app/post/[slug]/page.tsx:142–202`).

**Impact:** printed/PDF research loses essential attribution and context.

**Recommendation:** scope print hiding to site chrome (explicit classes/data attributes), preserve editorial headers, and hide interactive reading widgets separately. Add print-media tests asserting title, author, date, source identifiers, and bibliography remain visible.

### 6. P1 — Newsletter copy promises delivery that does not exist

**Evidence:** `components/NewsletterSignup.tsx:97–109,185–189` promises a Tuesday dispatch and offers “Subscribe to the digest,” while submission only saves browser preferences (`:48–77`). `PRODUCT.md` explicitly says no email is sent at runtime.

**Impact:** a researcher reasonably expects email delivery. “Stored locally” does not clearly disclose that there is no subscription service.

**Recommendation:** until delivery is implemented, use “Save digest preferences” and explicitly say “No emails are sent; preferences stay on this device.” Alternatively implement the real consent, subscription, confirmation, delivery, and unsubscribe flow. Do not imply a backend subscription from local state.

## Mobile and accessibility improvements

| Priority | Evidence | Improvement |
|---|---|---|
| P2 | `components/primitives/Input.tsx:45–49`, `components/cms/styles.ts:1–2`, `components/search/CommandPalette.tsx:155–162` use `text-sm` inputs | Use 16px entry text on phones (`text-base sm:text-sm`) to reduce iOS focus zoom. Keep user zoom enabled. Check computed styles on actual Safari. |
| P2 | `app/globals.css:632–636`; `components/primitives/Button.tsx:22–25` | Coarse-pointer rule only sets height, excludes anchors, and does not ensure width. Make compact icon actions/standalone links at least 44×44 CSS px where practical, with adequate spacing. Keep 36px visual controls only with sufficiently expanded hit areas. This is a usability target, not a claim that WCAG AA requires 44px everywhere. |
| P2 | `components/cms/MarkdownEditor.tsx:65–79` | Label points at `id`, but the editable element is not assigned that ID here. Connect label, hint, and error to the actual textbox/contenteditable using supported editor props; verify accessible name, invalid state, and focus styling in the rendered editor. |
| P2 | `components/cms/MarkdownEditor.tsx:70,115–150` | Full toolbar plus overflow-hidden frame needs testing at 320px and with keyboard open. Use grouped responsive toolbar/More menu or an explicitly scrollable toolbar; retain keyboard-operable formatting. |
| P2 | `components/search/CommandPalette.tsx:143` | Search panel is fixed at `10vh` with no dynamic viewport height bound. Constrain overall height using `dvh`; let the result list shrink/scroll above the on-screen keyboard. Test search and crop dialogs in landscape. |
| P2 | `components/cms/DashboardShell.tsx:115–142` | Seven studio destinations wrap into multiple mobile rows before the task. Consider a current-section disclosure plus prominent primary action; preserve access to all destinations. Sidebar `lg:top-6` is also above the sticky header's clearance—verify sticky behavior with long content. |
| P2 | `app/globals.css:439–448` | Forced `stone-600 !important` placeholder color overrides semantic theme intent. Replace with a theme-aware placeholder role and test actual dark surfaces; token-pair contrast tests do not cover this composed override. |
| P2 | `components/MarkdownBody.tsx:124–154` | Filename-based alternative text is not an explanation of a scientific figure, and `alt=""` is replaced despite the comment promising otherwise. Preserve intentional decorative alt; require author-supplied descriptions for explanatory figures. |
| P2 | `components/MarkdownBody.tsx:145–154` | Markdown images lack reserved intrinsic dimensions. Store width/height/aspect ratio with figures and use responsive sources where possible to reduce layout shifts and mobile transfer. |
| P2 | `components/VideoEmbed.tsx:36–70` | Videos autoplay; ambient mode loops without controls or reduced-motion policy. Prefer user-initiated explainers with `preload="none"`/`metadata`, a poster, captions/transcript, and an accessible fallback. If ambient mode is used, provide pause and honor reduced motion/data preferences. |

## Authoring, feedback, and state

- **P2 — Recover studio drafts, not only unload warnings.** `components/cms/PostEditor.tsx:185–193` registers `beforeunload` but has no draft persistence in this component. Internal Next links may not trigger that event, and mobile app termination may bypass it. Add debounced recoverable drafts keyed to account/post, version-aware restoration, last-saved status, and dirty-navigation handling. Do not regress the prototype `/write`, which already autosaves locally. Handle storage failure and avoid cross-account leakage.
- **P2 — Reduce writer-path confusion.** `/write` is a separate prototype; `app/write/page.tsx:287` explains publishing is disabled when the studio is configured. Header writer links still use `/write`. Prefer one canonical working studio entry point for approved writers; make any prototype clearly secondary and provide safe draft migration.
- **P2 — Abort slow assistant work.** `components/AssistantPanel.tsx:72–112` has loading/error/retry states but no request cancellation or frontend timeout. Add `AbortController`, a cancel action, timeout recovery, and cleanup. Preserve the question and avoid late answers replacing newer intent.
- **P2 — Avoid unnecessary catalog replacement.** `components/HomeFeed.tsx:58–79` and `components/AssistantPanel.tsx:50–69` fetch the catalog on mount even with server-provided data. Decide a freshness policy; skip duplicate requests when fresh or revalidate with cancellation/cache semantics. Check `app/page.tsx` and route loaders before changing ownership; do not sacrifice crawlable content or CMS freshness.
- **P2 — Preserve discovery context.** Extend URL state to all meaningful filters, including format (`components/HomeFeed.tsx:43–46`), and verify Back restores filters/scroll. Prefer debounced URL updates for typing, immediate updates for discrete filters, and announced result counts without excessive live-region chatter.

## Component-library findings (conditional / lower current exposure)

These components have no direct route consumer found in the `app/` and `components/` import/use scan, beyond their own definitions. Fix before broader adoption rather than treating them as current site-wide failures.

- **P2 — Custom Dialog robustness:** `components/ui/Dialog.tsx:40–80,90–132` uses fixed title/description IDs, no empty-focus-list Tab fallback, no background inertness/scroll lock, no built-in close button, and no scrollable max-height/safe-area bound. Standardize on the existing Radix dialog where possible, or implement all those contracts plus unique `useId` IDs, portal behavior, and focus restoration tests. Search and crop already use Radix; the custom primitive is a separate implementation.
- **P2 — Workspace state loss:** `components/workspace/ResearchWorkspace.tsx:56` unmounts children on collapse, contradicting its preservation comment. Keep panel content mounted with `hidden`/appropriate inertness, relocate focus before hiding, and test unsaved child state. Also add a client boundary if imported directly from a Next Server Component; it currently uses `useState` without `use client`.
- **P2 — Graph overflow and scaling:** `components/graph/ProvenanceGraph.tsx:105–127` has an unwrapped relationship table and a fixed `600×300` viewBox. Node positioning reaches outside that box at 9+ nodes. Use a bounded scroll region/record list and computed graph bounds; retain the text equivalent.
- **P2 — Graph keyboard semantics:** the graph component focuses nodes during render (`:53–56`) and implements `role=tab` without the complete tab/panel navigation contract (`:63–79`). Move focus effects after commit, handle dataset changes/empty states, and use ordinary pressed-state buttons for a view switch or implement full tabs. Test changing nodes while focused.
- **P3 — Table contract mismatch:** `components/ui/DataTable.tsx` advertises mobile record cards but only implements a scrolling table (`:41–80`). Either implement record rendering for suitable data or document the real behavior. Label scroll regions and add keyboard access when needed; keep comparison tables as tables when that better serves researchers.
- **P3 — Toast containment:** `components/ui/Toast.tsx:84` lacks viewport-width/safe-area bounds. Add mobile inline insets and long-token wrapping; keep critical recovery instructions persistent rather than in disappearing notifications.
- **P3 — Input description IDs:** `components/primitives/Input.tsx:25–27,68–70` includes the hint ID in `aria-describedby` even when error state suppresses the hint. Keep the hint rendered or omit its ID while absent.

## Design and frontend architecture

1. **Keep the existing responsive card grids.** Article and author cards use 1/2/3 columns at deliberate breakpoints; this is not a reason to force denser phone layouts. Preserve the 68ch reading measure and metadata hierarchy.
2. **Unify implementation, not just intent.** `app/globals.css` and `cloudflare-pages/src/globals.css` duplicate the same large ruleset. Extract shared theme/base/component CSS while retaining runtime-specific font/source setup. Add parity checks to prevent fixes landing in only one runtime.
3. **Stop globally patching utilities.** `app/globals.css:400–418` overrides tiny text sizes and padding classes. Migrate compact elements to semantic typography/control recipes, then remove patches deliberately; globally changing `px-1.5` can unexpectedly alter every badge/control.
4. **Clarify the source of visual truth.** `DESIGN.md` front matter, its prose, and `PRODUCT.md` describe different action-palette directions. Reconcile them with the normative spec and generated tokens before any redesign. Do not replace the working theme with skill-generated generic SaaS styling.
5. **Keep motion subordinate to reading.** Existing reduced-motion infrastructure is a strength. Review the always-running Lenis RAF in `components/reader/ArticleSmoothScroll.tsx` against native scrolling on low-end phones; benchmark before adding more choreography. Audit direct JS smooth scrolling and literal animation timings against the motion-mode contract.
6. **Keep images responsive in both runtimes.** `cloudflare-pages/src/compat/image.tsx:19–20,35,49` deliberately drops the custom loader and does not generate `srcSet`; `sizes` alone cannot select smaller assets. Generate responsive variants/srcsets or use an approved image transformation path for Pages. Next already has `next/image`/`CoverImage`; do not blindly replace meaningful native-image exceptions.

## Route-family follow-up checklist

| Family | Next verification |
|---|---|
| Home, articles, category | Menu height; URL filters/Back; stable CMS refresh; result announcements; slow image loads |
| Article reader | Dock at 320px and enlarged text; long DOI/repo strings; code/table local scrolling; citations/popovers; print attribution; comments keyboard flow |
| Authors and author archive | Long names/affiliations; 576–768px layouts; missing images; dense statistic labels |
| Assistant | Keyboard-open viewport; cancel/timeout/retry; answer focus; long source titles and URLs |
| Citation tool, bookmarks | Long BibTeX/DOI output; clipboard failure; empty state; device-local persistence wording |
| Login and account | Safari input zoom; password-manager/autofill flow; focused validation; API-key long strings; OAuth failure recovery |
| Dashboard and editing | Mobile nav density; toolbar; durable image upload; draft recovery; dirty internal navigation; destructive-action confirmation |
| Pricing and checkout | Long content and CTA reflow; failed checkout recovery; clarity that reading remains free; mobile external checkout |
| About, contact, privacy, API docs | Keyboard section links; sticky offsets; long code examples; 200% text; dark mode |
| Errors, loading, motion lab | Accessible retry/focus; reserved layout; full/reduced/static mode behavior |

## Verification and implementation sequence

### Phase 1 — Fix shared task blockers

Unique main targets → bounded mobile menu → responsive safe-area dock → print attribution → durable editor image uploads → honest digest copy.

### Phase 2 — Strengthen mobile workflows

16px phone inputs, accessible editor labeling/toolbar, draft recovery, canonical writer destination, dynamic viewport search/dialog sizing, and assistant cancellation. Prefer small PRs with focused regression tests.

### Phase 3 — Consolidate and protect

Shared CSS, corrected beta component contracts, Pages responsive images, filter state restoration, and performance measurements. Defer a broad visual redesign until these are stable.

### Required regression matrix

- Widths: **320, 375, 390, 576, 768, 1024, 1280, 1440px**; short landscape heights as well as portrait.
- Both themes, full/reduced/static motion, keyboard only, coarse pointer, enlarged text/200% text and 400% zoom/reflow scenarios.
- Chromium plus actual Safari/WebKit checks for virtual keyboard, safe areas, autofill, and input zoom.
- Open overlays, long DOI/URLs, many tags, large tables, slow/failed APIs, no storage, failed clipboard, empty data, long author names, and editor draft recovery.
- Add browser axe checks on full rendered documents and open overlays; retain manual keyboard/screen-reader checks. JSDOM axe cannot certify visual contrast or responsive layout.
- Existing `test/e2e/layout-whitespace.spec.ts` already checks selected templates at 320/768/1024/1440/1920px. Expand it rather than replacing it: include articles, pricing, login, dashboard/editor, open menu/search, dark theme, short heights, and keyboard-obscured focus.
- `test/playwright.config.ts` boots **Pages**, not the active Next app. Add a separate Next browser project and run applicable shared contracts against both. Existing `/papers` and `/editions` tests also reflect a different route inventory from the active root App Router; verify parity intentionally.
- `.github/workflows/quality.yml` runs source/unit/build/budget gates but not the Playwright browser suite. Add browser installation/execution, traces on failure, and stable viewport screenshot checks. Do not describe current string/markup snapshots as pixel regression coverage.
- Measure LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 on representative mobile conditions; the current JS shell budget is useful but is not a measurement of those outcomes. Collect privacy-conscious field evidence where available, and use reproducible lab tests otherwise.

**Deliverable scope:** recommendations only. No application source, dependencies, environment, database, or existing design specification was modified.
