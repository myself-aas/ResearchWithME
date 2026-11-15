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
