# Design System

> Canonical design tokens live in `/DESIGN.md`. The accessible minimum type size is 12px; all secondary text must meet WCAG AA.

<!-- impeccable:design-schema 1 -->

## Visual World

A serious scholarly publication combined with a high-performance open-source systems engineering archive. Calibrated for deep reading stamina, high contrast, and academic credibility.

## Typography

- **Headings & Display**: Editorial Serif (`font-serif`, Georgia / Merriweather / Playfair). Tracking -0.02em to -0.03em. Unbalanced line wraps avoided.
- **Body & Controls**: Precision Sans (`font-sans`, Inter / system-ui). Body measure clamped between 65ch and 75ch with comfortable line-height (1.75).
- **Technical Identifiers & Data**: Monospace (`font-mono`, Menlo / JetBrains Mono / monospace) strictly reserved for DOIs, commit hashes, code signatures, and tabular metrics.

## Color Palette & Tokens

- **Paper / Canvas**:
  - `bg-white`: Clean reading surface
  - `bg-stone-50`: Ambient canvas
  - `bg-stone-100`: Secondary callout background
  - `bg-stone-900`: Archival dark footer & high-contrast cards
- **Ink & Typography**:
  - `text-stone-900`: Primary reading ink (contrast ratio > 12:1 against light canvas)
  - `text-stone-700`: Body prose
  - `text-stone-500`: Secondary metadata and timestamps
  - `text-stone-100` / `text-white`: On dark backgrounds
- **Academic & Editorial Accents**:
  - `amber-900` / `amber-800`: Primary scholarly accent (warm leather/bookbinding ink)
  - `emerald-700` / `emerald-600`: Open Access certification and verified credentials
  - `sky-600`: Systems architecture & GitHub teardowns
  - `rose-700`: Clinical medicine and biomedical alerts

## Craft Floor & Layout Guardrails

1. **Heading Clarity**: Headings speak for themselves. Eyebrows and kicker labels above titles are strictly forbidden.
2. **Elevation Declarations**: Elevation declared once per container—clean 1px border (`border-stone-200`) or subtle blur shadow (`shadow-xs` / `shadow-sm`), never layered ghost cards.
3. **Zero-Pill Discipline**: Pill shapes (`rounded-full`) reserved strictly for compact metric counts. Cards and containers use disciplined `rounded-xl` or `rounded-2xl`.
4. **Contrast Integrity**: Body text contrast ≥ 4.5:1, large text ≥ 3:1. On dark surfaces, secondary text tinted from the surface palette; no washed-out grays.
5. **Browser Surfaces**: Text selection styled in `selection:bg-amber-900 selection:text-white`. Custom focus rings in `focus-visible:ring-stone-400`.
6. **Interaction States**: All interactive controls carry active, hover, disabled, and keyboard focus states.
