---
name: ResearchWithMe
description: Scholarly open-science publication and research engine
colors:
  primary: "#78350f" # amber-900, archival ochre
  primary-hover: "#92400e" # amber-800
  accent: "#047857" # emerald-700, peer verification
  neutral-bg: "#fafaf9" # stone-50, warm parchment
  neutral-surface: "#ffffff" # white cards
  neutral-surface-subtle: "#f5f5f4" # stone-100
  neutral-border: "#e7e5e4" # stone-200
  neutral-text: "#1c1917" # stone-900, deep ink
  neutral-text-muted: "#57534e" # stone-600, AA on light surfaces
  dark-surface: "#1c1917" # stone-900
  dark-surface-text: "#e7e5e4" # stone-200, AA on dark surfaces
  focus: "#92400e" # amber-800
  danger: "#991b1b" # red-800
typography:
  display:
    fontFamily: "Newsreader (self-hosted variable), Georgia, serif"
    fontSize: "2.75rem"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Newsreader (self-hosted variable), Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Newsreader (self-hosted variable), Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.35
  body:
    fontFamily: "Inter (self-hosted variable), system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  small:
    fontFamily: "Inter (self-hosted variable), system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter (self-hosted variable), system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Inter (self-hosted variable), system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  micro:
    fontFamily: "Inter (self-hosted variable), system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
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
  form-control:
    backgroundColor: "#ffffff"
    borderColor: "{colors.neutral-border}"
    textColor: "{colors.neutral-text}"
    placeholderColor: "{colors.neutral-text-muted}"
    rounded: "{rounded.sm}"
    minHeight: "44px"
  status-panel:
    backgroundColor: "{colors.neutral-surface}"
    borderColor: "{colors.neutral-border}"
    rounded: "{rounded.lg}"
  article-prose:
    maxWidth: "65ch"
    textColor: "#44403c"
    lineHeight: 1.75
---

# Design System

<!-- impeccable:design-schema 1 -->

## Overview
ResearchWithMe's design system evokes the quiet authority and sustained readability of classical scholarly journals combined with the responsiveness of a modern open-science platform. It rejects transient trends: no gradient text, no decorative glass, no artificial kickers, no purple/cyan AI palette, no nested ghost cards, and no intrusive pop-ups. The visual world is an archival reading room built from warm paper, ink, ochre, and emerald verification marks.

The active interface is the root Next.js application. Fonts are self-hosted variable WOFF2 files loaded through `next/font/local` (`app/fonts/`), with generated fallback metrics that prevent layout shift. Typography does not depend on a third-party font CDN. All shipped imagery is local.

## Colors
- **Primary / Brand**: Amber-900 (`#78350f`) for archival ink, primary actions, text selection, and active navigation; amber-800 for hover and focus.
- **Accent**: Emerald-700 (`#047857`) for verified peer review, DOI validation, and reproducibility evidence. Status color is always paired with a text label or icon.
- **Surfaces**: Stone-50 (`#fafaf9`) as the base canvas, white cards, and stone-100 metadata panels.
- **Ink**: Stone-900 (`#1c1917`) for primary copy and stone-600 (`#57534e`) for secondary annotations on light surfaces. Both exceed 4.5:1 on parchment and white.
- **Dark surfaces**: Stone-900/950 panels use stone-200/300 text and amber-400 focus rings. A `dark-surface` class or an automatic `bg-stone-9*` ancestor applies the light-on-dark token treatment.
- **Danger**: Red-800 for destructive and error states, never as the only differentiator.

## Typography
- **Headings**: Newsreader variable with balanced wrapping, obvious scale steps, and a tracking floor of `-0.02em`.
- **Body**: Inter variable at 16px/1.65 with a 65–75ch measure. Small copy never goes below 12px; functional labels use at least 12px.
- **Code and data**: Monospace is reserved for code, DOI strings, hashes, formulas, and citation output. Tabular numerals are enabled for data and time values.
- **Copy**: Controls name their action. Errors name the problem and the recovery. Loading and empty states state the current state and the next useful step.

## Layout
- **Modes**: The homepage is Persuade; article and paper readers are Read; searchable archives, forms, verification, citation, assistant, and writer surfaces are Operate. Each route has a brief under `.impeccable/surfaces/`.
- **Reading column**: Article and paper bodies stay at 65–75ch. Global paragraph rules constrain prose to 65ch and small copy to 58ch to prevent 100-character lines.
- **Grouping**: Related controls sit tight; distinct groups get generous separation. Sections use rules, spacing, and typography instead of nesting bordered cards inside bordered cards.
- **Responsive navigation**: Desktop uses a single compact nav; mobile uses a disclosure menu, not a horizontally scrolling strip. Layouts reflow to 320px without horizontal page scroll.
- **Touch**: Coarse-pointer devices get 44px minimum heights for buttons, selects, summaries, checkboxes, and radios.

## Elevation & Depth
- Declare elevation once: a crisp 1px border or one subtle offset shadow, never both at high intensity.
- `shadow-xs` and `shadow-2xs` are globally normalized to a low-opacity, 1px-offset shadow.
- No zero-offset colored halos, hard offset block shadows, or decorative translucent glass.

## Shapes
- Radii stay between 6px and 16px. `rounded-lg`/`rounded-xl` is the normal card and control radius; pills are reserved for compact tags and counters.
- Inputs and primary actions use 6–10px radii. Major editorial panels may use 12–16px.

## Components
- **Navigation**: Solid white sticky header, serif wordmark, current-page state with text plus `aria-current`, accessible mobile disclosure, and a skip link.
- **Buttons**: One primary amber action per task, secondary neutral outline actions, and explicit disabled/loading labels. Buttons default to `type="button"` unless they submit a form.
- **Form controls**: Visible labels or `aria-label`, 44px min-height, AA placeholders, focus ring, validation text, preserved input on failure, and duplicate-submit protection.
- **Article header**: Byline, publication date, reading time, artifact metadata, bookmark, share, and citation utilities in a clear hierarchy.
- **Related articles**: Three typographic recommendations at the natural end of an article, without an eyebrow label.
- **Newsletter**: Inline footer subscription only, with confirmation and error states; no reading-flow popup.
- **Verification and assistant**: Standard controls and status panels; no terminal costume, pulsing decorative dot, or cyan-on-dark AI styling.
- **Status surfaces**: Shared loading, empty, error, and 404 states use semantic `main`, an announced live region, and explicit recovery actions.

## Motion & States
- One restrained page-settle entrance is applied to `main`: 360ms, exponential ease-out, transform and opacity only.
- State feedback uses short color, opacity, and border transitions. No scattered entrance animations on every card.
- `prefers-reduced-motion: reduce` disables the entrance and transform transitions while preserving color/opacity state changes.
- Every asynchronous action has loading, success, empty, error, and disabled behavior where applicable. Errors preserve user input and offer a retry.

## Do's and Don'ts
- **DO** maintain WCAG 2.1 AA contrast for body, placeholder, and functional text.
- **DO** theme browser surfaces: amber selection, amber caret, visible focus, underline offsets, custom scrollbars, and tabular numerals.
- **DO** use dedicated URLs with full browser history for distinct workflows.
- **DO** keep local image assets and honest labels for prototype/demo behavior.
- **DON'T** use eyebrow or kicker labels above headings.
- **DON'T** use gradient text, decorative blur, AI purple/cyan palettes, or nested cards.
- **DON'T** use intrusive pop-up modals that disrupt reading.
- **DON'T** rely on color alone for status, verification, or errors.
