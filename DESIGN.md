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
- **Color:** warm paper neutrals with the tomato action palette defined in `tokens/src/semantic-light.json` (action primary, focus, and link resolve through `--reme-*`), emerald verification, and domain palettes for knowledge, trust, provenance, workflow, collaboration, and citation. The current light/dark semantic maps are in `tokens/src/`; generated token styles define both themes. Color never carries meaning alone.
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

The logo is the "reme." wordmark (Newsreader, extrabold). Colouring is
author-specified (2026-11-25): "re" and the period sit in the brand accent
(`text-brand`), "me" in the ink colour (`text-ink`), so the mark reads
orange-black-orange and inverts correctly in dark theme. A horizontal
gradient across the letters ("r>e>m>e" orange→orangish-black→black) was
considered and rejected — the design system forbids gradient text. The
wordmark is one size step larger than the v3.1 scale (`header` renders at
1.75rem, 2rem from `sm`). The wordmark is rendered by
`components/BrandLogo.tsx` and carries no monogram.

The static icons (`favicon.svg`, `icon.svg`, `favicon*.png`, `apple-touch-icon.png`,
`favicon.ico`) are raster/vector files that cannot read CSS variables. They use
the project's brand-mark ink — `tokens/src/semantic-light.json` `brand.mark`
(`#C93D0C`, deep tomato since 2026-11-25; previously `#2457A7`, originally
`#005BBF`) — baked in. Regenerating them is the only place that literal is
allowed to appear.

Accessibility: `BrandLogo` renders the wordmark only. The wrapper is
`aria-hidden` by default so a wrapping link supplies the single accessible name;
pass `label` when the mark must name itself.

## Tomato palette (2026-11-25)

The brand accent is tomato again, by author decision — the blue action palette
of the previous iteration is retired. The change lives in `tokens/src/`, not
in CSS, so the theme classes keep working:

- **Light:** action primary / link / brand mark `#C93D0C` (deep tomato — the
  darkest tomato that carries white text at ≥4.5:1 and clears AA on canvas),
  hover `#A83309`, pressed `#8C2A07`; focus ring `#F65215` (vivid tomato, a
  non-text role that only needs 3:1); selection `#FFE1D3`; chart series 1
  `#C93D0C`.
- **Dark:** action primary `#FF7A4D` with dark on-primary ink `#2A1206`,
  hover `#FF9470`, pressed `#E85A2E`; link `#FF9470`; visited and brand mark
  `#FFB59F`; focus `#FFB59F`; selection `#3D1D0E`; chart series 1 `#FF8A5C`.
- **No blue anywhere in the UI:** the former blue domain hues moved to violet
  (`#1D4ED8` → `#6D28D9` light, `#60A5FA` → `#A78BFA` dark) and teal
  (`#1E40AF` → `#0F766E` light, `#93C5FD` → `#5EEAD4` dark) across knowledge,
  trust, provenance, workflow, collaboration, citation, the primitive focus
  pair, and the graph node/edge colors. The unused `indigo` primitive ramp is
  now a `tomato` ramp. The one blue-tinted cover artwork in `PostCover`
  became the tomato variant.
- `tokens:check` passes WCAG AA on every configured pair; the domain-hue swaps
  keep near-equal lightness to the retired blues, so badge contrast is
  unaffected. Static brand icons were recolored to `#C93D0C`.

## Minimal article hero (2026-11-25)

Every article's hero follows one order: **title, then a single byline row,
then the cover image** — the title is never overlaid on the cover.

- The `<h1>` drops from `clamp(2.35rem–4.35rem)` to
  `clamp(2rem, 4vw, 3.25rem)`; the hero was the densest screen on the site
  (badge, word count, tag chips, description block, author card, dates) and
  now carries only the title and one quiet mono row:
  `By <author link> · <date> · Updated <date> · <reading time>`.
- **Components relocated, not deleted:** the `PostHeroBanner` overlay banner
  (title on the image) is retired — `PostCover` serves both styles, `hero`
  mapping to a taller `aspect-[21/9]` frame and the default to `16/9`. Tag
  chips live only at the article's end ("More topics"); the author card
  becomes the byline link (§5's visible author block); the description stays
  in metadata/JSON-LD — the body's answer paragraph does the introducing.
- The abstract-artwork cover no longer repeats the post title inside the
  artwork (it duplicated the `<h1>` directly above it); it keeps the
  decorative "Field notes" chip and geometry.
- The mobile header's search and menu icons are **bare** — no border, no
  circle, no surface — the 40px touch area and the focus-visible ring carry
  the interaction instead of chrome.

## Mobile drawer (2026-11-25)

Below `sm`, the horizontal pill strip in the header is replaced by a
hamburger trigger (`components/layout/MobileMenu.tsx`) that opens a
**right-side drawer**: a `role="dialog"` panel of `w-[min(19rem,84vw)]` —
deliberately not a full-screen takeover — over a dimming scrim. Items wrap
their own content (icon chip, label, one-line description) as a vertical
list; there is no horizontal scrolling strip anymore.

**The mobile header keeps only two controls: search and the menu trigger.**
The theme control and the RSS link live in the drawer instead (the theme row
cycles system → light → dark in place, mirroring the header button through
the same `lib/theme` helpers); from `sm` up, the feed and theme buttons stay
in the header beside the inline navigation.

- **Trigger icon.** Material Symbols' `view_cozy` (Outlined, 24px geometry,
  Apache-2.0 from google/material-design-icons), embedded as inline SVG —
  no icon font, so the two-family font budget (§9) is untouched. Each click
  rotates the icon a further 90° (accumulating) with the emphasize easing at
  200ms — a small dynamic acknowledgment of the toggle — and collapses to
  none under `prefers-reduced-motion`.
- The panel and scrim render through a portal to `document.body`, because the
  header's `backdrop-blur-md` makes the header the containing block for
  `position: fixed` descendants — a drawer inside the header tree would be
  trapped in the header box.
- Interaction contract (§12): the trigger is a real `<button>` with
  `aria-expanded`/`aria-haspopup`/`aria-controls`; focus moves to the first
  item on open and returns to the trigger on close; Tab cycles inside the
  panel; Escape and scrim-click dismiss; body scroll locks while open; any
  route change closes it. All animation is CSS (`transform`, `opacity`,
  `visibility` at 200ms standard easing) with `motion-reduce:transition-none`.
- Content-wrapping items keep 44px minimum touch targets (`min-h-11`).

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
