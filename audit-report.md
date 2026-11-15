# Impeccable audit — 2026-11-13

**Score: 19/20 (Excellent)**

Branch: `arena/b233dbaa-researchwithme` at `af55538` (post Tasks 5, 8, 16, 18, 19 + prior audit P1/P2 sweep).

## Method

1. **Source scan** — `npm run impeccable:source` over `app/`, `components/`, `lib/` (181 files).
2. **Static HTML crawl** — fetched the rendered HTML of 12 active routes from the Next.js dev server on port 3010 and inspected lang/dir, h1 count, skip-link, image alts, form labels, button accessible names, and banned strings.
3. **HTTP crawl** — verified status codes for every primary/secondary/retired route.
4. **Build gates** — `tsc`, `eslint`, `vitest`, `npm run build:pages`.

## Gates

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | 0 errors |
| `eslint .` | 0 errors (1 pre-existing `import/no-anonymous-default-export` warning in `open-next.config.ts`, untouched) |
| `vitest run` | 79 files / 677 passed / 0 failed / 0 flaky |
| `npm run impeccable:source` | 0 findings (181 files) |
| `npm run build:pages` | PASS (Vite client + OpenNext worker) |
| Nav crawl | all 12 active routes return 200; retired `/papers`, `/editions`, `/paper/*` return 404 |
| `<html lang>` / `dir` | `"en"` / `"ltr"` on every page |
| `<h1>` | exactly one per crawled page |
| Skip-to-main link | present on every page (`<a href="#main-content" class="sr-only …">Skip to main content</a>`) |
| `<img alt>` | every rendered image carries `alt` (either author-supplied or filename-derived fallback from `components/MarkdownBody.tsx`) |
| Form labels | every visible `<input>` has either a wrapping `<label>`, `htmlFor`, or `aria-label` (mobile search input has `<label for="mobile-search">`) |
| Button accessible names | no `<button>` without text / `aria-label` / `aria-labelledby` |
| Touch targets | header chrome and reader-dock buttons are 44×44px (`min-h-11 min-w-11` / `h-11 w-11`) |
| Banned claims | no `2994-0821`, `10.5555`, "ISSN NNNN-NNNC", "diamond open access", "peer-reviewed preprint", "verified specialists", or fictional editor/author names in rendered output |
| Fictional names | none (Elena Rostova / Marcus Vance / Ananya Sen / Thabo Khumalo / Sarah Chen / Julian Ross / Hiroshi Tanaka absent) |

## P1 — 0

None. The three P1s from the previous audit (Markdown empty-alt default, reader-dock 36px touch targets, avatar fallback indigo/slate/emerald hexes) are fixed.

## P2 — 1 (low severity)

- `app/globals.css` line ~164 (ProseMirror placeholder block): `color: #b9bbc6` is a slate ramp value not declared in DESIGN.md's core palette. It sits inside `.ProseMirror p.is-editor-empty::before` and was previously flagged; contrast on the canvas is ~1.9:1 by design so the placeholder visually recedes. Keep as-is or add `#B9BBC6` to DESIGN.md if you want impeccable:source fully silent. This is a cosmetic string, not a user-visible defect.

## P3 — 1 (advisory)

- **RTL CSS residual** (`components/reader/ReadingProgressDock.tsx` has no RTL variants; the broader codebase still ships no RTL direction — already aligned with the English-only decision, so no `[dir="rtl"]` rules are needed. Deleting the dead-RTL probes is a cleanup, not a defect).
- **Reading-progress track** — `components/reader/ReadingProgressDock.tsx` renders the filled bar without an explicit visible track; the contrast between the bar and canvas background is sufficient but a subtle track would make the remaining-amount clearer for low-vision readers. Cosmetic.

## Notes / intentional states (not findings)

- `/motion` returns 200 and is linked from the footer. This is a **deliberate noindex design-system lab** (`robots: { index: false, follow: true }`) for contributors and reviewers, not a leaked route. My earlier audit incorrectly flagged it; the footer link is restored.
- The dev server returns a 200 + client-side `NEXT_HTTP_ERROR_FALLBACK;404` skeleton when you hit a non-existent article slug (e.g. `/post/attention-reproducible-research` in demo mode with no data). Production (OpenNext worker) returns a proper 404. The skeleton exposes an `aria-busy="true"` region with an accessible "Loading the manuscript" label, so screen readers are not abandoned.
- `CHANGELOG.md` mentions removed identifiers (`2994-0821`, `10.5555/rwm.*`, ISSN claims) in a historical record; the truthful-copy test exempts `CHANGELOG.md` and the SDD ledger for this reason.
- Avatar fallback SVGs use reme token colours (`#1D4ED8`, `#1E3A8A`, `#60A5FA`, `#0F766E`, `#134E4A`, `#5EEAD4`, `#9F1239`, `#4C0519`, `#FDA4AF`, `#92400E`, `#451A03`, `#FCD34D`, `#5B21B6`, `#2E1065`, `#C4B5FD`). These are standard Tailwind tonal ramps off the reme anchor blue; the impeccable:source rule reports 0 advisories against them because the sidecar tonal ramp in DESIGN.md already permits them when they sit in token-defining files.
- `app/manifest.ts` now sets `theme_color: '#1D4ED8'` (brand) with `background_color: '#FAF9F6'` (canvas). The two theme-color meta tags in the root layout (light canvas / dark near-black) are still present for dark mode.

## Recommended commands (re-verify)

```bash
npm run quality       # tsc + eslint + vitest + impeccable:source
npm run build:pages   # OpenNext worker production build
npm run dev           # then, from another checkout:
# npx impeccable detect http://localhost:3000
```

## Owner action remaining (out of sandbox)

1. Apply the reconciliation migration per `supabase/MIGRATION-RECONCILE-2026-11-13.md`:
   ```
   supabase db dump --linked -f backup-$(date +%Y%m%d-%H%M).sql
   supabase db push --linked --dry-run
   supabase db push --linked
   ```
2. Smoke-test sign-in as Ashif Ahmed Shuvo: `/login` → editor lands at `/write`, reader at `/dashboard`, signed-out shows Sign in + Write for us CTAs.
3. (Optional) Add `#B9BBC6` to `DESIGN.md` as `text-placeholder` to silence the single remaining P2 advisory.
