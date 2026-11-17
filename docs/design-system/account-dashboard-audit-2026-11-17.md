# Dashboard & account review — 17 Nov 2026

Surface: `/dashboard/account` and the surrounding dashboard chrome (mode: **Operate**).
Method: rendered the routes locally (`next dev`), inspected the DOM per page, and
checked each finding against the design tokens in `app/globals.css` and the
navigation contract in `docs/design-system/page-layout-matrix.md`.

## What the review found

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | **Two full site headers and two footers on `/dashboard/account`.** `DashboardShell` renders `BlogHeader`/`BlogFooter`, and the account page rendered its own pair inside it. Measured: 2 `aria-label="Primary"` navs, 3 `<header>`, 2 `<footer>` in one document. | Critical (duplicate navigation, wasted viewport) | Fixed |
| 2 | **Three competing menus for one destination** — site nav, a vertical dashboard sidebar, and per-page links — with no single "where am I" control. | High | Fixed |
| 3 | **No profile identity.** The account page opened on a text heading; no photo, name, role, or affiliation, and no place to change them. | High | Fixed |
| 4 | **No scrollable section switcher.** Desk / My writing / My reading / Articles / Comments / Applications were only reachable through the sidebar, which on phones wrapped into a tall block. | High | Fixed |
| 5 | **Mobile menu opened downward and covered the full width**, pushing content instead of overlaying it, and used the entire viewport. | High | Fixed |
| 6 | **Writers directory empty** ("No published contributors yet") because it reads only `profiles.published = true`; the editor-in-chief was not listed anywhere on it. | High | Fixed |
| 7 | **Editor page linked to a 404.** The public Editor page points at `/author/myself-aas`; unpublished profile → `notFound()`. | High | Fixed |
| 8 | **Editor workspace had no access gate or identity.** Anyone could type into a draft that could never autosave (`/api/drafts/*` requires an allowlisted editor), and the header showed a raw `State: saved` token. | Medium | Fixed |
| 9 | **Two different authoring surfaces.** `/write` and the dashboard used the Plate MDX editor; `/editor` used plain `<textarea>` blocks with a read-only MDX `<pre>`. | Medium | Fixed |
| 10 | Profile facts (bio, institution, ORCID) have no editor UI; only the photo can be changed. | Medium | Open — needs a profile form |
| 11 | Dashboard KPIs have no social counters (followers, saves received); adding fake numbers would violate the "no invented statistics" rule. | Low | Deliberately not added |

## What changed

**One chrome, one identity, one switcher**

- `components/dashboard/DashboardProfileHeader.tsx` — cover band, circular photo
  (initial fallback), name, role · affiliation · member-since line, bio, and
  Edit profile / New article / Sign out actions.
- `components/dashboard/DashboardTabs.tsx` — sticky, horizontally scrollable,
  snap-scrolling section tabs with a right-edge fade. Readers see
  My reading · Apply to write · Account; writers and editors see
  Desk · My writing · My reading · Articles · Comments · Applications · Account.
- `lib/dashboard/profile.ts` — reads the caller's own `profiles` row (RLS-scoped)
  and degrades to session facts; nothing is invented when the row is absent.
- `DashboardShell` lost the sidebar entirely; the page now flows
  header → profile → tabs → content at `max-w-6xl`.
- `app/dashboard/account/page.tsx` no longer renders `BlogHeader`/`BlogFooter`;
  its sections became compact cards (Plan + Purchases side by side, API keys,
  products, Profile & identity).

**Mobile navigation**

- `components/layout/MobileNavDrawer.tsx` — right-side drawer, `72vw` capped at
  `21rem` (≈ two-thirds on a 390 px phone), full height, dimmed scrim, spring
  entrance, pinned account/sign-out footer, Escape + focus trap retained,
  background scroll locked while open.
- Rendered as a sibling of the sticky header because the header's
  `backdrop-filter` would otherwise become the containing block for `fixed`.

**Writers & editor**

- `/authors` now always shows an "Editorial lead" card
  (Ashif Ahmed Shuvo, Editor-in-Chief) above the directory, so the page is
  meaningful before any contributor profile is published.
- `getPublishedAuthor` / `getAuthorArchive` resolve the known editor slug to a
  truthful minimal profile (zero articles, no invented identifiers), so
  `/author/myself-aas` and the Editor page link work.
- `/editor` and `/editor/[id]` now require editor access: 401 → sign-in with
  `next=/editor`, 403 → the application page. The workspace header shows the
  signed-in editor and human save states ("Saved on this device", "Synced",
  "Offline"…) instead of raw enum values.

**One MDX editor**

- `components/editor/MdxEditor.tsx` wraps the Plate editor (toolbar, image
  upload, MDX badge, hint) and is now used by:
  - writer studio `/write`,
  - dashboard studio `PostEditor`,
  - scholarly workspace `/editor` (the old read-only MDX `<pre>` is now an
    editable MDX surface with **Apply to blocks** / **Revert**).
- `lib/v34/mdx-roundtrip.ts` parses the deterministic MDX dialect back into
  structured blocks (evidence metadata, claim relations, citation locators,
  code languages, tool-review repo/licence, tables, equations, Mermaid).
  Round-trip invariant: `serialize(parse(serialize(doc))) === serialize(doc)`,
  covered by `lib/__tests__/v34-mdx-roundtrip.test.ts`.
- Applying the MDX is explicit, so half-typed source never corrupts autosave;
  the undo shortcut now ignores `contenteditable`, so Plate keeps its own undo.

## Verification

- `npx tsc --noEmit` clean, `npx eslint app components lib` clean.
- `npx vitest run` — 1081 tests passing, including three new guards:
  account page does not re-import site chrome, the drawer is a right-side
  two-thirds panel with a scrim, and the MDX round-trip is lossless.
- Rendered route checks (demo mode): `/dashboard/account` now has exactly one
  primary nav and one footer; `/authors` shows the editorial lead;
  `/author/myself-aas` renders a profile; `/editor` exposes the shared editor.

## Still open

1. A real profile form (bio, institution, ORCID/GitHub links) — currently only
   the photo is editable, from `/dashboard/access`.
2. Social counters on the profile header once the schema has truthful counts
   (saves received, reviews published), never placeholders.
3. Keep `docs/design-system/page-layout-matrix.md` in sync if the tab set
   changes; it is the contract the dashboard tests read.
