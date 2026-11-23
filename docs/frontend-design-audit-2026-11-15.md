# Frontend design-system audit

> Historical record: product sales and billing were retired on 2026-11-20. Commerce references below describe the former implementation, not current requirements. See `docs/commerce-retirement.md`.

Date: 2026-11-15
Scope: Next.js (`app/`), the Cloudflare Pages frontend (`cloudflare-pages/src/`), shared `components/`, design tokens, shared styles, and relevant tests. This audit describes the current working tree, including the earlier uncommitted branding, dock, and palette changes.

## Method and limits

This is a codebase-wide **source scan plus focused inspection**, not a claim that every line or screen was manually reviewed. The in-scope directories contain 188 TSX files, 82 TS files, three CSS files and five token JSON files (including non-visual route and support code). Searches covered buttons, colors, typography, motion, and shared styles; focused inspection covered the home, navigation, button primitives, theme plumbing, error states and tests. No browser screenshots, computed-style audit, keyboard walkthrough, or visual inspection across all routes and states was performed. Findings should be confirmed in both running builds before treating them as visual or accessibility results.

## Design direction

ResearchWithMe is an open-access scholarly review and research platform. Its distinctive material is the evidence itself: paper and repository reviews, citations, provenance, author credentials and trust signals. The visual system should make that material legible and navigable rather than imposing a generic product dashboard. Material Web is a reference for robust interaction patterns, not a visual template or dependency.

**Working palette, from the existing semantic tokens:** canvas `#FAF9F6`, surface `#F3F1EC`, ink `#121214`, secondary ink `#5C5C63`, primary blue `#1D4ED8`, and evidence green `#047857`. The dark theme has its own semantic equivalents; preserve meaningful domain colors and validate their actual context. The DaisyUI core palette was aligned to these values in the earlier work on this branch, but it is still separately defined.

**Type:** the existing Aptos / self-hosted Newsreader serif stack for long-form reading and editorial headings, Aptos / self-hosted Inter for interface text, and mono for identifiers and genuinely tabular metadata. `components/primitives/Text.tsx` already limits reading text to 68ch. Prefer sentence case and readable action labels; do not use mono uppercase as a default for ordinary navigation and form labels.

**Layout concept:** an editorial reading column with supporting evidence and actions clearly separated, left aligned. On narrow screens the support material follows the reading content and actions remain reachable from the header or within the relevant content.

```text
Desktop                              Mobile
[brand  navigation       tools]       [brand       search menu]
[title / review summary] [context]   [title / review summary]
[reading column         ] [sources]  [reading column]
[related evidence       ]           [sources / actions]
```

**Critique of the direction:** an archival paper background and serif headings can easily become a generic broadsheet. Keep them because they are already part of the agreed identity, but use evidence, citations and research-specific content—not decorative rules, all-caps labels or repeated animation—as the distinctive feature. Avoid turning every surface into a uniformly rounded card.

## Prioritized findings

### P1 — Shared button systems disagree

- `components/primitives/Button.tsx:6-20,52-57` defines uppercase semibold buttons with a 36px small size. Its secondary variant specifies `border-line` but its base classes do not specify a border width; verify the rendered outline before relying on it.
- `components/ui/button.tsx:6-25` defines a second system with sentence-case medium text, a 44px small size and a different secondary/outline distinction. DaisyUI `.btn` classes form a third approach (`components/BlogHero.tsx:111`, `components/CitationTool.tsx:311-322`, `app/pricing/page.tsx:206`). Hand-styled header actions use pill shapes and some 36px minimum heights (`components/BlogHeader.tsx:216-245,381-388`).
- **Impact:** related actions can differ in shape, size, typography and hierarchy, contrary to the requested filled-primary/unfilled-secondary pattern. A literal `border` utility may also affect layout and focus states, so migrate with tests rather than global search-and-replace.
- **Recommendation:** define a single semantic button contract (primary filled, secondary outlined/unfilled, ghost, destructive, link, icon), preserve link semantics and loading states, then migrate related action groups page by page. Test disabled, hover, focus, loading and narrow widths. Keep genuinely different control types such as filter chips distinct.

### P1 — Pages and Next theme aliases have drifted

- `app/globals.css:128-139` defines `--color-ink-secondary` and `--color-success`; the corresponding aliases are absent from the mirrored `cloudflare-pages/src/globals.css:158-166`. Shared TSX files use `text-ink-secondary` extensively (59 files matched in the scan). Pages' DaisyUI theme also defines `--color-success`, but it is not the same semantic alias mechanism.
- **Impact:** the two builds may emit or resolve utilities differently; missing secondary text styling is a particular risk in Pages. The passing token-consumer check does not establish generated Tailwind utility parity.
- **Recommendation:** compare built CSS and computed styles in both themes/builds, repair missing aliases in shared source, and add a cross-build parity regression test. Reduce duplication between global stylesheets where build-specific imports and font setup allow it.

### P1 — Error screens bypass the theme

- `cloudflare-pages/src/not-found.tsx:6-32` and `cloudflare-pages/src/routes.tsx:79-123` hard-code old green-gray text, purple links, Georgia and inline spacing instead of the current tokens. Their colors do not react to dark mode.
- **Impact:** error states can look unrelated to the rest of the product and may have poor dark-theme contrast; actual contrast must be measured in-browser.
- **Recommendation:** use a shared token-based error layout with a clear recovery action, while preserving the route error boundary's status and behavior. Verify both standalone 404 and router error states.

### P2 — Color source of truth remains duplicated

- `tokens/src/semantic-light.json`, `tokens/src/semantic-dark.json`, and `styles/daisy-themes.css` each contain core palette values. `lib/__tests__/daisy-theme-contrast.test.ts` now checks selected palette mappings, but not every semantic role, state, overlay or component color.
- The Pages error views above and print/editor-specific overrides in both global stylesheets still use literal colors. Print and third-party editor overrides can be intentional; do not replace them blindly.
- **Recommendation:** generate or validate DaisyUI aliases against source tokens without circular CSS variables. Expand checks to relevant foreground/background states, including destructive buttons, hover, disabled, overlays and actual surfaces. Keep domain colors where they convey meaning.

### P2 — Small controls and typography need contextual review

- `components/BlogHero.tsx:98` has a 32px clear-search button, and filter pills at lines 137 and 173 have a 40px minimum height. `components/primitives/Button.tsx:18` and header mobile auth actions use 36px minimum heights. These dimensions are source-level indicators, not proof of a WCAG failure: spacing, control type, and exceptions must be assessed in context.
- `components/primitives/Text.tsx:40-55`, `components/BlogHero.tsx:49-53,78-80` and scholarly cards use uppercase, small, tracked metadata frequently. Some is appropriate for citations and structured labels, but ordinary search instructions and actions should not be treated as decorative metadata.
- **Recommendation:** verify target geometry and spacing on touch screens; bring primary touch controls toward the project's 44px convention where practical. Review type by role and preserve accessible density rather than enlarging every label indiscriminately.

### P2 — Motion requires a cross-state audit

- `components/HomeFeed.tsx:183,216`, `components/ArticleFeed.tsx:135-144,189`, and `components/BlogHero.tsx:49-79` use multiple entrance/stagger effects. `app/globals.css:488-496` provides an OS reduced-motion rule and `components/motion/MotionModeProvider.tsx` supports user motion modes.
- **Impact:** repeated entrances may distract from reading; OS preferences, application-level modes and initial rendering need separate verification. The existence of a media query alone is not a complete interaction audit.
- **Recommendation:** reserve motion for state changes and a small number of meaningful reveals; test full, reduced and static modes in both builds, including keyboard-triggered interactions.

### P2 — Coverage does not yet prove visual parity

- `npm run tokens:check` passes its configured contrast pairs, and focused theme/navigation/primitive tests pass. `npm run impeccable:source` scanned 214 files using regex only and explicitly did not run parsed-page checks such as low contrast or tiny text.
- `test/e2e/mobile-dock.spec.ts` was updated in this working tree to cover the removed dock and header alternatives, but has not been run in a browser during this audit.
- **Recommendation:** run representative browser checks for home, article, search, login, writer/dashboard, settings, pricing, 404 and failure states at mobile and desktop sizes in light/dark and reduced motion. Include keyboard access, touch target geometry, real computed contrast, overflow and button hierarchy. Do not treat token tests as a substitute for rendered checks.

## Strengths to preserve

- Token sources distinguish semantic roles from raw colors, and the existing contrast gate checks configured light/dark pairs.
- Shared `Text` provides a reading measure and named type styles; self-hosted font fallbacks avoid a new remote font dependency.
- Header search, menu semantics, Escape handling and focus restoration have targeted tests. The removed mobile dock still has header search and a reading-list link in the menu.
- A global focus-visible baseline, OS reduced-motion handling, loading states and role-labelled feedback are already present. Preserve and verify them during consolidation.

## Suggested implementation sequence

1. Inventory actual rendered utilities and correct cross-build token/theme parity; add parity tests.
2. Agree a single button API and migrate shared primitives, then related page-level action groups; retain destructive and icon-only semantics.
3. Bring Pages error states into the shared theme; address touch targets and typography by usage, not with blanket replacements.
4. Review home, article/reader, discovery, account/studio and remaining routes in batches across both builds; record reviewed files and explicit exceptions.
5. Verify the visual/accessibility matrix and performance budgets, then document remaining limitations. Avoid generated-file edits, unrelated backend changes, and new component dependencies unless separately approved.

## Checks performed

- `npm run tokens:check` — passed configured validation, contrast and consumer checks.
- `npx vitest run lib/__tests__/daisy-theme-contrast.test.ts lib/__tests__/theme-typography.test.tsx lib/__tests__/header-navigation.test.tsx lib/__tests__/ui-primitives.test.ts` — 22 tests passed.
- `npm run impeccable:source` — completed; regex-only scan, with parsed-page rules explicitly not run.
- No implementation was changed as part of this audit. Previously uncommitted changes were retained.
