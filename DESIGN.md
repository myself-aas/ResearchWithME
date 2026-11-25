---
name: reme
description: reme Frontend Design System v3.2 as used by researchwith.me — a single-author research blog. Token source (single source of truth, normative): tokens/src/*.json; token build: npm run tokens:build.
version: 3.2.0
status: stable
updated: 2026-11-25
token-source: tokens/src/*.json
---

# Design System — reme v3.2

The frontend uses the user-approved editorial refresh (2026-11-15), carried by
the token layer in `tokens/` (built with `npm run tokens:build`, validated by
`npm run tokens:check`) and mapped into Tailwind by `app/globals.css`. The
`tokens/src/*.json` files are the single normative source for colour, type,
and motion values; this document names roles and rules, not hex values, and
the front matter above deliberately no longer duplicates the palette — the
snapshot in v3.1 drifted, and drift is what the single-source rule exists to
prevent. Two self-hosted variable typefaces are downloaded — **Newsreader for
editorial text and headlines, Inter for interface chrome** — and metadata text
uses the system monospace stack, so no page requests a third font family.

## Summary

- **Principles:** Provenance, Trust, Scholarship, Collaboration, Preservation. Every claim keeps a visible path to its source; trust states are explicit, never implied by polish.
- **Color:** warm paper neutrals with the blue action palette defined in `tokens/src/semantic-light.json` (action primary, focus, and link resolve through `--reme-*`), emerald verification, and domain palettes for knowledge, trust, provenance, workflow, collaboration, and citation. The current light/dark semantic maps are in `tokens/src/`; generated token styles define both themes. Color never carries meaning alone.
- **Typography:** self-hosted Newsreader is the editorial face (reading copy and headlines), self-hosted Inter is the interface face (navigation, controls, chat), with Georgia (serif) and system sans fallbacks. Metadata uses the system monospace stack (`ui-monospace`). Two downloaded families per page, per `AGENTS.md` §9.
- **Shape and elevation:** reme radius scale (4px–24px, pill for tags), raised/floating/dialog shadows based on neutral-950.
- **Motion:** CSS transitions only — reveals 200ms, larger settles 320–480ms, `prefers-reduced-motion: reduce` collapses all animation and transition duration. There is no animation library, no preloader, and no route-transition wrapper: the article path ships one `requestAnimationFrame` reading-progress bar and nothing else.
- **Accessibility:** WCAG 2.2 AA baseline; 2px/2px focus ring in the focus token (light and dark values come from `tokens/src/semantic-*.json`); 44px minimum touch targets; status always paired with a text label; `prefers-contrast: more` strengthens the subtle border role in both themes.
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
the project's brand-mark ink — `tokens/src/semantic-light.json` `brand.mark`
(`#2457A7`) — baked in, recolored from the retired `#005BBF` on 2026-11-25 so
the browser tab matches the in-page mark. Regenerating them is the only place
that literal is allowed to appear.

Accessibility: `BrandLogo` renders the wordmark only. The wrapper is
`aria-hidden` by default so a wrapping link supplies the single accessible name;
pass `label` when the mark must name itself.

## Token-role wiring (2026-11-25)

The semantic Tailwind roles in `app/globals.css` (`bg-canvas`, `text-ink`,
`border-line`, `bg-brand`, …) reference the generated `--reme-*` layer
exclusively — the file carries **no hex literals for theme-able colour**. The
generated tokens define the light palette at `:root`, the system-dark palette
under `@media (prefers-color-scheme: dark)` on `:root:not(.light)`, and the
user-selected dark palette under `.dark`, so the ThemeMenu's explicit choice
and the OS preference flip every role at once. A v3.1-era block of hardcoded
hex values in `globals.css` (orange action palette, grey canvas) had silently
overridden the tokens and broken the explicit light/dark toggle; it is gone.
Palette candidates belong in `tokens/src/`, never in the CSS.

## The assistant family (2026-11-25)

`/assistant` introduces the chat component family (`components/assistant/`),
built on assistant-ui primitives and restyled with the same semantic tokens:
surface bubbles (`bg-surface` with `border-line`), the composer on `bg-canvas`
with a brand send affordance, quote-labelled replies rendered by
`@assistant-ui/react-markdown` under the `.assistant-markdown` layer, and
prompt chips that reuse the pill shape. Chat text is interface copy (Inter,
14px/1.6), not reading prose (Newsreader, 18px/1.7) — the tighter
`.assistant-markdown` layer exists so chat never borrows `.mdx-body` rhythm.
The family follows every rule in `AGENTS.md` §18.

## Components

The site ships three layers. Product components own whole surfaces; nothing below them knows what a
post is.

| Layer | Location | Rule |
|---|---|---|
| Tokens | `tokens/src/*.json` → `tokens/generated/` | The only source of colour, type, and motion values. Regenerate with `npm run tokens:build`; never hand-edit generated files. |
| Product components | `components/layout`, `components/post`, `components/mdx`, `components/search`, `components/assistant`, `components/seo`, plus `BrandLogo` and `ReadingProgress` | Site chrome, post cards, the cover frame, table of contents, citation box, the MDX component map, search, the assistant thread, and breadcrumbs. |

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
