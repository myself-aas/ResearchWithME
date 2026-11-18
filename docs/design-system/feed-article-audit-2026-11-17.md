# Feed & article reader review — 17 Nov 2026

Surfaces: `/feed` (Research Contributions Feed) and `/post/[slug]` (article reader),
plus every component they render. Mode: **Operate** for the feed, **Read** for
the article.

Method: read the pages and their client islands against `DESIGN.md`, the
surface briefs in `.impeccable/surfaces/`, and `docs/design-system/page-layout-matrix.md`;
rendered `/post/[slug]` from a CMS-shaped fixture to static HTML; rendered the
feed in jsdom; re-ran the axe-core component suite. No headless browser is
available in this environment, so the two routes were not screenshotted.

## What the review found

| # | Surface | Finding | Severity | Status |
| --- | --- | --- | --- | --- |
| 1 | Article | **The archive record printed the licence twice**, once as “Licence” and once as “License”. | High (duplicated fact) | Fixed |
| 2 | Article | **The reader's back control pointed at `/articles`**, which redirects to `/`, and `/` sends a signed-in reader to their configured landing page (research-os by default). “Back to Articles” could therefore land on the dashboard, not the article index. | High (wrong destination) | Fixed — the back control now returns to `/feed`, which is where every feed card's article link came from |
| 3 | Feed | **The mobile filter sheet duplicated form ids.** `ResponsivePaneLayout` mounts the left rail twice (hidden desktop copy + sheet copy); both copies carried `id="feed-search"` and `id="feed-topic"`, so the visible label could focus the hidden input and the document was invalid. | High (a11y) | Fixed — implicit `<label>` wrappers, no ids |
| 4 | Feed | **The page scrolled behind the mobile filter sheet.** Touch scrolling inside the sheet also moved the feed underneath it. | High (mobile usability) | Fixed in the shared `BottomSheet`; the previous overflow is restored on close |
| 5 | Feed | **Save-to-library failed silently.** A 401 from `/api/library` (anonymous reader) or a network error left the button unchanged with no explanation, and a thrown fetch produced no UI state at all. | High (state contract) | Fixed — visible recovery text for errors/401, live announcement for both outcomes, `aria-busy` |
| 6 | Article | **A set of standalone controls was below the 44px minimum**: reviewed-artifact link and both contribute links (40px), tag chips (~28px), specialist badge (32px), author profile/full-profile/public-record links (36px), and the dock/aside citation triggers (~20px). | Medium (touch targets) | Fixed — all 44px; `InlineCitationPopover` gained an explicit `control` variant so prose citations stay link-sized |
| 7 | Article | **Wide tables and code blocks could only be scrolled by pointer.** `overflow-x-auto` has no keyboard path when the container is not focusable. | Medium (WCAG 2.1.1) | Fixed — labelled `role="region"` tab stops |
| 8 | Feed | Integrity warnings used `role="alert"` for content that is present in the server HTML, so a screen reader announces every warning assertively on load. | Medium (a11y) | Fixed — `role="note"`; the text and icon are unchanged |
| 9 | Feed | The contribution-type filter buttons were an unlabelled cluster. | Medium (a11y) | Fixed — `role="group"` with an accessible name |
| 10 | Article | An article with no takeaways still rendered an empty “Key takeaways” card; the tag row likewise rendered an empty margin block. | Medium (empty state) | Fixed — both sections are omitted when empty |
| 11 | Feed | The source link in a card was a ~32px row with a text-sized link, below the project's 44px rule. | Low (touch target) | Fixed — the row and link are 44px, with a `title` for the truncated source name |
| 12 | Both | Unbroken long titles/summaries/takeaways could push a 320px column wider (DOI-shaped tokens are common here). | Low (reflow) | Fixed with `break-words`; `min-w-0` added to the article breadcrumb item |
| 13 | Feed | The skip-link target `<main>` was not focusable, unlike the home feed and article reader. | Low (a11y) | Fixed — `tabIndex={-1}` |
| 14 | Feed | Card title links had a 2px focus ring with no offset. | Low (focus) | Fixed — 2px/2px |
| 15 | Feed | The empty feed said **“No matching contributions yet”** even when the network had no contributions at all, implying a filter was hiding results. Found by serving the production build. | Medium (empty-state honesty) | Fixed — an unfiltered empty network says so and offers the first-contribution action; the filter copy only appears when a filter is active |

## Deliberately left alone

- **Article title is sans, while the surface brief says “editorial serif titles.”**
  `DESIGN.md` records the 2026-11-15 editorial refresh, in which Plus Jakarta Sans
  became the editorial face. Changing the article’s h1 to serif would contradict
  the newer design-system summary; the brief is stale, not the page.
- **`/articles` remains a redirect.** It is a legacy URL, and the article no
  longer depends on it for navigation.
- **The static “Editorial figure” caption.** It is descriptive of the layout, not
  a fabricated fact; still, it is a candidate for removal when real captions
  exist in the CMS.
- **`/` (the home catalogue feed).** It is a separate surface with its own
  layout; this review covered the dedicated `/feed` route and the reader.

## Verification

- `npx vitest run` — 1133 tests in 176 files pass.
- New guards: `lib/__tests__/feed-article-audit.test.tsx` (label/id integrity,
  sheet scroll lock + focus, save failure states, filter group, 44px source link)
  and five additions to `lib/__tests__/next-article-route.test.tsx` (back
  destination, single licence row, 44px controls, keyboard-scrollable regions,
  empty-takeaways omission).
- `lib/__tests__/v34-a11y-visual.test.tsx` still reports zero axe WCAG 2.1 AA
  violations for `ResearchFeedClient`, `ResponsivePaneLayout`, `BottomSheet` and
  `SaveToLibraryButton`.
- `npm run impeccable:source` → 0 anti-patterns.
- `/feed` is already in the CI Playwright reflow matrix at 320–1920px; the
  changes add no fixed-width element.
