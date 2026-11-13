---
name: reme
description: reme Frontend Design System v3.1 for researchwith.me — scholarly open-science platform and research engine. Full normative spec: docs/reme-design-system-v3.1.md
version: 3.1.0
status: stable-candidate
updated: 2026-11-09
colors:
  canvas: "#FAF9F6" # Archival Paper background
  surface: "#F3F1EC" # Archival Paper surface
  surface-subtle: "#EAE7DF"
  surface-raised: "#FAF9F6"
  surface-inverse: "#121214"
  text-primary: "#121214" # Ink
  text-secondary: "#5C5C63" # Muted, AA on light surfaces
  text-tertiary: "#5C5C63"
  text-inverse: "#FAF9F6"
  border-subtle: "rgba(18, 18, 20, 0.10)" # Hairline border
  border-strong: "rgba(18, 18, 20, 0.22)"
  focus: "#1D4ED8" # Single accent (Light)
  selection: "#DBEAFE"
  primary: "#1D4ED8" # Single accent (Light)
  primary-hover: "#1E40AF"
  primary-pressed: "#1E3A8A"
  on-primary: "#FFFFFF"
  destructive: "#B91C1C"
  link: "#1D4ED8"
  visited: "#1E40AF"
  verified: "#1D4ED8"
  replicated: "#047857"
  knowledge-source: "#1D4ED8"
  knowledge-evidence: "#059669"
  knowledge-insight: "#0891B2"
  knowledge-discussion: "#D97706"
  knowledge-contradiction: "#B91C1C"
  knowledge-publication: "#1E40AF"
  knowledge-archive: "#5C5C63"
  dark-canvas: "#0C0D10" # Obsidian background
  dark-surface: "#14161B" # Obsidian surface
  dark-surface-subtle: "#1B1E25"
  dark-surface-raised: "#181B22"
  dark-text-primary: "#F2F2F5" # Obsidian ink
  dark-text-secondary: "#9496A1" # Obsidian muted
  dark-text-tertiary: "#9496A1"
  dark-border-subtle: "rgba(255, 255, 255, 0.10)" # Obsidian hairline
  dark-border-strong: "rgba(255, 255, 255, 0.22)"
  dark-focus: "#60A5FA" # Single accent (Dark)
  dark-selection: "#1E3A8A"
typography:
  editorial:
    fontFamily: "'Aptos Serif', 'Newsreader', Georgia, serif"
  interface:
    fontFamily: "'Aptos', 'Inter', system-ui, sans-serif"
  metadata:
    fontFamily: "'Aptos Mono', 'JetBrains Mono', monospace"
  display:
    fontFamily: "'Aptos Serif', Newsreader, Georgia, serif"
    fontSize: "clamp(2.5rem, 5vw, 4.5rem)"
    fontWeight: 450
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title-1:
    fontFamily: "'Aptos Serif', Newsreader, Georgia, serif"
    fontSize: "clamp(2rem, 3.5vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  title-2:
    fontFamily: "'Aptos Serif', Newsreader, Georgia, serif"
    fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  heading-1:
    fontFamily: "'Aptos', Inter, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.25
  heading-2:
    fontFamily: "'Aptos', Inter, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 650
    lineHeight: 1.3
  heading-3:
    fontFamily: "'Aptos', Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 650
    lineHeight: 1.35
  body-reading:
    fontFamily: "'Aptos Serif', Newsreader, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.7
  body:
    fontFamily: "'Aptos', Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  body-small:
    fontFamily: "'Aptos', Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'Aptos', Inter, system-ui, sans-serif"
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

The active frontend design system is **reme v3.1** (`stable-candidate`, updated 2026-11-09). The full normative specification — token architecture, accessibility baseline, components, motion, scholarly domain model, conformance profiles, and the release gate — lives in **[`docs/reme-design-system-v3.1.md`](./docs/reme-design-system-v3.1.md)**, which takes precedence over this file. The front-matter above is the machine-readable schema consumed by the Impeccable detector; the token layer implementing it is `app/globals.css`.

## Summary

- **Principles:** Provenance, Trust, Scholarship, Collaboration, Preservation. Every claim keeps a visible path to its source; trust states are explicit, never implied by polish.
- **Color:** warm parchment neutrals with an indigo action palette (primary `#4F46E5`), emerald verification, and domain palettes for knowledge, trust, provenance, workflow, collaboration, and citation. Full light/dark semantic maps are in the spec; `globals.css` defines both (`.dark` for dark mode). Color never carries meaning alone.
- **Typography:** the Aptos family, requested by installed name only (never bundled): Aptos Serif (editorial reading), Aptos (interface chrome), Aptos Mono (DOI/ORCID/code/metadata). Fallbacks when Aptos is not installed: Newsreader and Inter, self-hosted via `next/font/local` in `app/fonts/`, and JetBrains Mono requested by installed name with a system mono fallback.
- **Shape and elevation:** reme radius scale (4px–24px, pill for tags), raised/floating/dialog shadows based on neutral-950.
- **Motion:** reveal 200ms, verify/archive 320ms, connect 480ms, synthesize up to 700ms, with the standard/enter/exit/emphasize easings; `prefers-reduced-motion: reduce` collapses all animation and transitions per the spec's §9 contract.
- **Motion system (v1):** implemented with `motion` (`m` + one `LazyMotion` scope) and Disney's twelve animation principles. The token layer is `lib/motion/tokens.ts`, the primitives are in `components/motion/`, and every demo lives at `/motion`. Full guide: [`docs/motion-system.md`](./docs/motion-system.md). Content is never hidden by an animation server-side, reveals arm only below the fold, and nothing loops except a real progress indicator.
- **Accessibility:** WCAG 2.2 AA baseline; 2px/2px focus ring in the focus token (indigo-600 light, indigo-300 dark); 44px minimum touch targets; status always paired with a text label.
- **Do not** use gradient text, decorative glass, AI purple/cyan palettes, terminal motifs, or color alone for status.
