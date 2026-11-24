---
name: reme
description: reme Frontend Design System v3.1 as used by researchwith.me — a single-author research blog. Token source: tokens/src/*.json; token build: npm run tokens:build.
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
    fontFamily: "'Plus Jakarta Sans', Georgia, serif"
  interface:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
  metadata:
    fontFamily: "'Aptos Mono', 'JetBrains Mono', monospace"
  display:
    fontFamily: "'Plus Jakarta Sans', Georgia, serif"
    fontSize: "clamp(2.5rem, 5vw, 4.5rem)"
    fontWeight: 450
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title-1:
    fontFamily: "'Plus Jakarta Sans', Georgia, serif"
    fontSize: "clamp(2rem, 3.5vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  title-2:
    fontFamily: "'Plus Jakarta Sans', Georgia, serif"
    fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  heading-1:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.25
  heading-2:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 650
    lineHeight: 1.3
  heading-3:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 650
    lineHeight: 1.35
  body-reading:
    fontFamily: "'Plus Jakarta Sans', Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.7
  body:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  body-small:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
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

The frontend uses the user-approved editorial refresh (2026-11-15). The token layer that implements it is
`app/globals.css` plus `tokens/` (built with `npm run tokens:build`, validated by
`npm run tokens:check`). The front matter above documents the palette, the type scale, and the spacing
ramp; **Plus Jakarta Sans is the only downloaded typeface**, and metadata text uses the system monospace
stack, so no page requests a second font family.

## Summary

- **Principles:** Provenance, Trust, Scholarship, Collaboration, Preservation. Every claim keeps a visible path to its source; trust states are explicit, never implied by polish.
- **Color:** cool light neutrals with a blue action palette (primary `#005BBF`), emerald verification, and domain palettes for knowledge, trust, provenance, workflow, collaboration, and citation. The current light/dark semantic maps are in `tokens/src/`; generated token styles define both themes. Color never carries meaning alone.
- **Typography:** self-hosted Plus Jakarta Sans is the editorial *and* interface face, with Georgia (serif) and system sans fallbacks. Metadata uses the system monospace stack (`ui-monospace`, Aptos Mono, JetBrains Mono). One downloaded family per page, per `AGENTS.md` §9.
- **Shape and elevation:** reme radius scale (4px–24px, pill for tags), raised/floating/dialog shadows based on neutral-950.
- **Motion:** CSS transitions only — reveals 200ms, larger settles 320–480ms, `prefers-reduced-motion: reduce` collapses all animation and transition duration. There is no animation library, no preloader, and no route-transition wrapper: the article path ships one `requestAnimationFrame` reading-progress bar and nothing else.
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

The site ships three layers. Product components own whole surfaces; nothing below them knows what a
post is.

| Layer | Location | Rule |
|---|---|---|
| Tokens | `tokens/src/*.json` → `tokens/generated/` | The only source of colour, type, and motion values. Regenerate with `npm run tokens:build`; never hand-edit generated files. |
| Product components | `components/layout`, `components/post`, `components/mdx`, `components/search`, `components/seo`, plus `BrandLogo` and `ReadingProgress` | Site chrome, post cards, the cover frame, table of contents, citation box, the MDX component map, search, and breadcrumbs. |

### The MDX surface

`components/mdx/mdx-components.tsx` is the design system's public face inside a post. Authors write:

- `Callout` — `note`, `tip`, `warning`, `danger`; icon, label, and a token-defined tint.
- `Figure` — framed image with a mandatory caption; optional link.
- `Video` — native `<video>` with poster and caption.
- `KeyTakeaways` — the summary box; one per post at most.
- `Sidenote` — a quiet aside that stays inline with the prose.
- `pre` → `CodeBlock` — dark code panel, syntax highlighting, copy control.
- Links distinguish internal (`next/link`) from external (new tab, announced).

Prose rhythm lives in `app/globals.css` under `.mdx-body`; the column itself is `.reading-prose`
(68ch, 1.125rem/1.7, old-style numerals). Heading anchors are added by `rehype-slug` +
`rehype-autolink-headings`, and the table of contents reads the same ids.

### Two rules that bind every component

1. **Colour comes from semantic tokens only.** `text-ink`, `bg-surface`,
   `border-line`, `text-brand-mark`, and so on. Never a raw palette family
   (`stone-*`, `red-*`, `white`): it does not switch with the theme. A utility
   naming an undefined token compiles to nothing and the element silently
   inherits its parent colour.
2. **Repeated class strings become a component.** If a string appears more than
   a few times it belongs in one component or one CSS layer, defined once.

### Component state contract

Every surface that can be empty says why it is empty and offers one relevant
next step. The feed with no posts explains how posts are added; a tag with no
matches links back to the topic index; a search with no results suggests a
shorter query or the archive. Status is never carried by colour alone — it is
always paired with a text label. Loading and error states are announced;
there are no skeleton screens, because every page is server-rendered before it paints.

### Do not

Gradient text, decorative glass or blur, nested cards, a coloured
`border-left`/`border-right` above 1px, hard offset shadows, monospace as a
"technical" costume, unicode glyphs standing in for an icon system, or a kicker
above a heading. No fabricated counts: an archive count, reading time, or topic
total is computed from the files or not shown at all.

## Literals that are allowed (2026-11-16)

Social cards are rasterised by `next/og` in a bare browser context and cannot
resolve CSS variables. `app/opengraph-image.tsx` and
`app/posts/[slug]/opengraph-image.tsx` therefore import `semanticLight` from the
generated token module; they still track the design system, and a card is one
image so it pins the light set by design.

Brand icons (`favicon.svg`, `icon.svg`, `*.png`, `favicon.ico`) are artwork, not
UI, and carry their own ink.

Everything else resolves through a token.
