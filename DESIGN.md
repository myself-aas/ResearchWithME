---
name: ResearchWithMe
description: Scholarly open-science publication and research engine
colors:
  primary: "#78350f" # amber-900 (deep archival ochre)
  primary-hover: "#92400e" # amber-800
  accent: "#047857" # emerald-700 (peer verification)
  neutral-bg: "#fafaf9" # stone-50 (warm parchment)
  neutral-surface: "#ffffff" # pure white cards
  neutral-surface-subtle: "#f5f5f4" # stone-100
  neutral-border: "#e7e5e4" # stone-200
  neutral-text: "#1c1917" # stone-900 (deep ink)
  neutral-text-muted: "#57534e" # stone-600 (WCAG AA compliant contrast >= 4.5:1)
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.3
  micro:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1.2
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System

<!-- impeccable:design-schema 1 -->

## Overview
ResearchWithMe's design system evokes the quiet authority and sustained readability of classical scholarly journals combined with the responsiveness of modern open-science platforms. Its aesthetics reject transient trends—zero gradient text, zero floating decorative blurs, zero artificial kickers, and zero intrusive pop-ups.

## Colors
- **Primary / Brand**: Amber-900 (`#78350f`) representing archival inks and bibliographic heritage.
- **Accents**: Emerald-700 (`#047857`) for verified peer reviews, DOI validation, and cryptographic reproducibility proofs.
- **Surfaces**: Warm stone-50 parchment (`#fafaf9`) as the base canvas, layered with crisp white cards (`#ffffff`) and subtle stone-100 (`#f5f5f4`) metadata panels.
- **Ink & Contrast**: Deep stone-900 (`#1c1917`) for primary copy, stone-700/600 (`#44403c`/`#57534e`) for secondary annotations, all strictly calibrated to exceed WCAG 2.1 AA 4.5:1 contrast requirements.

## Typography
- **Headings & Editorial Titles**: Serif typography (`Newsreader, Georgia, serif`) offering rhythm, human pacing, and scholarly gravitas.
- **Body & Data**: Sans-serif (`Inter, sans-serif`) with an explicit brand font waiver recorded in Impeccable config, ensuring maximum legibility on both retina and standard screens across technical prose.
- **Code, Hashes & Formulae**: Monospace (`ui-monospace, Menlo, Monaco, Consolas, monospace`) strictly reserved for mathematical expressions, DOI strings, SHA-256 hashes, and code blocks.

## Layout
- **Reading Measure**: Article body max-width is constrained to `68-75ch` (`max-w-3xl`) to prevent visual eye fatigue during deep reading sessions.
- **Editorial Feed**: 6 curated research columns with high-contrast topic thumbnail banners for immediate topical orientation.
- **Dedicated Task Surfaces**: Every user action (verification, inquiries, reading, digests) lives on its own dedicated URL (`/post/[slug]`, `/verify`, `/assistant`).

## Elevation & Depth
- **Single Elevation Declaration**: Avoid simultaneous borders and deep floating shadows (no ghost cards). Cards use crisp 1px borders (`border-stone-200`) or clean understated offsets (`shadow-xs` / `shadow-sm`).
- **No Zero-Offset Colored Halos**: All elevation cues serve directional lighting and functional separation.

## Shapes
- **Corner Radii**: Restrained radii (`rounded-md` / `rounded-lg`, 6px to 12px) for structured cards, inputs, and article containers.
- **Zero Excessive Pill Shapes**: Pills are restricted to compact tag indicators and filter chips; main interactive surfaces and cards maintain architectural rectangular dignity.

## Components
- **Article Header**: Author byline, publication date, reading time estimate, DOI badge, and native mobile share button.
- **Related Articles**: 3-card tag-similarity recommendation block positioned at the natural conclusion of every article.
- **Newsletter Subscription**: Inline digest signup in the blog footer with clear value proposition and confirmation states.
- **Verification Terminal**: Dedicated interactive interface for cryptographic preprint verification and citation extraction.

## Do's and Don'ts
- **DO** maintain strict >= 4.5:1 contrast on all body and placeholder text.
- **DO** use dedicated URLs with full browser history support for distinct workflows.
- **DO** theme browser surfaces (text selection `selection:bg-amber-900 selection:text-white`, keyboard focus rings `focus-visible:ring-2 focus-visible:ring-amber-800`).
- **DON'T** use eyebrow or kicker labels above headings.
- **DON'T** use gradient text or decorative zero-blur drop shadows.
- **DON'T** use intrusive pop-up modals that disrupt reading flow.
