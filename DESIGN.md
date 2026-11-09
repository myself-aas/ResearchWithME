---
name: πeme
description: πeme Frontend Design System v3.1 for researchwith.me — scholarly open-science platform and research engine. Full normative spec: docs/pieme-design-system-v3.1.md
version: 3.1.0
status: stable-candidate
updated: 2026-11-09
colors:
  canvas: "#F8F7F3" # neutral-50, warm parchment
  surface: "#FFFFFF" # neutral-0
  surface-subtle: "#F0EEE8" # neutral-100
  surface-raised: "#FFFFFF"
  surface-inverse: "#161C1A" # neutral-900
  text-primary: "#161C1A" # neutral-900
  text-secondary: "#555955" # neutral-600, AA on light surfaces
  text-tertiary: "#737571" # neutral-500
  text-inverse: "#FFFFFF"
  border-subtle: "#DEDCD5" # neutral-200
  border-strong: "#9D9C97" # neutral-400
  focus: "#4F46E5" # indigo-600
  selection: "#E0E7FF" # indigo-100
  primary: "#4F46E5" # indigo-600, action primary
  primary-hover: "#4338CA" # indigo-700
  primary-pressed: "#312E81" # indigo-900
  on-primary: "#FFFFFF"
  destructive: "#DC2626" # red-600
  link: "#4338CA" # indigo-700
  visited: "#6D28D9" # violet-700
  verified: "#059669" # emerald-600, trust verified
  replicated: "#047857" # emerald-700
  knowledge-source: "#4F46E5"
  knowledge-evidence: "#059669"
  knowledge-insight: "#0891B2" # cyan-600
  knowledge-discussion: "#D97706" # amber-600
  knowledge-contradiction: "#DC2626"
  knowledge-publication: "#7C3AED" # violet-600
  knowledge-archive: "#555955"
  dark-canvas: "#0B100F" # neutral-950
  dark-surface: "#161C1A"
  dark-surface-subtle: "#252B29"
  dark-surface-raised: "#2F3633"
  dark-text-primary: "#F8F7F3"
  dark-text-secondary: "#C6C4BD"
  dark-text-tertiary: "#9D9C97"
  dark-border-subtle: "#3B403D"
  dark-border-strong: "#737571"
  dark-focus: "#A5B4FC" # indigo-300
  dark-selection: "#312E81"
typography:
  editorial:
    fontFamily: "Newsreader, Georgia, serif"
  interface:
    fontFamily: "Inter, system-ui, sans-serif"
  metadata:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2.5rem, 5vw, 4.5rem)"
    fontWeight: 450
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title-1:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2rem, 3.5vw, 3rem)"
    fontWeight: 500
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  title-2:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(1.5rem, 2.5vw, 2.25rem)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  heading-1:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.25
  heading-2:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 650
    lineHeight: 1.3
  heading-3:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 650
    lineHeight: 1.35
  body-reading:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.7
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  body-small:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
  citation:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.5
  metadata:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
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

# Design System — πeme v3.1

<!-- impeccable:design-schema 1 -->

The active frontend design system is **πeme v3.1** (`stable-candidate`, updated 2026-11-09). The full normative specification — token architecture, accessibility baseline, components, motion, scholarly domain model, conformance profiles, and the release gate — lives in **[`docs/pieme-design-system-v3.1.md`](./docs/pieme-design-system-v3.1.md)**, which takes precedence over this file. The front-matter above is the machine-readable schema consumed by the Impeccable detector; the token layer implementing it is `app/globals.css`.

## Summary

- **Principles:** Provenance, Trust, Scholarship, Collaboration, Preservation. Every claim keeps a visible path to its source; trust states are explicit, never implied by polish.
- **Color:** warm parchment neutrals with an indigo action palette (primary `#4F46E5`), emerald verification, and domain palettes for knowledge, trust, provenance, workflow, collaboration, and citation. Full light/dark semantic maps are in the spec; `globals.css` defines both (`.dark` for dark mode). Color never carries meaning alone.
- **Typography:** Newsreader (editorial reading), Inter (interface chrome), JetBrains Mono (DOI/ORCID/code/metadata). Newsreader and Inter are self-hosted via `next/font/local` in `app/fonts/`; JetBrains Mono is requested by installed name with a system mono fallback.
- **Shape and elevation:** πeme radius scale (4px–24px, pill for tags), raised/floating/dialog shadows based on neutral-950.
- **Motion:** reveal 200ms, verify/archive 320ms, connect 480ms, synthesize up to 700ms, with the standard/enter/exit/emphasize easings; `prefers-reduced-motion: reduce` collapses all animation and transitions per the spec's §9 contract.
- **Accessibility:** WCAG 2.2 AA baseline; 2px/2px focus ring in the focus token (indigo-600 light, indigo-300 dark); 44px minimum touch targets; status always paired with a text label.
- **Do not** use gradient text, decorative glass, AI purple/cyan palettes, terminal motifs, or color alone for status.
