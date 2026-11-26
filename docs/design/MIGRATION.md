> Historical v4 baseline. Superseded for current status by [AUDIT-v4.1.md](AUDIT-v4.1.md). Measurements below describe the previous integration.

# Reme v4 adoption and measured gate status

**2026-11-26 · incremental Next.js/Tailwind 4 adaptation.**

## Approved scope

The author selected **keep the existing stack; adapt v4**, and explicitly approved
using the example heading caps (24/32/34ch) rather than applying I4's 45–75ch
reading measure to headings. Nothing else changes a threshold. The original
[master build prompt](reme-v4-source.md) is retained unchanged for comparison.

The work modernizes the design system and landing page, not the entire product.
It does not claim Astro output, zero framework runtime, completed localization,
a new local generative model, a dispatch endpoint, or all 19 gates passing.

## Implemented

- Nine typed, deeply frozen manifest modules under `src/design/`, with Zod
  shape validation and path-specific failures. Catalog parity, row-span sums,
  slot/primitive/token references, capabilities, status completeness, type
  bounds, contrast floors, and minimum primitive targets are validated.
- A pure generator (`scripts/design/system.ts`) and a separate filesystem CLI.
  Twelve committed outputs: CSS, palette, media/font/slot maps, geometry/type/
  section/contrast/primitive/font fixtures, and token/composition documentation.
- Determinism verification compares two renders, temporary files, and committed
  bytes; unexpected files in `src/generated` fail verification. Quality,
  prebuild, and CI run the guard. CI also runs the production browser suite. Builds do not silently regenerate stale v4
  artifacts to make their verification pass.
- Real landing composition: hero, recent writing, three topic cards, the existing
  registered comparison figure, evidence/artifact information, archive assistant
  entry, author/provenance, native FAQ, contact links. Its order and named slots
  come from the manifest and are checked against rendered SSR markup/live DOM.
- Exact generated grid widths, corrected 216px lg span 3, and slot-aware heading
  coefficients (md h1 44px; lg h1 41px). No viewport `vw` heading scaling in the
  migrated components.
- V4 color roles project into the legacy semantic pipeline, so existing
  Tailwind consumers and OG rasterizers use the same base palette. Legacy
  figures/domain/code colors and their internals are retained.
- V4 focus/contrast/forced-colors/print rules, explicit status icon+label,
  opt-in generated opacity/transform transitions, 44px primitive/header targets,
  and a native no-JS navigation fallback. Global smooth scroll is opt-in now.
- Same-origin, AI-generated editorial paper-and-pencil artwork for essays with
  no supplied cover: AVIF **29,304 bytes**, WebP **20,086 bytes**, 1200×675.
  Alt text explicitly calls it illustrative; it is not the author's desk or
  evidence from a paper. No text is overlaid on it.
- Two critical roman fonts reduced from **204,920** to **58,308 bytes** combined,
  both preloaded. Existing italic font remains for article content, not the
  landing initial-font total.
- CSP hardened with `object-src 'none'`, `base-uri 'none'`; referrer policy is
  `no-referrer`, and permission denial also covers payment and USB. Next's
  inline scripts/styles and existing iframe policy are not misrepresented as
  the stricter Astro CSP.

## Generated/authored boundary

`design:lint` currently scans:

1. `app/page.tsx`
2. `components/post/HomeHero.tsx`
3. `components/design/Primitives.tsx`

It rejects color/length/duration literals, arbitrary/raw utility classes and
inline style attributes in those files, and rejects color literals outside the
color manifest within `src/design/`. A PostCSS AST walk checks generated motion
containment and allowed transition properties. Tests include deliberate invalid
source/manifest fixtures so these checks must demonstrate failure, not just pass
current files.

It does **not** certify every component in `app/`, `components/`, or `lib/`.
Shared header/footer internals, drawer/theme controls, the unchanged registered
figure, inner routes, and old templates remain under the existing contracts.
The old semantic source maps retain legacy domain colors; v4-controlled base
roles reference `{v4.<mode>.<role>}` rather than independently authored literals.

No `content-visibility`/intrinsic heights were added: the required measured heights
must exist before that optimization can be enabled. No fallback metrics were
invented for the fonts. No translated routes or hreflang were fabricated.

## All 19 source gates

“Partial” means the original gate does **not** pass in full. Browser statements
below refer to Chromium against the production build, not physical devices.

| # | Gate | Measurement / threshold | Status |
| --- | --- | --- | --- |
| 1 | Payload | Critical roman fonts **58,308 / 80,000 bytes**; new artwork **29,304 AVIF / 20,086 WebP / 100,000 bytes each**. HTML-declared modern scripts total **140,480 gzip bytes / 50,000-byte v4 limit** (file-based estimate, not request-timing attribution). Figure lab's existing check reports **21KB / v4 15KB lazy limit**. | **Not full v4 compliant**; original runtime/lab budgets are not relaxed |
| 2 | Lighthouse | Mobile 4G median of five: performance ≥95; other categories 100 | **Not measured** |
| 3 | CLS | <0.05 including font swap and offscreen rendering | **Not measured**; stable frame geometry alone is not a CLS certificate |
| 4 | Grid geometry | Generated vs rendered slot widths at seven widths (320/390/600/768/1024/1280/1536), both themes; tolerance **±0.5px** | Browser test implemented; see final run result below |
| 5 | Overflow | **0px** at the seven tested widths in both themes; original requires every width 320–1920 and 400% zoom | **Partial**; exhaustive widths and zoom not certified |
| 6 | Contrast | **100 declared pair/background/theme/preference measurements**, each ≥7:1 text or ≥3:1 UI; lowest text pair **7.1009:1 / 7:1**. Axe checks rendered page A/AA, not all v4 7:1 compositions. | **Partial**; manifest pass, exhaustive rendered-state v4 contrast remains |
| 7 | Privacy | Landing-only check: **0 cross-origin requests, 0 cookies, 0 page errors**. Search/assistant/form-wide audit and `crossOriginIsolated === true` not provided | **Partial**; no isolation/model claim; existing assistant sync configuration unchanged |
| 8 | Visual regression | Light/dark screenshots inspected at phone/desktop; full 7 widths × modes × en/bn baseline comparison not established | **Partial** |
| 9 | Empty states | Honest empty hero covered by SSR tests; catalog/translation keys validated. Full isolated S2/S3/S5 empty browser fixtures not yet provided | **Partial** |
| 10 | Determinism | **12/12** outputs byte-identical to two fresh renders and temp files | **Pass** |
| 11 | Token escape lint | **0** findings in the **3 migrated authored source files**; full source tree not migrated | **Partial**; boundary is explicit |
| 12 | Manifest coverage | Every declared landing section/slot renders once, no undeclared `data-slot`; SSR and browser tests | Pass for the **declared landing scope**; S0/S10 shared internals not in manifest |
| 13 | Heading wrap | h1 **2 lines / ≤4** at all seven tested widths and both themes; h2 **≤2 lines / ≤3**; type target error **<0.01px / ±0.5px**. Bangla not rendered as a translated route | **Partial**; English pass |
| 14 | Primitive conformance | New landing link/control/summary targets ≥44×44; full-page axe A/AA scan. All existing figure/drawer states still need exhaustive probes | **Partial** |
| 15 | Glyph coverage | Both roman subsets: ASCII; Inter also includes all requested UI symbols (`→ × + − ·`). Newsreader's absent arrow resolves through bundled Inter fallback. Bangla is system-rendered | **Partial**; Bangla OS/device coverage not certified |
| 16 | Motion containment | **0** generated transition/animation/scroll declarations outside no-preference; only allowed generated properties. Shared legacy transitions not covered | **Pass for generated layer only** |
| 17 | Devices | iOS/Android/Firefox/Safari/foldable/landscape and Bangla device matrix | **Not performed** |
| 18 | Assistive tech | Physical keyboard/screen-reader assessment | **Not performed**; axe is not a substitute |
| 19 | No JS | Landing FAQ toggles, plain navigation, assistant link, and SSR comparison snapshot have browser tests; every-route/form tests not supplied | **Partial** |

## Repeatable checks

```bash
npm ci
npm run quality
npm run verify
# This intentionally exits 1 while the original v4 JS budget remains exceeded:
npm run design:payload
# In a separate terminal:
HOSTNAME=0.0.0.0 PORT=3000 npm run serve
# Install a local browser once, then test the running production build:
npx playwright install chromium
npm run design:browser
```

Browser configuration supports `DESIGN_BASE_URL` and
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` for environments with an existing browser.
This sandbox uses a temporary npm-distributed Chromium plus its shared libraries;
that browser binary is not committed or added as an application dependency.
Playwright traces/screenshots stay in ignored `test-results/`.

## Font pipeline and provenance

The WOFF2 subsets were rebuilt from licensed Google Fonts TTF sources via the
GitHub blob API (no runtime Google Fonts request):

- `google/fonts`, `ofl/newsreader/Newsreader[opsz,wght].ttf`, blob
  `ad4a9a8c44ec328c80b61c773f1ba02f6b5ed292`.
- `google/fonts`, `ofl/inter/Inter[opsz,wght].ttf`, blob
  `047c92f6e2212473dc436020afed689527076d44`.

OFL licenses remain in `public/fonts/`. Weight range 400–600, optical size pinned
at 16, required Latin/UI ranges, standard kerning/ligatures/contextual/localized
forms, no hinting. Newsreader is **33,908 bytes**; Inter **24,400 bytes**.
Inter supplies UI arrow coverage absent even from the upstream Newsreader font.

```bash
python3 -m venv .venv
.venv/bin/pip install fonttools==4.69.1 brotli
# Original TTFs are named newsreader-variable.woff2/inter-variable.woff2 in SOURCE;
# TTFont detects their actual format. This is an offline local source directory.
.venv/bin/python scripts/design/fonts.py --source-dir SOURCE
.venv/bin/python scripts/design/fonts.py --check
```

The `.venv` and upstream raw binaries are not committed. The fast JS suite checks
the shipped payload budget; the Python check inspects actual cmap coverage.

## Next migration steps

1. Move shared header/footer/drawer/theme and legacy figure style values into
   manifest-backed variants, then expand the escape-lint/target/motion boundary.
2. Finish measured font fallback metrics, CLS, and every-width/zoom checks.
3. Add full English/Bangla route/content catalogs before publishing locale URLs,
   then perform system-font glyph and device testing.
4. Decide whether the original initial-JS and lab budgets can be achieved with
   finer islands/less hydration under Next, or need a future stack migration.
5. Treat model selection, same-origin assets/isolation, and any inbox/form write
   endpoint as separate product decisions; do not invent them to fill a section.

## Final validation run

- `npm run quality`: **229 / 229 tests passed**, plus design verification,
  generated-motion/source lint, legacy token contrast, ESLint, and TypeScript.
- `npm run verify`: production build and **all existing site-contract checks passed**.
- `npm run design:browser`: **5 / 5 passed** against the production build:
  geometry/type/coverage/reflow in both themes at seven widths, landing
  request/cookie/error checks and primitive sizes, full-page axe scan
  (**0 A/AA violations**), and the no-JS landing navigation/FAQ/figure/link checks.
- `scripts/design/fonts.py --check`: both roman subsets meet the declared
  Latin/UI coverage and payload checks; no Bangla-device coverage claim.
- `npm run design:payload`: **fails the original JS budget**, as expected and
  disclosed above; it is separate from the retained site's existing budgets.

Existing npm audit output reports 16 dependency findings (8 moderate, 6 high,
2 critical); no unrelated force-upgrade was applied as part of a design change.
The existing `.eslintignore` deprecation warning remains non-blocking.
