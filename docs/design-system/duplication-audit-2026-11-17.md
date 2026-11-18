# Component duplication review — 17 Nov 2026

Surfaces: every public, reading, editor and dashboard route that renders site
chrome (`BlogHeader` + `BlogFooter`), plus the shared navigation, licence,
breadcrumb and author-credential components they contain.

Question: are the same components — menu, hamburger/drawer, licence, header,
footer — implemented or rendered more than once in a way that creates
redundancy?

Method: read `BlogHeader`, `MobileNavDrawer`, `MobileBottomNav`, `BlogFooter`,
`DashboardShell`, `HomeFeed`, `ArticleFeed`, `AuthorProfileCard` and their
consumers; served the production build (`next start`) and inspected the rendered
HTML of 31 routes with jsdom; read the CMS-shaped article fixture as static
HTML; re-read `DESIGN.md` and `docs/design-system/page-layout-matrix.md`. No
headless browser is available in this environment, so this is an HTML/DOM and
jsdom audit rather than a screenshot review.

## What was actually duplicated

| # | Surface | Finding | Severity | Status |
| --- | --- | --- | --- | --- |
| 1 | Home `/` | **The lead story appeared twice.** `HomeFeed` rendered `FeaturedArticle` with the featured post and then passed the unfiltered list to `ArticleFeed`, which included the same post again. | High (same article twice) | Fixed — `feedPosts` excludes the lead while the feature is shown; filtering still shows every match once |
| 2 | Home `/` | **An empty index card sat under a single featured story**: “No articles match…” with no way to act. | Medium (empty state) | Fixed — `ArticleFeed` accepts `leadExcluded` and renders nothing when the feature is the whole catalogue |
| 3 | Article `/post/[slug]` | **The specialist-credential badge appeared twice**: beside the byline and again in the `AuthorProfileCard` at the foot of the article. Two popovers with the same trigger label on one page. | Medium (duplicate control) | Fixed — `showSpecialistBadge` is opt-out; the article passes `false` |
| 4 | Home, feed, category | **CC BY 4.0 was stated in the hero eyebrow, again in the hero facts, again under the article list, and again in the footer.** The hero eyebrow and the list footer were pure repetition. | Medium (duplicated licence) | Fixed — one statement in the hero facts, one in the site footer. About and Privacy keep their additional mentions because they are legal copy, not chrome |
| 5 | Footer | **`/assistant` was linked twice**, once in the Explore sitemap and once in the utility row with an external-link arrow. | Low (duplicate destination) | Fixed — the utility-row copy is gone; Explore remains the single footer link |
| 6 | Compact header (`reading`, `editor`) | **The hamburger was visible on desktop where its drawer is `lg:hidden`.** The trigger class was `isCompact ? '' : 'lg:hidden'`, so reading/editor pages showed a menu button that opened an invisible panel and locked page scroll. | High (dead control) | Fixed — the trigger is always `lg:hidden`, matching the drawer |
| 7 | Tablet 768–1023px | **Account and Contribute were rendered twice**: the header auth cluster started at `md`, while `MobileBottomNav` (which also carries Profile and Contribute) runs until `lg`. Both destination sets were on screen in the tablet band. | Medium (duplicate menu) | Fixed — the header cluster starts at `lg`, the same breakpoint where the bottom bar stops |

## Deliberately kept

- **Drawer navigation and the bottom bar overlap.** Both are visible below
  `lg`, and the drawer repeats Explore, Library and AI. They are different
  affordances — a five-item quick bar and the full navigation — and the drawer
  is an overlay, not a second persistent menu. The drawer also carries account
  and secondary links the bottom bar cannot fit.
- **The footer sitemap repeats header destinations.** That is what a sitemap
  footer is for. It now lists each destination once (guard test below).
- **`/` appears twice in the header and twice in the footer** — brand logo plus
  the “Home”/“Editorial archive” links. Standard brand/sitemap duplication, both
  with distinct accessible names.
- **The home page has one `<header>`; content pages have two** — the site header
  and a page-level `<header>` for the title. These are separate landmarks with
  different content, not two site headers.
- **`/motion` has 14 `<header>` elements.** They are component-demo specimens
  inside the lab page, not site chrome.
- **`ResponsivePaneLayout` mounts the feed filter rail twice** (desktop aside +
  mobile sheet). Only one copy is displayed at a time; the duplication is the
  responsive pattern. Form ids were removed in the previous audit so the hidden
  copy cannot steal focus.
- **`DashboardFooter` in `components/dashboard/overview/primitives.tsx` is a
  `<footer>` nested in `<main>`.** It marks a data-provenance section footer, not
  a second site footer; it contains no navigation.
- **`/library` and `/bookmarks` are not duplicates.** The first holds sources,
  citation collections and goals; the second holds saved articles.
- **About and Privacy state the licence more than once.** Those are explanatory
  legal sections, each with a different job; removing one would weaken the page.
- **Site chrome is composed per page**, not in a route-group layout
  (`BlogHeader`/`BlogFooter` in 34 page files). Reading, editor and contribute
  variants differ enough that a single layout would need the same branching.
  A guard now prevents a file from rendering either component twice.

## Deferred (code duplication without a visual defect)

- **Breadcrumb markup is copy-pasted in nine places** (`claim`, `evidence`,
  `review`, `tool`, `topics`, `author`, `post`, `motion`, `CitationTool`). Each
  page shows exactly one breadcrumb, but separators (`/` vs chevrons),
  typography (mono vs sans) and `aria-current` handling differ by copy. A shared
  `Breadcrumb` primitive with separator/size variants would remove the drift;
  it is not a duplicate on any single screen, so it is queued rather than
  changed in this pass.
- **`MobileBottomNav` hard-codes its five destinations** instead of reading a
  shared navigation model with `primaryNav`. The visible sets differ (tabs vs
  links) and do not render together above `lg`, but `/feed`, `/library` and
  `/assistant` now live in two source lists. A future navigation model should
  own both.

## Rendered-route audit

31 routes returned 200 and were inspected after the fixes:
`/`, `/feed`, `/search`, `/topics`, `/sources`, `/evidence`, `/claims`,
`/reviews`, `/projects`, `/tools`, `/graph`, `/workspaces`, `/research-os`,
`/library`, `/bookmarks`, `/assistant`, `/authors`, `/pricing`, `/about`,
`/contact`, `/privacy`, `/api-docs`, `/cite`, `/settings`, `/login`, `/motion`,
`/contribute`, `/category/research-reviews`, `/contribution/contrib-rl-cold-start`,
`/claim/clm-rl-reasoning-tradeoff`, `/tool/vllm-project-vllm`.

Every one had exactly one site header, at most one
`nav[aria-label="Primary"]`, at most one mobile bottom bar, exactly one
`<footer>`, one `<main>` and one `<h1>`. The footer’s only repeated href was
`/` (brand + archive). Five fixture URLs returned 404/500 in the sandbox because
the live catalogue is unreachable (`fetch failed` to Supabase), not because of
chrome.

## Guards added

- `lib/__tests__/chrome-duplication.test.ts` — footer has no duplicate
  destinations (except the two intentional `/` links), no file renders
  `BlogHeader`/`BlogFooter` twice, and only `BlogHeader` owns
  `MobileNavDrawer`/`MobileBottomNav`.
- `lib/__tests__/home-feed-duplication.test.tsx` — the lead post is in the
  featured slot and absent from the index; filtering still lists it once.
- `lib/__tests__/article-feed-empty.test.tsx` — the stand-alone empty state is
  kept, and `leadExcluded` suppresses an empty index.
- `lib/__tests__/header-navigation.test.tsx` — the compact trigger is
  `lg:hidden` (matching the drawer), and the auth cluster starts at `lg`, not
  `md`.
- `lib/__tests__/next-article-route.test.tsx` — the fixture article renders the
  specialist credential exactly once.
- `lib/__tests__/catalog-motion.test.tsx` — the feed no longer prints the
  licence.

## Verification

- `npx vitest run` — 1143 tests in 179 files pass.
- `npm run quality` — exit 0 (tokens, lint, typecheck, tests, DNS/WebMCP,
  impeccable source scan, both worker dry-runs).
- `npm run build` — exit 0; production server served the routes above.
- Rendered HTML check: no route had two primary navs, two site footers, two
  `<main>` elements or two `<h1>`s; `/assistant` appeared once in the footer;
  the home page stated CC BY 4.0 twice (hero fact + footer), down from four
  times; the compact hamburger carried `lg:hidden`; the auth cluster carried
  `lg:flex`.
