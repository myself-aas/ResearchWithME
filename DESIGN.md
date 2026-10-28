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
    fontFamily: "Aptos Serif, Newsreader (self-hosted fallback), Georgia, serif"
    fontSize: "2.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "Aptos Serif, Newsreader (self-hosted fallback), Georgia, serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.012em"
  title:
    fontFamily: "Aptos Serif, Newsreader (self-hosted fallback), Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Aptos Serif, Newsreader (self-hosted fallback), Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  small:
    fontFamily: "Aptos, Inter (self-hosted fallback), system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Aptos, Inter (self-hosted fallback), system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Aptos, Inter (self-hosted fallback), system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  micro:
    fontFamily: "Aptos, Inter (self-hosted fallback), system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
  code:
    fontFamily: "Aptos Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  xs: "1px"
  sm: "2px"
  md: "3px"
  lg: "4px"
  xl: "6px"
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
ResearchWithMe's design system evokes the quiet authority and sustained readability of a printed research journal and a serious newspaper of record, combined with the responsiveness of a modern open-science platform. It rejects transient trends: no gradient text, no decorative glass, no artificial kickers, no purple/cyan AI palette, no nested ghost cards, and no intrusive pop-ups. The visual world is an archival reading room built from warm paper, ink, ochre, and emerald verification marks.

The active interface is the root Next.js application. The typeface is the Aptos family. Aptos is licensed by Microsoft and is not redistributed, so each stack requests the reader's installed copy by name. Self-hosted OFL faces (Newsreader for the serif, Inter for the sans) are loaded through `next/font/local` (`app/fonts/`) as size-adjusted fallbacks that prevent layout shift. Typography does not depend on a third-party font CDN. All shipped imagery is local.

## Colors
- **Primary / Brand**: Amber-900 (`#78350f`) for archival ink, primary actions, text selection, and active navigation; amber-800 for hover and focus.
- **Accent**: Emerald-700 (`#047857`) for verified peer review, DOI validation, and reproducibility evidence. Status color is always paired with a text label or icon.
- **Surfaces**: Stone-50 (`#fafaf9`) as the base canvas, white cards, and stone-100 metadata panels.
- **Ink**: Stone-900 (`#1c1917`) for primary copy and stone-600 (`#57534e`) for secondary annotations on light surfaces. Both exceed 4.5:1 on parchment and white.
- **Dark surfaces**: Stone-900/950 panels use stone-200/300 text and amber-400 focus rings. A `dark-surface` class or an automatic `bg-stone-9*` ancestor applies the light-on-dark token treatment.
- **Danger**: Red-800 for destructive and error states, never as the only differentiator.

## Typography
- **Primary face**: Aptos Serif sets headings and all reading copy. Headings are bold (700), with balanced wrapping, obvious scale steps, and tracking no tighter than `-0.012em`.
- **Body**: Aptos Serif at 16px/1.65 with a 65–75ch measure. Article bodies use the `journal-prose` treatment (hyphenation, old-style proportional figures, common ligatures) and a `drop-cap` on the opening paragraph. Small copy never goes below 12px.
- **Interface chrome**: Aptos (sans) for buttons, form controls, labels, navigation, table headers, figure captions, tabs, and status text. Primary navigation is set in uppercase with `tracking-wider`, like newspaper section heads.
- **Code and data**: Aptos Mono is reserved for code, DOI strings, hashes, formulas, and citation output. Tables, code, and times switch back to lining tabular figures.
- **Small caps**: The `small-caps` utility (true `all-small-caps`) is available for bylines and abbreviations. It is not used as an eyebrow above headings.
- **Copy**: Controls name their action. Errors name the problem and the recovery. Loading and empty states state the current state and the next useful step.

## Layout
- **Modes**: The homepage is Persuade; article and paper readers are Read; searchable archives, forms, verification, citation, assistant, writer, and studio surfaces are Operate. Each route has a brief under `.impeccable/surfaces/`.
- **Reading column**: Article and paper bodies stay at 65–75ch. Global paragraph rules constrain prose to 65ch and small copy to 58ch to prevent 100-character lines.
- **Grouping**: Related controls sit tight; distinct groups get generous separation. Sections use rules, spacing, and typography instead of nesting bordered cards inside bordered cards.
- **Responsive navigation**: Desktop uses a single compact nav; mobile uses a disclosure menu, not a horizontally scrolling strip. Layouts reflow to 320px without horizontal page scroll.
- **Touch**: Coarse-pointer devices get 44px minimum heights for buttons, selects, summaries, checkboxes, and radios.

## Elevation & Depth
- Declare elevation once: a crisp 1px border or one subtle offset shadow, never both at high intensity.
- `shadow-xs` and `shadow-2xs` are globally normalized to a low-opacity, 1px-offset shadow.
- No zero-offset colored halos, hard offset block shadows, or decorative translucent glass.

## Shapes
- Print-journal corners: the theme compresses Tailwind's radius scale to 1–8px (`rounded-sm` 2px, `rounded-md` 3px, `rounded-lg` 4px, `rounded-xl` 6px, `rounded-2xl` 8px). Surfaces read as printed blocks separated by rules, not app cards.
- Pills (`rounded-full`) are reserved for compact tags, counters, and avatars.

## Components
- **Navigation**: Solid white sticky masthead closed by a 4px double ink rule, serif wordmark, uppercase sans section links whose current page is marked by an amber underline plus `aria-current`, accessible mobile disclosure, and a skip link.
- **Buttons**: One primary amber action per task, secondary neutral outline actions, and explicit disabled/loading labels. Buttons default to `type="button"` unless they submit a form.
- **Form controls**: Visible labels or `aria-label`, 44px min-height, AA placeholders, focus ring, validation text, preserved input on failure, and duplicate-submit protection.
- **Article header**: Byline, publication date, reading time, artifact metadata, bookmark, share, and citation utilities in a clear hierarchy.
- **Related articles**: Three typographic recommendations at the natural end of an article, without an eyebrow label.
- **Newsletter**: Inline footer subscription only, with confirmation and error states; no reading-flow popup.
- **Verification and assistant**: Standard controls and status panels; no terminal costume, pulsing decorative dot, or cyan-on-dark AI styling.
- **Status surfaces**: Shared loading, empty, error, and 404 states use semantic `main`, an announced live region, and explicit recovery actions.

## Editorial studio
- **Shell:** A white utility header with the wordmark, the studio label, an account control, and a single "View journal" exit. Navigation is a left rail on desktop and a horizontal strip that wraps rather than hiding items on narrow screens. No fixed sidebar, no overlay drawer.
- **Panels:** The editor is one bordered white surface divided by horizontal rules. Inputs and the Markdown editor are the only nested borders; previews are content, not cards.
- **Status:** Draft and published are always a dot plus a word, with amber/emerald borders and text that meet AA. Live-update status uses the same dot-and-label pattern; no pulsing.
- **Forms:** Visible labels on every control, hints tied with `aria-describedby`, inline errors marked `role="alert"`, and an error summary that links to the first invalid field. Submitting never clears input.
- **Destructive actions:** Delete uses an inline two-step confirmation with initial focus on the confirm button and an explicit Cancel. No modal.
- **Editor:** Markdown source in monospace, a formatting group with named icon buttons, write/preview as a pressed-state pair, and an inline insert panel for links and images. Raw HTML is never rendered.
- **Sign-in:** A reading-room invitation rather than a generic SaaS card: one editorial column, one focused form, password and magic link, and a demo-mode panel that explains the local archive instead of pretending accounts exist.

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
