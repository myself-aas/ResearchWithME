# Header & Footer Audit — 2026-11-09

Scope: every route and shared component in the frontend design system, reviewed
against the landing page (`/` via `components/HomeFeed.tsx`), which defines the
standard chrome. Method: file-by-file census of `<header` / `<footer`
usage plus a render-level check of each route group.

## The standard (landing page)

- **Header** — `components/BlogHeader.tsx`: sticky solid white masthead closed by
  a 4px double stone-900 rule; `BrandLogo` serif wordmark; uppercase sans primary
  nav (Articles, Papers, Authors, Editions, Assistant) with an amber underline and
  `aria-current` on the active route; reading-list link with on-device count;
  account control and amber Write/Sign-in action; mobile disclosure menu
  (Escape closes, focus returns to the trigger); paired with the skip link and
  `#main-content` wrapper in `app/layout.tsx`.
- **Footer** — `components/BlogFooter.tsx`: stone-900 surface with the newsletter
  signup, identity block (ISSN 2994-0821, DOI prefix 10.5555/rwm, CC BY 4.0,
  community-funded), the six Domains, the platform links, and the
  copyright/licence row.

## Route-by-route census

> Note (same day): `/submit` was subsequently removed entirely along with the
> manuscript intake (see README and `docs/email-scenarios.md`).

| Route | Chrome before audit | Verdict |
| --- | --- | --- |
| `/` | BlogHeader + BlogFooter (HomeFeed) | conformant |
| `/category/[slug]` | Same (HomeFeed) | conformant |
| `/post/[slug]` | BlogHeader + BlogFooter | conformant |
| `/paper/[slug]` | BlogHeader + BlogFooter (+ in-article `<footer>` for references, correct semantics) | conformant |
| `/papers` | BlogHeader + BlogFooter | conformant |
| `/authors` | BlogHeader + BlogFooter | conformant |
| `/author/[id]` | BlogHeader + BlogFooter | conformant |
| `/editions` | BlogHeader + BlogFooter | conformant |
| `/editorial-board` | BlogHeader + BlogFooter | conformant |
| `/assistant` | BlogHeader + BlogFooter | conformant |
| `/cite` | BlogHeader + BlogFooter | conformant |
| `/bookmarks` | BlogHeader + BlogFooter | conformant |
| `/write` | BlogHeader + BlogFooter | conformant |
| `/not-found` | BlogHeader + BlogFooter | conformant |
| `/error` | BlogHeader + BlogFooter | conformant |
| `/login` | **Bespoke header** (logo "R" tile, "Back to the journal") and **bespoke footer** (one line, two links) | **drift — fixed** |
| `/dashboard` (New article) | **Bespoke DashboardShell header** (non-sticky, 1px stone-200 rule, "R" tile, "Editorial studio" divider, "View journal" link, sign-out) and **no footer at all** | **drift — fixed** |
| `/dashboard/manage` | Same DashboardShell | **drift — fixed** |
| `/dashboard/comments` | Same DashboardShell | **drift — fixed** |
| `/dashboard/edit/[id]` | Same DashboardShell | **drift — fixed** |
| `/dashboard/applications` | Same DashboardShell | **drift — fixed** |
| `/dashboard/access` | Same DashboardShell | **drift — fixed** |
| `/global-error` | No header, no footer | intentional (see below) |
| Metadata-only `layout.tsx` files (all routes) | No chrome; they export `metadata`/`dynamic` only | conformant |
| Route handlers (`app/api/*`, `/auth/callback`) | No UI | n/a |

## Findings

1. **Studio chrome diverged (all `/dashboard**`)** — `components/cms/DashboardShell.tsx`
   rendered its own masthead: non-sticky, 1px hairline, no primary navigation, no
   reading-list count, no Write CTA, and **no footer whatsoever** — no newsletter
   signup, no ISSN/licence/funding record, no portals, no copyright row. Studio
   pages dead-ended visually.
2. **Sign-in chrome diverged** — `app/login/page.tsx` rendered a stripped header
   and a two-line footer, so a signed-out user crossing from any platform page met
   a different frame around the same product.
3. **Duplicated logo markup** — the "R" tile wordmark appeared verbatim in both
   `DashboardShell.tsx` and `login/page.tsx`, inviting drift; the shared
   `BrandLogo` (used by the shared masthead) is the single source.
4. **Footer landmark missing on studio routes** — nothing inside DashboardShell
   provided a `<footer>`, so studio pages lacked the site footer landmark.
5. **`/global-error` renders no chrome by design** — it replaces the root layout
   when the application shell itself fails, so it must not depend on the
   components that may be failing. It stays intentionally chrome-free. The
   in-shell `app/error.tsx` (shell intact, one route failed) does keep
   BlogHeader/BlogFooter.

## Fixes applied

- `components/cms/DashboardShell.tsx` — deleted the bespoke header; the studio now
  renders the shared `BlogHeader`, keeps the studio sidebar nav (page-level
  content, not site chrome) with a quiet "Editorial studio" section label, keeps
  the demo-mode notice, relocates the account block (user name/email + Sign out,
  or nothing in demo mode where the banner explains it) into the sidebar, and adds
  the shared `BlogFooter`. The duplicated "R" tile wordmark markup is gone.
- `app/login/page.tsx` — replaced the bespoke header/footer with `BlogHeader` and
  `BlogFooter`. The masthead already carries the platform link and sign-in state,
  so no affordance was lost.
- `DESIGN.md` — the Navigation component entry now states that every route uses
  the shared masthead and footer; the global-error boundary is the one documented
  exception.
- `.impeccable/surfaces/` — login and the four dashboard briefs gained the shared
  platform chrome as an explicit constraint.

## Post-fix guarantees

- Every route except `/global-error` renders byte-identical `BlogHeader` and
  `BlogFooter` instances.
- The studio still has its writing/moderation navigation and its sign-out, now in
  the sidebar instead of a bespoke header.
- 44px targets, focus rings, and landmarks are unchanged from the platform pages.

## Verification

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run impeccable:source`
  all pass (see PR/CI).
- Visual pass on `/login` and `/dashboard` at desktop and 390px before merge.

## Out of scope (noted, unchanged)

- `emails/` (email templates) and `videos/` (generated media) are not web-app
  surfaces and carry no site chrome.
- `app/paper/[slug]` contains an in-article `<footer>` (reference list end-matter)
  — correct document semantics, not site chrome.
- Page-level `<header>` elements (e.g. the bordered title row on `/papers`,
  `/cite`) are article/section headings, not site chrome; they remain.

## Addendum — 2026-11-09 (later same day): journal → platform reword

The whole site was reworded from "journal" to "platform" framing (the product is a
platform where writers explain research, not a publishing venue). Chrome-relevant
changes: the footer nav heading is now "Explore the platform" (was "Publication
portals") with `aria-labelledby="footer-explore"`, the footer tagline now describes
a research platform, and the breadcrumb/home label is "Platform". Identifiers kept:
ISSN/DOI/licence lines, "ResearchWithMe Publication Collective", and the shared
`BlogHeader`/`BlogFooter` names. Living docs (README, PRODUCT.md, DESIGN.md,
CLAUDE.md, `.github/*`, `.impeccable/surfaces/*`, `docs/*`) were updated to match.
