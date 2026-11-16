---
name: reme
description: reme Frontend Design System v3.1 for researchwith.me — scholarly open-science platform and research engine. Full normative spec: docs/reme-design-system-v3.1.md
version: 3.1.0
status: stable-candidate
updated: 2026-11-09
colors:
  canvas: "#F8F9FA"
  surface: "#FFFFFF"
  surface-subtle: "#F1F3F4"
  surface-raised: "#FFFFFF"
  surface-inverse: "#202124"
  text-primary: "#202124"
  text-secondary: "#5F6368"
  text-tertiary: "#5F6368"
  text-inverse: "#FFFFFF"
  border-subtle: "#DADCE0"
  border-strong: "#80868B"
  focus: "#005BBF"
  selection: "#D8E2FF"
  primary: "#005BBF"
  primary-hover: "#174EA6"
  primary-pressed: "#004493"
  on-primary: "#FFFFFF"
  destructive: "#B91C1C"
  link: "#005BBF"
  visited: "#174EA6"
  brand-mark: "#005BBF"
  verified: "#1D4ED8"
  replicated: "#047857"
  knowledge-source: "#1D4ED8"
  knowledge-evidence: "#059669"
  knowledge-insight: "#0891B2"
  knowledge-discussion: "#D97706"
  knowledge-contradiction: "#B91C1C"
  knowledge-publication: "#1E40AF"
  knowledge-archive: "#5C5C63"
  dark-canvas: "#0A0D14"
  dark-surface: "#131823"
  dark-surface-subtle: "#1D1F27"
  dark-surface-raised: "#272A32"
  dark-text-primary: "#F8F9FA"
  dark-text-secondary: "#AEB4BE"
  dark-text-tertiary: "#AEB4BE"
  dark-border-subtle: "#414754"
  dark-border-strong: "#8B909F"
  dark-focus: "#ADC7FF"
  dark-selection: "#003061"
  dark-brand-mark: "#ADC7FF"
typography:
  editorial:
    fontFamily: "'Plus Jakarta Sans', 'Newsreader', Georgia, serif"
  interface:
    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
  metadata:
    fontFamily: "'Aptos Mono', 'JetBrains Mono', monospace"
  display:
    fontFamily: "'Plus Jakarta Sans', Newsreader, Georgia, serif"
    fontSize: "clamp(2.5rem, 5vw, 4.5rem)"
    fontWeight: 450
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title-1:
    fontFamily: "'Plus Jakarta Sans', Newsreader, Georgia, serif"
    fontSize: "clamp(2rem, 3.5vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  title-2:
    fontFamily: "'Plus Jakarta Sans', Newsreader, Georgia, serif"
    fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  heading-1:
    fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.25
  heading-2:
    fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 650
    lineHeight: 1.3
  heading-3:
    fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 650
    lineHeight: 1.35
  body-reading:
    fontFamily: "'Plus Jakarta Sans', Newsreader, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.7
  body:
    fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  body-small:
    fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
  citation:
    fontFamily: "'Aptos Mono', JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.5
  metadata:
    fontFamily: "'Aptos Mono', JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0.015em"
rounded:
  xs: "0.25rem"
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
  2xl: "1.5rem"
  full: "9999px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
  10: "2.5rem"
  12: "3rem"
  16: "4rem"
  20: "5rem"
  24: "6rem"
---

# Design System — reme v3.1

<!-- impeccable:design-schema 1 -->

The frontend is transitioning from **reme v3.1** to the user-approved editorial refresh (2026-11-15). The full normative specification — token architecture, accessibility baseline, components, motion, scholarly domain model, conformance profiles, and the release gate — lives in **[`docs/reme-design-system-v3.1.md`](./docs/reme-design-system-v3.1.md)**, which remains a reference for domain and accessibility contracts; the current editorial palette and typography are documented here and in the refresh notes. The front-matter above is the machine-readable schema consumed by the Impeccable detector; the token layer implementing it is `app/globals.css`.

## Summary

- **Principles:** Provenance, Trust, Scholarship, Collaboration, Preservation. Every claim keeps a visible path to its source; trust states are explicit, never implied by polish.
- **Color:** cool light neutrals with a blue action palette (primary `#005BBF`), emerald verification, and domain palettes for knowledge, trust, provenance, workflow, collaboration, and citation. The current light/dark semantic maps are in `tokens/src/`; generated token styles define both themes. Color never carries meaning alone.
- **Typography:** self-hosted Plus Jakarta Sans is the editorial and interface face, with Newsreader, Inter and system fallbacks. Metadata uses Aptos Mono, JetBrains Mono or system monospace fallbacks. See `docs/editorial-refresh-2026-11-15.md` for the refresh and its limitations.
- **Shape and elevation:** reme radius scale (4px–24px, pill for tags), raised/floating/dialog shadows based on neutral-950.
- **Motion:** reveal 200ms, verify/archive 320ms, connect 480ms, synthesize up to 700ms, with the standard/enter/exit/emphasize easings; `prefers-reduced-motion: reduce` collapses all animation and transitions per the spec's §9 contract.
- **Motion system (v1):** implemented with `motion` (`m` + one `LazyMotion` scope) and Disney's twelve animation principles. The token layer is `lib/motion/tokens.ts`, the primitives are in `components/motion/`, and every demo lives at `/motion`. Full guide: [`docs/motion-system.md`](./docs/motion-system.md). Content is never hidden by an animation server-side, reveals arm only below the fold, and nothing loops except a real progress indicator.
- **Accessibility:** WCAG 2.2 AA baseline; 2px/2px focus ring in the focus token (`#005BBF` light, `#ADC7FF` dark); 44px minimum touch targets; status always paired with a text label.
- **Do not** use gradient text, decorative glass, AI purple/cyan palettes, terminal motifs, or color alone for status.


## Domain badge foregrounds (2026-11-14)

Emerging/Uncertain labels use dedicated semantic foregrounds, not their accent
colors as text. `domainText.emerging` is `#155E75` in light and `#67E8F9` in
dark; `domainText.uncertain` is `#92400E` in light and `#FCD34D` in dark.
Existing trust accent dots, 10% tints, borders and research-state wording stay
unchanged. `tokens:check` enforces >=4.5:1 for these text roles on their 10%
accent tint composited over canvas, surface and surface-raised in both themes.
These configured checks do not certify every rendered component composition.

## Brand mark ink (2026-11-17)

The logo is the "reme." wordmark (Aptos Serif, semibold). The period uses the
brand accent color (`text-brand`). The wordmark is rendered by
`components/BrandLogo.tsx` and carries no monogram.

The static icons (`favicon.svg`, `icon.svg`, `favicon*.png`, `apple-touch-icon.png`,
`favicon.ico`) are raster/vector files that cannot read CSS variables. They use
the project's base blue `#005BBF` (light) / `#ADC7FF` (dark) baked in.
Regenerating them is the only place that literal is allowed to appear.

Accessibility: `BrandLogo` renders the wordmark only. The wrapper is
`aria-hidden` by default so a wrapping link supplies the single accessible name;
pass `label` when the mark must name itself.

## Components

The normative component contracts — Source Card, Evidence Card, Claim Card,
Citation, Research Workspace, Provenance Graph, Scholarly Dialogue, AI-Assisted
Output, Tables, Forms, Feedback — are §7 of
[`docs/reme-design-system-v3.1.md`](./docs/reme-design-system-v3.1.md). This
section records what actually ships and how to consume it; it does not restate
that spec.

### Three layers

| Layer | Location | Rule |
|---|---|---|
| Primitives | `components/primitives/` | Token-driven, mostly server-safe. Import from `@/components/primitives` only. |
| UI composites | `components/ui/` | Stateful patterns (Dialog, Toast, DataTable, EmptyState, Skeleton, Alert). |
| Product components | `components/` | Domain surfaces (feed, reading, authors, studio). Compose the two layers above. |

### Primitives

`Box`, `Text`, `Stack`, `Card` (+ `CardHeader`/`CardTitle`/`CardDescription`/
`CardFooter`), `Button`, `Divider`, `Badge`, `Input`, `Select`, `Textarea`,
`Link`, `Icon`, `VisuallyHidden`.

All are server-safe except `Button`, `Input`, `Select` and `Textarea`, which are
client components with built-in label, error and `aria-describedby` wiring.
`Text` variants are `eyebrow`, `card-title`, `section-title`, `page-title`, plus
the reme v3.1 §2 display scale. `Link` variants are `inline`, `quiet`, `muted`,
`plain`; internal paths render `next/link`. Full API: 
[`docs/design-system/primitives.md`](./docs/design-system/primitives.md).

### Two rules that bind every component

1. **Colour comes from semantic tokens only.** `text-ink`, `bg-surface`,
   `border-line`, `text-brand-mark`, and so on. Never a raw palette family
   (`stone-*`, `red-*`, `white`): it does not switch with the theme. A utility
   naming an undefined token compiles to nothing and the element silently
   inherits its parent colour.
2. **Repeated class strings become a primitive variant.** If a string appears
   more than a few times it belongs in a variant, defined once.

Both are enforced by `lib/__tests__/design-token-usage.test.ts` in
`npm run quality`; deliberate exceptions go in its `ALLOW` map with a reason.

### Component state contract

Every component that fetches, submits or filters exposes loading, empty, error,
disabled and success states. Loading skeletons mirror the final layout; empty
states explain why the view is empty and offer one relevant action; errors name
the problem and the recovery step. Status is never carried by colour alone — it
is always paired with a text label.

### Do not

Gradient text, decorative glass or blur, nested cards, a coloured
`border-left`/`border-right` above 1px, hard offset shadows, monospace as a
"technical" costume, unicode glyphs standing in for an icon system, or a kicker
above a heading.

## Literals that are allowed (2026-11-16)

Two files cannot resolve CSS variables and therefore write palette values
literally. Both are deliberate, and both are listed here so the detector has a
record of them rather than a silent exception:

- **`public/404.html`** — a static-host fallback. It renders with no stylesheet
  at all, so it carries `canvas` / `text-primary` / `action.primary` inline. It
  has no dark theme; a 404 document is one page.
- **`lib/og/brand-image.tsx` and `app/opengraph-image.tsx`** — social cards are
  rasterised by `next/og` in a bare browser context. These do **not** hardcode
  hex any more: they import `semanticLight` from the generated token module, so
  they track the design system without a rebuild-by-hand step. A card is one
  image, so it pins the light set by design.
- **Brand icons** (`favicon.svg`, `icon.svg`, `*.png`, `favicon.ico`) — see
  "Brand mark ink" above.

Everything else resolves through a token. The guard is
`lib/__tests__/design-token-usage.test.ts`; the detector rule is
`design-system-color`.

## Charts (2026-11-16)

Articles can carry a chart via a fenced `chart` block; see
[`docs/charts.md`](./docs/charts.md). `recharts` renders it, and the contract is
DESIGN §32, restated here as what the implementation actually enforces:

- **Caption is mandatory and doubles as the text alternative.** A block without
  one is refused rather than rendered unlabelled.
- **Every chart renders a data table.** It is the accessible equivalent, the
  no-JavaScript state, and the print form.
- **Missing data is `null`, never `0`.** The table prints "Not reported".
- **`y-scale: log` is disclosed in text**, and values ≤ 0 are rejected at parse
  time instead of drawing an axis that lies.
- **Colour comes from `chart.series` tokens**, seven roles per theme. Verified
  each run for ≥ 4.5:1 against its canvas and for minimum pairwise CIELAB ΔE
  under protanopia, deuteranopia, and tritanopia (light ≥ 13.7, dark ≥ 12.4).
  The palette is not the `knowledge` or `trust` roles: §32 forbids reusing
  semantic evidence colours for ordinary magnitude.
- **No animated data.** `isAnimationActive={false}` everywhere; a measurement
  must not move.
- **`forced-colors` shows the table**, not a plot the OS has flattened to a
  solid block.
