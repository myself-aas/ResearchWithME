---
name: reme
description: Reme v4.1 manifest-driven frontend system, adapted to the existing Next.js/Tailwind 4 site.
version: 4.1.0
status: incremental-adoption
updated: 2026-11-26
token-source: src/design/index.ts
---

# Design System — reme v4.1

The author approved **adapting v4 to the existing Next.js 15 / React 19 /
Tailwind 4 stack**, not migrating to Astro. The landing page is the first
manifest-driven surface. This is **not a claim of full-site v4.1 compliance**.

The current [v4.1 source](docs/design/reme-v4.1-source.md) is retained verbatim.
The [v4.1 audit](docs/design/AUDIT-v4.1.md) records all 23 gates, implemented
upgrades, API corrections, measurements and unresolved work. The older
[v4 source](docs/design/reme-v4-source.md) and [v4 migration report](docs/design/MIGRATION.md)
are historical baselines, not a claim of current full compliance.

## One source, generated surfaces

`src/design/index.ts` composes and deeply freezes ten typed manifest modules:
color, type, space, motion, breakpoint, grid, primitive, layout, section, and genui.
Typed English/Bangla UI catalogs live alongside them. Zod validation runs before
emission; a malformed reference or invariant failure stops generation.

```bash
npm run design:gen     # manifest -> committed CSS, TS maps, JSON fixtures, docs
npm run design:verify  # two pure renders + temp files + committed-byte comparison
npm run design:lint    # migrated authored-source escapes + generated motion AST
npm run design:check   # verify + lint; included in quality, prebuild, and CI
```

- Author visual decisions in `src/design/*.manifest.ts`.
- `scripts/design/system.ts` is a pure manifest-to-file-map function. The CLI in
  `scripts/design/gen.ts` owns filesystem access; neither uses network/time/randomness.
- Never hand-edit `src/generated/**` or `docs/design/*.generated.md`.
- New landing code uses generated `r-*` primitive/type/layout classes, not raw
  lengths, Tailwind arbitrary values, inline style objects, or color literals.
- The strict migrated-source list is exported by `scripts/design/lint.ts` (now
  ten files, including the assistant thread/catalog and assistant page).
  `npm run design:lint:all` scans the entire app/components tree and intentionally
  fails while legacy escapes remain. Do not confuse the two scopes.
- `tokens/src/semantic-*.json` base roles now reference the generated v4 palette.
  The existing token pipeline resolves those references for legacy Tailwind,
  figure consumers, and non-browser renderers (including OG images). It is a
  compatibility projection, not an independently authored v4 palette.
- Domain/figure/code-panel palettes, shared chrome internals, legacy type scales,
  static brand icons, and inner-route layouts retain the legacy implementation
  until their own migration. Do not claim site-wide token-escape coverage.

## Visual language

Warm paper canvas, near-black ink and primary controls, quiet solid surfaces,
hairline dividers, and deliberate editorial space. No tomato brand accent in
live chrome. Blue is permitted for **semantic info/chart series** as explicitly
specified by v4; it is not a new decorative brand palette. Status is always an
icon plus a visible label, never color alone.

There are no kickers above headings, horizontal topic chip rows, decorative
halos, gradient text, glass blur, skeletons, or nested cards in the migrated
landing composition. Topics are readable linked cards. Metadata is monospace;
body and controls are Inter; headlines are Newsreader. A warm paper-and-pencil
still life supports posts with no cover; it is labeled illustrative in alt text,
not presented as a research artifact or the author's actual desk.

## Grid and type

Grid width is computed, not padded twice: the manifest defines inner width,
margin, gutter, and tracks at xs/md/lg/xl/2xl. Desktop hero slots are 5/7,
writing 7/5, figure 6/6, author 8/4. Topic/evidence cards are 4/4/4 on desktop,
1/1 then a full-width third card on tablet, and stacked on phones.

The corrected lg span-3 width is **216px**. Generated geometry fixtures publish
all span widths from full-precision arithmetic; rounding is for display only.

Headings scale against their slot via tier-specific `cqi`, not the viewport.
The hero target deliberately decreases from **44px at md** to **41px at lg**
because the text column narrows. Inputs remain 16px.

**Author-approved I4 correction:** h1/h2/h3 retain the supplied **24/32/34ch**
measure caps. The 45–75ch rule applies to non-heading reading roles. Contrast,
font payload, target-size, and performance thresholds were not relaxed.

## Fonts and motion

Two self-hosted roman WOFF2 files: Newsreader and Inter, weight range 400–600,
optical size pinned during subsetting. They are explicitly preloaded. Inter
provides the UI symbols absent from Newsreader; it is also Newsreader's first
bundled fallback. Existing article italics remain a separate legacy asset,
loaded only where used, and are not included in the landing roman-font budget.

Generated transitions are only opacity/transform, and only inside
`prefers-reduced-motion: no-preference`. The existing global smooth scroll was
moved into that same opt-in media query. Legacy drawer/theme/figure transitions
are not yet certified by the v4 generated-motion gate.

## Access, empty states, and honesty

- Native links, buttons, labeled controls, semantic landmarks, one h1.
- Generated interactive primitives have minimum 44px targets in both axes;
  mobile header controls were raised to 44px as well.
- Visible focus, stronger borders under `prefers-contrast: more`, system-color
  borders under forced colors, and sticky-header anchor clearance.
- Native `details`/`summary` FAQ, usable without hydration.
- Empty archives/topics/datasets/questions use explicit catalog text. Counts,
  dates, questions, and reading times come from the real archive.
- The current assistant remains browser retrieval, not a generative model.
  A click-triggered WebGPU/WASM capability probe exists, but do not claim model
  inference or sessionStorage prompt handoff exists. COOP/COEP/CORP isolation
  headers are enforced and verified on the production assistant path.
- Contact remains a real contact/issue link, not an unimplemented form endpoint.
- No `content-visibility` intrinsic heights are invented. Enable it only after
  recording actual per-tier measurements.
- Bangla catalog keys and type rules exist; translated routes/articles and
  platform/system-font glyph verification do not. Do not publish hreflang for
  translations that do not exist.

## Verification and remaining work

`npm run quality` and `npm run verify` remain mandatory. The generated manifests
are tested for references, contrast, row geometry, type coefficients, target
sizes, status completeness, deterministic output, and source/motion escapes.
SSR tests compare rendered section and slot coverage with the manifest.

See [AUDIT-v4.1.md](docs/design/AUDIT-v4.1.md) for all 23 source gates, measured
values, browser-test scope, and explicit failed/unmeasured requirements. In
particular, retaining Next.js does not make the original **50KB initial JS**
threshold pass. Do not relabel the adaptation as an Astro/zero-runtime build.


## v4.1 interaction and research UI contracts

- Derived interaction backgrounds are encoded-sRGB mixes from the palette,
  emitted as `--state-*` variables and contrast-tested in light/dark/more modes.
  Disabled controls use explicit text/background tokens, never opacity. Active
  secondary controls use ink borders because the supplied strong border fails
  3:1 on the derived active background.
- The success color is `#15541B` in light mode. Disabled text and mark colors
  are manifest-owned; all thirteen primitives are declared. New wrappers and
  styles cover fields, range, live output, prose, callout, status badge, tables
  and native dialog. Full-site instance migration and drawer behavior are not
  certified merely by these declarations.
- Subpage layout spans and placement/maxInline caps are generated contracts.
  Declaration does not mean every legacy route renders them yet.
- The strict GenUI catalog contains nine named widgets only. Whole trees,
  props, child relationships, URLs, bounds and percentages are validated before
  `generative-frame` receives a spec. No raw HTML/CSS/actions or default
  vocabulary is registered. SVG widths are numeric data attributes, not styles.
  Charts retain their table and 0–100 percentage scale (including SD zero).
- `toSpecCatalog` returns `{ catalog, components }` on the installed version.
  `withAui` is configured for backendless, narrowly-scanned generative modules;
  an unconstrained `render_spec`/HTML toolkit is deliberately not exposed.
- The assistant uses `Parts`/`AuiIf`, token classes and calm live text, with
  cumulative throttled archive quotations. No cloud sync or model exists. A
  user-triggered capability probe does not download weights or start inference.
- `/lab/genui` provides illustrative, noindex catalog fixtures. They are not
  benchmark results. Tests cover all nine widgets in three container widths.

Run `npm run audit:all` for executable evidence. It must exit nonzero while
performance, whole-tree migration or manual/unimplemented requirements remain.


The follow-up hardening centralizes response headers in `lib/security/headers.ts`: first-party resource origins, COOP/COEP/CORP isolation, and WASM compilation permission. Legacy inline script/style exceptions remain explicit and must not be described as strict CSP. `lib/assistant/model-assets.ts` implements bounded, manifest/hash-verified same-origin shard caching; it is delivery infrastructure, not a shipped model or inference engine.
