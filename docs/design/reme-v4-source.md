# researchwith.me Landing Page: Master Build Prompt (reme v4.0)

*Version 4.0 · supersedes v3.3 · static, edge-first, zero third-party requests, manifest-generated design system*

**Objective.** Build the researchwith.me landing page as a static site in which the **entire frontend design system is one typed manifest**, and every rendered surface — tokens, type scale, spacing, motion, primitive variants, grid, spans, section composition, wireframes, test fixtures and documentation — is **generated** from it. Nothing visual is hand-authored twice. Consistency across device classes, locales and color modes holds *by construction*, not by review.

**Protocol.** Execute phases in order. Every number is a gate. Every gate is measured by a script. If a gate cannot be met, stop and report the failing measurement; do not deviate and do not relax a threshold.

**Non-negotiable rule of v4.0.** If a value affects what the user sees, it lives in the manifest. Authored CSS and components may consume generated custom properties and Tailwind preset classes; they may not introduce a color, a font size, a radius, a duration, a gutter or a column width of their own. The build fails if they do.

---

## Changes from v3.3

| # | Change | Why |
| --- | --- | --- |
| 1 | **Design System Manifest** replaces the layout-only manifest. Nine modules (color, type, space, motion, breakpoint, grid, primitive, layout, section) feed one generator. | v3.3 generated the grid but hand-authored tokens, type, primitives and wireframes — four drift surfaces. |
| 2 | **Generated-vs-authored boundary** is explicit and CI-enforced, with a determinism gate (regenerate → byte-identical). | Generated files were previously only a convention. |
| 3 | **Type scales with its slot, not the viewport** (`cqi` coefficients solved per tier from the slot width the role occupies). | A `4vw` h1 ignores that the hero text column *shrinks* from 720px (md, 1 col) to 381px (lg, 5/12). v3.3 had to say "test it"; v4.0 computes it. |
| 4 | **Arithmetic fix:** lg span-3 is **216.00px**, not 237.33px. | v3.3 §3.6 was wrong: 3 × 50.67 + 2 × 32 = 216.00. Invariant I16 now proves the whole table instead of trusting it. |
| 5 | **Contrast fix:** `--status-warn` light is **#6B4200** (was #7A4B00, which measured **6.69:1** on `--bg-canvas` and failed the stated 7:1 bar; it only passed on white surface). Contrast pairs are now declared data and solved at build time, on **every** background a token legally lands on. | v3.3's contrast script ran in CI against an undeclared pair list. |
| 6 | **Interaction and state layer added**: hover, active, disabled, selected, loading-less empty, plus z-index, scroll-margin, selection and caret tokens. | v3.3 specified focus only; hover/active/disabled were undefined, so they would have been improvised per component. |
| 7 | **Section composition manifest**: sections are declared as slot trees of primitives; the ASCII wireframes in Phase 7 are a *generated artifact*. | Wireframes were prose and could disagree with the span map. |
| 8 | **Header hardening**: CSP gains `base-uri`, `form-action`, `object-src`, `frame-src`; COOP/COEP added because threaded WASM needs `SharedArrayBuffer`. | v3.3's CSP allowed base-tag and form-action hijacking, and the S6 WASM path would not have run. |
| 9 | **Gates expanded 11 → 19**, including generative-integrity gates (determinism, coverage, token-escape lint, glyph coverage, heading wrap count). | "Measurable and automated" now includes the generator itself. |

---

## Phase 0: Stack, Rules, and the Generated Boundary

### 0.1 Stack

- Astro (static output). Tailwind 3.4 consuming a **generated preset** (`tailwind.preset.generated.cjs`); `theme.extend` is never hand-written.
- TypeScript for all manifests. Zod for manifest schemas. No UI framework runtime.
- JS only as islands: theme (inline), drawer, assistant entry, figure lab (lazy), search (lazy).
- Host must support custom response headers (Cloudflare Pages or Netlify).

### 0.2 DESIGN.md rules (unchanged, now lint-enforced)

No kicker above h1. No text baked into artwork. No horizontal chip rows. No gradient text. No glass blur. No skeleton loaders — explicit text empty states only.

### 0.3 The boundary

| Path | Status | Rule |
| --- | --- | --- |
| `src/design/*.manifest.ts` | **authored** | The only place a visual value may be introduced. |
| `scripts/design/gen.ts` | authored | Pure function: manifest in, files out. No network, no clock, no randomness. |
| `src/generated/**` | **generated, committed** | Never hand-edit. CI regenerates and diffs. |
| `src/components/**`, `src/pages/**` | authored | May use generated custom properties and preset classes only. |
| `docs/*.generated.md` | generated, committed | Wireframes, span tables, token tables. |

```
pnpm design:gen      # manifest -> src/generated + docs
pnpm design:verify   # regenerate into a temp dir, assert byte-identical
pnpm design:lint     # token-escape lint over authored source
pnpm audit:all       # all gates in Phase 11
```

---

## Phase 1: The Design System Manifest

`src/design/index.ts` composes nine modules and exports one frozen object. Every module is `as const` and validated by a Zod schema at build start; a schema failure is a build failure with the offending path printed.

```ts
// src/design/index.ts
import { color }      from './color.manifest';
import { type_ }      from './type.manifest';
import { space }      from './space.manifest';
import { motion }     from './motion.manifest';
import { breakpoint } from './breakpoint.manifest';
import { grid }       from './grid.manifest';
import { primitive }  from './primitive.manifest';
import { layout }     from './layout.manifest';
import { section }    from './section.manifest';

export const design = Object.freeze({
  meta: { version: '4.0', locales: ['en', 'bn'], modes: ['light', 'dark', 'more'] },
  color, type: type_, space, motion, breakpoint, grid, primitive, layout, section,
} as const);
```

### 1.1 Build invariants (each one fails the build, with the measurement printed)

| ID | Invariant |
| --- | --- |
| I1 | Every layout slot declares an `xs` value. |
| I2 | For every tier, every declared card row's spans sum to ≤ that tier's column count. |
| I3 | Every declared contrast pair meets its threshold in **light, dark and more-contrast**, computed on every background the token legally composes with (canvas *and* surface). |
| I4 | Every text role declares a measure cap in `ch`, between 45 and 75 inclusive. |
| I5 | No color literal exists outside `color.manifest.ts`. |
| I6 | No raw length in authored CSS or class strings except the allowlist: `0`, `1px`, `2px` (border widths), `100%`. |
| I7 | No Tailwind arbitrary value `[...]` in authored source, except `w-[min(19rem,84vw)]` on the drawer, which is itself emitted from `primitive.drawer.width`. |
| I8 | Every primitive variant touches only the token groups its capability allowlist declares. |
| I9 | Every section slot references a primitive that exists in `primitive.manifest.ts`. |
| I10 | Every list-bearing section declares an `emptyKey`, present in **both** locale catalogs. |
| I11 | Every status/trust state declares token **and** icon **and** label key. Color-only is unrepresentable. |
| I12 | Every emitted transition, animation and `scroll-behavior` sits inside `@media (prefers-reduced-motion: no-preference)`. |
| I13 | Every section carrying `content-visibility: auto` declares a measured `containIntrinsic` height per tier. |
| I14 | `design:gen` is deterministic: two runs are byte-identical, and the committed output matches a fresh run. |
| I15 | The font subset covers every codepoint used by both locale catalogs plus the UI glyph set (`→ × + − ·`). A missing glyph fails the build. |
| I16 | **Grid identity**, per tier, to 0.01px: `inner === cols × track + (cols − 1) × gutter`, and every published span width equals `n × track + (n − 1) × gutter`. |
| I17 | Every interactive primitive declares a minimum target of ≥44px in both axes at every tier. |
| I18 | Every heading role's solved font size, at every reference width, keeps the h1 at ≤4 rendered lines (asserted later by Gate 13 against the fixture the generator emits). |

---

## Phase 2: Color Module and Generated Tokens

Light is the default. The manifest holds **roles**, not hexes-in-place, plus the pair list that must hold.

```ts
// src/design/color.manifest.ts
export const color = {
  roles: {
    'bg-canvas':        { light: '#F5F3EF', dark: '#121212' },
    'bg-surface':       { light: '#FFFFFF', dark: '#1A1A1A' },
    'bg-brand':         { light: '#111111', dark: '#F5F3EF' },
    'text-ink':         { light: '#111111', dark: '#F5F3EF' },
    'text-ink-secondary':{ light: '#4F4F4F', dark: '#A8A8A8' },
    'text-on-primary':  { light: '#FFFFFF', dark: '#111111' },
    'border-line':      { light: '#E5E2DC', dark: '#2E2E2E' },
    'border-strong':    { light: '#8A8780', dark: '#7A7A7A' },
    'focus-ring':       { light: '#111111', dark: '#F5F3EF' },
    'status-ok':        { light: '#1B5E20', dark: '#7FD38A' },
    'status-warn':      { light: '#6B4200', dark: '#F2B84B' },  // v4.0: darkened
    'status-error':     { light: '#8A1C1C', dark: '#FF8A80' },
    'status-info':      { light: '#1F4E8C', dark: '#8AB4F8' },
    'series-1':         { light: '#0B5FA5', dark: '#7DB7F0' },
    'series-2':         { light: '#B34700', dark: '#F0A06A' },
    'series-3':         { light: '#2E7D32', dark: '#7FD38A' },
    'series-4':         { light: '#6A1B9A', dark: '#C79AE8' },
  },
  // interaction derivations: generator mixes and then re-checks the pair list
  states: {
    hover:    { mix: 'text-ink', amount: 0.06 },
    active:   { mix: 'text-ink', amount: 0.12 },
    selected: { mix: 'status-info', amount: 0.10 },
    disabled: { opacity: 0.55, requires: { ratio: 3.0, plusNonColorCue: true } },
  },
  pairs: [
    { fg: 'text-ink',           bg: ['bg-canvas', 'bg-surface'], min: 7.0, kind: 'text' },
    { fg: 'text-ink-secondary', bg: ['bg-canvas', 'bg-surface'], min: 7.0, kind: 'text' },
    { fg: 'text-on-primary',    bg: ['bg-brand'],                min: 7.0, kind: 'text' },
    { fg: 'status-ok',          bg: ['bg-canvas', 'bg-surface'], min: 7.0, kind: 'text' },
    { fg: 'status-warn',        bg: ['bg-canvas', 'bg-surface'], min: 7.0, kind: 'text' },
    { fg: 'status-error',       bg: ['bg-canvas', 'bg-surface'], min: 7.0, kind: 'text' },
    { fg: 'status-info',        bg: ['bg-canvas', 'bg-surface'], min: 7.0, kind: 'text' },
    { fg: 'border-strong',      bg: ['bg-canvas', 'bg-surface'], min: 3.0, kind: 'ui' },
    { fg: 'focus-ring',         bg: ['bg-canvas', 'bg-surface'], min: 3.0, kind: 'ui' },
    { fg: 'series-1',           bg: ['bg-canvas', 'bg-surface'], min: 3.0, kind: 'ui' },
    { fg: 'series-2',           bg: ['bg-canvas', 'bg-surface'], min: 3.0, kind: 'ui' },
    { fg: 'series-3',           bg: ['bg-canvas', 'bg-surface'], min: 3.0, kind: 'ui' },
    { fg: 'series-4',           bg: ['bg-canvas', 'bg-surface'], min: 3.0, kind: 'ui' },
  ],
} as const;
```

**Generated** (`src/generated/tokens.generated.css`) — shape only; values come from the manifest:

```css
:root {
  /* roles, light */
  --bg-canvas: #F5F3EF; /* ... */
  --text-ink-secondary: #4F4F4F;           /* 7.39:1 on canvas, 7.87:1 on surface */
  --status-warn: #6B4200;                  /* 7.88:1 on canvas, 8.73:1 on surface */
  /* interaction derivations */
  --control-hover: color-mix(in oklab, var(--bg-surface), var(--text-ink) 6%);
  --control-active: color-mix(in oklab, var(--bg-surface), var(--text-ink) 12%);
  --selection-bg: color-mix(in oklab, var(--bg-canvas), var(--status-info) 18%);
  --caret: var(--text-ink);
  /* z-index scale — the only legal layers */
  --z-base: 0; --z-sticky: 10; --z-drawer: 40; --z-toast: 50;
  color-scheme: light dark;
}
:root[data-theme='dark'] { /* dark map */ }
/* generated from the dark map, scoped so an explicit light choice wins */
@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { /* dark map */ } }

@media (prefers-contrast: more) {
  :root { --border-line: var(--border-strong); }
  .card, .field { border-width: 2px; border-style: solid; }
}
@media (forced-colors: active) { .btn, .field, .card { border: 1px solid CanvasText; } }
@media (prefers-reduced-transparency: reduce) { :root { --scrim-opacity: 1; } }

::selection { background: var(--selection-bg); color: var(--text-ink); }
:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }
:target, [id] { scroll-margin-block-start: calc(var(--header-h) + var(--space-3)); }
```

- A hashed inline `<head>` script (**≤0.6KB**) sets `data-theme` from `localStorage` before paint, in `try/catch`. Its SHA-256 is written into the CSP by the same generator run — never copied by hand.
- Status is never color-only (I11): icon + text label + status token, always all three.
- Chart series are dual-encoded: dash pattern or marker shape in addition to hue.
- `prefers-color-scheme` block is generated from the dark map. Hand-duplicating it is a lint error.

---

## Phase 3: Type Module (slot-aware) and Font Budget (80KB)

### 3.1 Delivery

| Role | Font | Delivery |
| --- | --- | --- |
| Headings, prose | Newsreader roman, wght 400–600, `opsz` pinned | Self-hosted WOFF2, Latin subset |
| UI, body | Inter, wght 400–600, `opsz` dropped | Self-hosted WOFF2, Latin subset |
| Meta, code | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` | System only |
| Bangla | `'Noto Sans Bengali', 'Kalpurush', system-ui, sans-serif` | System only, no web font |

- Trim axes with fonttools `instancer`, then subset with `pyftsubset`. Ranges: `U+0020-007E, U+00A0-00FF, U+2013-2014, U+2018-201D, U+2022, U+2026, U+2190-2193, U+00D7, U+002B, U+2212`.
- If the two files exceed **80KB** combined, replace variable files with static 400 and 600 instances. Do not drop the glyph set (I15).
- `font-display: swap` plus a metric-matched fallback (`size-adjust`, `ascent-override`, `descent-override`) so the swap shifts nothing. Preload exactly the two critical files.

### 3.2 Slot-aware scale (the v4.0 change)

Type does not scale with the window; it scales with **the slot it occupies**, which the section manifest already knows. The generator solves a `cqi` coefficient per tier from that tier's slot width.

```ts
// src/design/type.manifest.ts
export const type_ = {
  roles: {
    h1:   { slot: 'hero.text', font: 'serif', weight: 600, lh: 1.10, measureCh: 24,
            targets: { xs: 32, md: 44, lg: 41, xl: 52 }, min: 32, max: 52 },
    h2:   { slot: 'section.head', font: 'serif', weight: 600, lh: 1.20, measureCh: 32,
            targets: { xs: 24, md: 30, lg: 30, xl: 32 }, min: 24, max: 32 },
    h3:   { slot: 'card', font: 'serif', weight: 600, lh: 1.25, measureCh: 34,
            targets: { xs: 20, md: 22, lg: 22, xl: 24 }, min: 20, max: 24 },
    body: { slot: 'prose', font: 'sans', weight: 400, lh: 1.65, measureCh: 68, fixed: 16 },
    meta: { slot: 'prose', font: 'mono', weight: 400, lh: 1.45, measureCh: 60, fixed: 13 },
    input:{ slot: 'field', font: 'sans', weight: 400, lh: 1.40, measureCh: 60, fixed: 16 },
  },
} as const;
```

Generated per tier, inside that tier's media query:

```css
/* xl: hero.text measures 483.33px -> 52 / 483.33 = 10.76cqi */
@media (min-width: 1280px) { .t-h1 { font-size: clamp(2rem, 10.76cqi, 3.25rem); } }
/* lg: hero.text measures 381.33px -> 41 / 381.33 = 10.75cqi */
@media (min-width: 1024px) { .t-h1 { font-size: clamp(2rem, 10.75cqi, 2.5625rem); } }
/* md: hero.text measures 720px (single column) -> 44 / 720 = 6.11cqi */
@media (min-width: 768px)  { .t-h1 { font-size: clamp(2rem, 6.11cqi, 2.75rem); } }
.t-h1 { font-size: clamp(2rem, 8.94cqi, 2rem); max-inline-size: 24ch; }  /* xs, 358px */
```

Note the non-monotonic target: **md 44px → lg 41px**, because the hero text column *narrows* when the layout goes from 1 column at 720px to 5/12 at 381px. A viewport-based `clamp` cannot express that; this is the reason type belongs in the same manifest as the grid. Every role also emits `max-inline-size` from `measureCh` (I4). `input` is pinned at 16px to prevent iOS zoom.

- Bangla: no synthetic bold or italic, no ellipsis truncation, `text-transform: none` (juktakkhor ligatures), body `line-height: 1.7`, headings 1.35.

---

## Phase 4: Space, Radius, Border, Motion

```ts
// src/design/space.manifest.ts
export const space = {
  base: 4,
  steps: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80 },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
  border: { hair: 1, strong: 2 },
  target: { min: 44 },         // I17
  header:  { height: 64 },
  section: { gapY: { xs: 48, md: 56, lg: 72, xl: 80 } },
} as const;
```

```ts
// src/design/motion.manifest.ts
export const motion = {
  duration: { fast: 120, base: 180, slow: 260 },
  easing: { standard: 'cubic-bezier(.2,0,0,1)', exit: 'cubic-bezier(.4,0,1,1)' },
  allowed: ['opacity', 'transform'],   // generator refuses layout-affecting properties
} as const;
```

Generated motion CSS is emitted **only** inside `@media (prefers-reduced-motion: no-preference)` (I12), including `scroll-behavior` and any `scroll-snap`. Transitions on properties outside `allowed` are a build failure, which keeps CLS structurally impossible from animation.

---

## Phase 5: Breakpoint and Grid Modules

### 5.1 Device matrix (mobile-first, `min-width` only) — generated table

| Tier | Range | Reference devices | Cols | Gutter | Margin | Inner width | Track |
| --- | --- | --- | --- | --- | --- | --- | --- |
| xs | 320–767 | 320 small phone, 390 phone, 600 large phone / unfolded foldable | 1 | 20 | 16 | 288 / 358 / 568 | = inner |
| md | 768–1023 | 768 tablet portrait | 2 | 24 | 24 | 720 | 348 |
| lg | 1024–1279 | 1024 tablet landscape, small laptop | 12 | 32 | 32 | 960 | 50.67 |
| xl | 1280–1535 | 1280 laptop, desktop | 12 | 40 | 32 | 1216 | 64.67 |
| 2xl | 1536+ | 1536, 1920, ultrawide | 12 | 40 | auto | 1216 (outer 1280, centered) | 64.67 |

`lg` keeps the 32px gutter from v3.3: at 1024 with a 40px gutter the track falls to 43.33px and the 5/7 hero split becomes unreadable. Derivation, checked by I16: `(960 − 11 × 32) / 12 = 50.6667`.

### 5.2 Grid engine (width computed, never padded)

```css
.grid {
  --cols: 1; --gap: 20px; --pad: 16px;
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: var(--gap);
  width: min(100% - 2 * var(--pad), 1216px);
  margin-inline: auto;
}
@media (min-width: 768px)  { .grid { --cols: 2;  --gap: 24px; --pad: 24px; } }
@media (min-width: 1024px) { .grid { --cols: 12; --gap: 32px; --pad: 32px; } }
@media (min-width: 1280px) { .grid { --gap: 40px; } }
```

- Safe areas: `padding-inline: max(0px, env(safe-area-inset-left)) max(0px, env(safe-area-inset-right))` on the page shell; `viewport-fit=cover` in the viewport meta.
- Use `dvh`, never `vh`. Landscape phones (`orientation: landscape and (max-height: 480px)`): header not sticky, hero visual capped at 60dvh.
- Foldables: `@media (horizontal-viewport-segments: 2)` confines the grid to the first segment; nothing renders across the fold.
- All insets, margins and floats use **logical properties** (`padding-inline`, `margin-block`, `inset-inline-start`) so a future RTL locale needs no new CSS.

### 5.3 Layout module (spans)

```ts
// src/design/layout.manifest.ts
export const layout = {
  hero:      { text: [1, 2, 5],  visual: [1, 2, 7] },
  writing:   { lead: [1, 2, 7],  list:   [1, 2, 5] },
  topics:    { cards: [[1], [1, 1, 2], [4, 4, 4]] },
  figure:    { frame: [1, 2, 6], notes:  [1, 2, 6] },
  datasets:  { cards: [[1], [1, 1, 2], [4, 4, 4]] },
  assistant: { prompt: [1, 2, 7], links: [1, 2, 5] },
  author:    { bio: [1, 2, 8],   meta:   [1, 2, 4] },
  faq:       { body: [1, 2, { span: 8, start: 3, maxInline: 720 }] },
  dispatch:  { body: [1, 2, { span: 8, start: 3, maxInline: 720 }] },
  footer:    { brand: [1, 2, 5], nav: [1, 1, 4], feed: [1, 1, 3] },
} as const; // tuple order: [xs, md, lg and up]; card arrays list one row per tier
```

Generator emits only `grid-column` span/start declarations plus `max-inline-size`, and refuses any slot missing an `xs` value (I1) or any row over-spanning its tier (I2).

### 5.4 Span map — generated

| Section | Slot | xs (1 col) | md (2 col) | lg / xl / 2xl (12 col) |
| --- | --- | --- | --- | --- |
| 1 Hero | Text / Visual | 1 / 1 (stacked, text first) | 2 / 2 (stacked) | 5 / 7 |
| 2 Writing | Lead / List | 1 / 1 | 2 / 2 | 7 / 5 |
| 3 Topics | Cards ×3 | 1,1,1 | 1,1,2 | 4,4,4 |
| 4 Figure Lab | Frame / Notes | 1 / 1 | 2 / 2 | 6 / 6 |
| 5 Datasets | Cards ×3 | 1,1,1 | 1,1,2 | 4,4,4 |
| 6 Assistant | Prompt / Links | 1 / 1 | 2 / 2 | 7 / 5 |
| 7 Author | Bio / Meta | 1 / 1 | 2 / 2 | 8 / 4 |
| 8 FAQ, 9 Dispatch | Body | 1 | 2 (720 max) | 8, starts col 3 (720 max) |
| 10 Footer | Brand / Nav / Feed | 1,1,1 | 2,1,1 | 5 / 4 / 3 |

### 5.5 Expected span widths — generated, and the fixture Gate 4 reads

Formula `n × T + (n − 1) × G`, tolerance ±0.5px. **v4.0 corrects lg span 3.**

| Span | xl / 2xl (T 64.67, G 40) | lg (T 50.67, G 32) |
| --- | --- | --- |
| 1 | 64.67 | 50.67 |
| 2 | 169.33 | 133.33 |
| 3 | 274.00 | **216.00** *(v3.3 printed 237.33)* |
| 4 | 378.67 | 298.67 |
| 5 | 483.33 | 381.33 |
| 6 | 588.00 | 464.00 |
| 7 | 692.67 | 546.67 |
| 8 | 797.33 | 629.33 |
| 9 | 902.00 | 712.00 |
| 10 | 1006.67 | 794.67 |
| 11 | 1111.33 | 877.33 |
| 12 | 1216.00 | 960.00 |

md 768: one track 348, full span 720. xs: inner 288 at 320, 358 at 390, 568 at 600.

---

## Phase 6: Primitive Module (variants as data)

Every section is built **only** from these. Each primitive declares its variants, its minimum target, its token capability allowlist (I8), and its accessibility contract — from which the generator emits both CSS and an a11y test matrix.

```ts
// src/design/primitive.manifest.ts
export const primitive = {
  frame:   { ratio: '16 / 9', radius: 'xl', border: 'hair', tokens: ['border', 'bg'],
             a11y: { requires: ['width', 'height', 'alt'] } },
  card:    { bg: 'bg-surface', border: 'hair', radius: 'xl', pad: { default: 6, prompt: 5 },
             container: 'inline-size', tokens: ['bg', 'border', 'text'] },
  row:     { minH: 44, borderBlockEnd: 'hair', tokens: ['border', 'text'] },
  control: { shape: 'pill', minH: 44, variants: {
               primary:   { bg: 'bg-brand', fg: 'text-on-primary' },
               secondary: { bg: 'bg-surface', fg: 'text-ink', border: 'strong' },
             },
             states: ['hover', 'active', 'focus-visible', 'disabled'],
             tokens: ['bg', 'border', 'text', 'state'],
             a11y: { requires: ['accessible-name'] } },
  field:   { bg: 'bg-canvas', border: 'strong', minH: 44, fontRole: 'input',
             a11y: { requires: ['visible-label', 'describedby-on-error'] } },
  disclosure: { element: 'details', marker: 'none', sign: { closed: '+', open: '−' },
                pad: { block: 4 }, borderBlockEnd: 'hair' },
  drawer:  { element: 'dialog', width: 'min(19rem, 84vw)', side: 'inline-end',
             a11y: { requires: ['modal', 'escape-close', 'focus-return'] } },
} as const;
```

- Component internals respond to **their container** (`@container`), never the viewport. A Card must be correct at 274px and at 378.67px without a new rule.
- Generated classes carry `data-slot` and `data-span-<tier>` attributes so Gates 4, 8 and 14 can read structure out of the live DOM rather than trusting a screenshot.

---

## Phase 7: Section Composition and Generated Wireframes

Sections are declared, not drawn. `section.manifest.ts` fixes order, slot tree, content contract, empty-state key and measured intrinsic height; `docs/WIREFRAMES.generated.md` is emitted from it.

```ts
// src/design/section.manifest.ts
export const section = [
  { id: 'S0',  key: 'header',    slots: [{ brand: 'text' }, { search: 'control' }, { menu: 'drawer' }],
    sticky: { except: 'landscape-phone' } },
  { id: 'S1',  key: 'hero',      slots: [{ text: ['h1', 'meta', 'control'] }, { visual: 'frame' }] },
  { id: 'S2',  key: 'writing',   slots: [{ lead: 'card' }, { list: 'row[]' }],
    emptyKey: 'writing.empty', containIntrinsic: { xs: 980, md: 760, lg: 620, xl: 640 } },
  { id: 'S3',  key: 'topics',    slots: [{ cards: 'card[3]' }], emptyKey: 'topics.empty' },
  { id: 'S4',  key: 'figure',    slots: [{ frame: 'frame' }, { notes: ['control', 'range', 'live'] }],
    lazy: { via: 'intersection', rootMargin: 200 } },
  { id: 'S5',  key: 'datasets',  slots: [{ cards: 'card[3]' }], emptyKey: 'datasets.empty' },
  { id: 'S6',  key: 'assistant', slots: [{ prompt: ['field', 'control'] }, { links: 'row[]' }] },
  { id: 'S7',  key: 'author',    slots: [{ bio: 'prose' }, { meta: 'row[]' }] },
  { id: 'S8',  key: 'faq',       slots: [{ body: 'disclosure[]' }] },
  { id: 'S9',  key: 'dispatch',  slots: [{ body: ['field', 'field', 'control'] }] },
  { id: 'S10', key: 'footer',    slots: [{ brand: 'prose' }, { nav: 'row[]' }, { feed: 'row[]' }] },
] as const;
```

> The three wireframes below are a **generated artifact** (`docs/WIREFRAMES.generated.md`). Do not hand-edit; change the manifest and regenerate.

Legend: `S#` = section, `▢` Card, `▭` Frame (16:9), `═` interactive, `─` Row separator.

### 7.1 Phone, xs (reference 390, 1 column, inner 358)

```
┌─ 390 · 1 col · inner 358 ──┐
│ ▣ reme          ⌕    ☰     │ S0  h-16
├────────────────────────────┤
│ H1 (2–3 lines, 32px)       │ S1
│ meta · mono · secondary    │
│ [ CTA, full width ]        │
│ ▭ 16:9 hero  358×201       │
├────────────────────────────┤
│ ▭ lead cover + title       │ S2
│ ─ dispatch row ─────────── │
│ ─ dispatch row ─────────── │
├────────────────────────────┤
│ ▢ topic                    │ S3
│ ▢ topic                    │
│ ▢ topic                    │
├────────────────────────────┤
│ ▭ figure                   │ S4
│ (▶ primary)(secondary)     │
│ ──●──────── slider         │
│ readout  aria-live         │
├────────────────────────────┤
│ ▢ dataset / ▢ method /     │ S5
│ ▢ citation                 │
├────────────────────────────┤
│ ▢ prompt textarea          │ S6
│ [ Open assistant → ]       │
│ ─ quick link rows ──────── │
├────────────────────────────┤
│ bio, then system meta      │ S7
│ FAQ  + rows                │ S8
│ [ email field ]            │ S9
│ [ Send, full width ]       │
│ footer: brand, nav, feed   │ S10
└────────────────────────────┘
```

**320 deltas:** inner 288; drawer `min(19rem, 84vw)` = 269px; control pills wrap to two rows; zero horizontal scroll; content reflows at 400% zoom. **600 deltas:** single column at 568; `sizes` selects a wider source; Rows hold 44px.

### 7.2 Tablet portrait, md (reference 768, 2 columns, inner 720, track 348)

```
┌──────────── 768 · 2 col · inner 720 ───────────────┐
│ ▣ reme                        ⌕          ☰         │ S0  drawer nav below 1024
├────────────────────────────────────────────────────┤
│ H1 (44px, measure 24ch)                 (span 2)   │ S1
│ meta · [ CTA ]                                     │
│ ▭ 16:9 hero  720×405                    (span 2)   │
├────────────────────────────────────────────────────┤
│ ▭ lead card                             (span 2)   │ S2
│ ─ dispatch list ─────────────────────── (span 2)   │
├─────────────────────────┬──────────────────────────┤
│ ▢ topic 1   348         │ ▢ topic 2   348          │ S3
├─────────────────────────┴──────────────────────────┤
│ ▢ topic 3                               (span 2)   │
├────────────────────────────────────────────────────┤
│ ▭ figure                                (span 2)   │ S4
│ notes + controls                        (span 2)   │
├─────────────────────────┬──────────────────────────┤
│ ▢ dataset               │ ▢ method                 │ S5
├─────────────────────────┴──────────────────────────┤
│ ▢ citation                              (span 2)   │
├────────────────────────────────────────────────────┤
│ ▢ prompt box                            (span 2)   │ S6
│ quick links                             (span 2)   │
├────────────────────────────────────────────────────┤
│ bio (span 2) · system meta (span 2)                │ S7
│ FAQ, 720 max                                       │ S8
│ Dispatch form: [ email ][ Send ]                   │ S9
│ footer: brand (2) · nav (1) · feed (1)             │ S10
└────────────────────────────────────────────────────┘
```

### 7.3 Desktop, lg and xl (reference 1280, 12 columns, T 64.67, G 40)

```
   1  2  3  4  5  6  7  8  9  10 11 12
┌────────────────────────────────────────────────────────┐
│ ▣ reme   Writing  Topics  Lab  Data        ⌕   ◐       │ S0  links inline from 1024
├───────────────────┬────────────────────────────────────┤
│ H1 (52px / 483)   │ ▭ 16:9 hero  693×390               │ S1  5 + 7
│ meta  [ CTA ]     │                                    │
├───────────────────┴──────────────┬─────────────────────┤
│ ▭ lead card (cols 1–7)           │ ─ dispatch list     │ S2  7 + 5
│   title · meta · summary         │ ─ ─ ─ ─ ─ ─ ─       │
│   Read article →                 │ (cols 8–12)         │
├──────────────┬───────────────────┼─────────────────────┤
│ ▢ topic 379  │ ▢ topic 379       │ ▢ topic 379         │ S3  4 + 4 + 4
├──────────────┴───────────────────┼─────────────────────┤
│ ▭ figure chrome (cols 1–6)       │ notes + controls    │ S4  6 + 6
│   SVG or Canvas 2D, lazy         │ ▶ pill  ◻ pill      │
│                                  │ ──●── slider        │
├──────────────┬───────────────────┼─────────────────────┤
│ ▢ dataset    │ ▢ method          │ ▢ citation / DOI    │ S5  4 + 4 + 4
├──────────────┴───────────────────┼─────────────────────┤
│ ▢ prompt box + textarea  (1–7)   │ quick links (8–12)  │ S6  7 + 5
├──────────────────────────────────┴──────┬──────────────┤
│ bio and principles   (cols 1–8)         │ system meta  │ S7  8 + 4
├────────┬────────────────────────────────┴───┬──────────┤
│        │ FAQ  details  (cols 3–10, 720)     │          │ S8
│        │ Dispatch form (cols 3–10, 720)     │          │ S9
├────────┴──────┬──────────────────┬──────────┴──────────┤
│ brand + note  │ nav · lab        │ feed · theme        │ S10  5 + 4 + 3
└───────────────┴──────────────────┴─────────────────────┘
```

**1024 deltas (lg):** gutter 32, tracks 50.67, hero text column 381.33px, h1 solves to 41px; Gate 13 asserts ≤4 lines. Header shows inline links from 1024 up. **2xl deltas (1536+):** outer container capped at 1280, canvas bleeds to the edges, type never exceeds its `clamp` maximum, hero visual never exceeds 692.67px.

---

## Phase 8: Component Specifications (S0–S10)

Each entry below is the **behavioral** contract; all geometry, color, type and motion come from the manifest.

**S0 Header and nav.** `h-16` from `space.header.height`, sticky except landscape phones. Below 1024: brand, search, menu trigger; theme toggle lives inside the drawer. From 1024: brand inline-start; links, search, theme inline-end. Drawer is a native `<dialog>` opened with `showModal()` — free focus trap, Escape to close, inert background, no portal. Focus returns to the trigger on close. Slide animation only under `prefers-reduced-motion: no-preference`. No-JS: nav links render inline and wrap. Search: static index built at build time, fetched same-origin on first focus; no-JS fallback is a link to the archive page.

**S1 Hero.** h1 (serif, slot-solved), mono meta, primary Control. Visual: `<picture>` AVIF then WebP, intrinsic 1200×675, `srcset` 480/800/1200, `sizes='(min-width:1280px) 693px, (min-width:1024px) 547px, 100vw'`, `fetchpriority='high'`, `loading='eager'`. No text inside artwork.

**S2 Recent writing.** Lead Card: 16:9 cover, title, meta, 1–2 line summary, 'Read article →'. Dispatch list: chronological Rows. Empty state is text: 'No articles published yet.'

**S3 Topics.** Card: title, build-time computed count (mono), one-line scope note. Counts come from content collections. Empty: 'No topics defined yet.'

**S4 Figure Lab.** SVG or Canvas 2D only; no WebGL, no D3. Module **≤15KB gzip**, hydrated lazily via IntersectionObserver (`rootMargin: 200px`). Controls: primary pill, secondary pill, native `<input type='range'>` with a visible label. Readout is `aria-live='polite'` and throttled. A text or table alternative is always present in the DOM, not behind a toggle. No autoplay under `prefers-reduced-motion: reduce`. No-JS: static SVG snapshot.

**S5 Datasets, reproducibility, citation.** Three Cards: Dataset/Artifact, Method/Verification, Citation/DOI. Trust states Verified / Pending / Unavailable, each icon + text + status token (I11). Empty: 'No datasets published yet.'

**S6 Research assistant entry.** Prompt Field + 'Open assistant →'. In order:

1. The assistant runs **on-device only** (WebGPU, or WASM with `SharedArrayBuffer`; model ≤150MB, same-origin, cached in Cache Storage under an explicit version key). The model loads only after an explicit user click. There is no cloud fallback.
2. Capability probe on load. Pass → 'Queries processed locally. No data transmitted.' Fail → 'The local assistant is unavailable on this device. Search the archive instead.' plus a link to search. The privacy line never renders unless the local path is live.
3. The query is handed to `/assistant/` through `sessionStorage`, never the URL — nothing in history, nothing in `Referer`. Without JS the button is a plain link.
4. Threaded WASM requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`; because every asset is same-origin, this costs nothing. Verify in Gate 7 that `crossOriginIsolated === true`.

**S7 Author and provenance.** Bio and principles (8 cols); system meta (4 cols): build version, last updated, license, source repository link.

**S8 FAQ.** Native `<details>`/`<summary>`, zero-JS accordion. Markers hidden via `list-style: none` and `summary::-webkit-details-marker { display: none }`; `+` / `−` via `::after` from `primitive.disclosure.sign`.

**S9 Dispatch and collaboration.** Native `<form method='post' action='/api/dispatch'>`: labeled email Field, message Field, 'Send' Control. The endpoint is a first-party serverless function forwarding to the owner's inbox; it sets no cookies, persists nothing, and rate-limits in memory. Honeypot field instead of a third-party CAPTCHA. Success and error render in an `aria-live` region **and** work server-side (redirect to `/dispatch/thanks/`). Copy: 'Your message goes only to the site owner. No tracking, no third-party analytics.'

**S10 Footer.** `border-block-start` hairline, `bg-canvas`, 44px targets; brand + note, nav + lab links, RSS feed + theme link.

---

## Phase 9: Localization (en, bn)

- Static routes `/en/` and `/bn/`; `<html lang>` per page; `hreflang` alternates; the language switch is plain links that preserve the current path.
- Both locale catalogs are typed against one key union — a key present in one and missing in the other fails the build (I10).

```css
:lang(bn) {
  font-family: 'Noto Sans Bengali', 'Kalpurush', system-ui, sans-serif;
  letter-spacing: 0;
  text-transform: none;   /* required for juktakkhor ligatures */
  hyphens: none;
  line-height: 1.7;
}
:lang(bn) :is(h1, h2, h3) { line-height: 1.35; font-family: inherit; }
```

- Bangla headings use the sans stack (Newsreader carries no Bengali glyphs). No synthetic italics or bold, no ellipsis truncation on Bangla strings.
- Test with juktakkhor-heavy strings on Android, iOS and Windows.

---

## Phase 10: Performance, Accessibility, Privacy

- **Images:** AVIF primary, WebP fallback, max 1200px wide, **≤100KB each**, explicit dimensions on every image, `loading='lazy'` except the hero.
- **Rendering:** `content-visibility: auto` on S2–S9, always paired with `contain-intrinsic-size: auto <measured>px` from `section.containIntrinsic` (I13), measured per tier so off-screen sections never collapse.
- **Motion:** every transition authored inside `@media (prefers-reduced-motion: no-preference)`; no scroll-snap or smooth scroll outside it.
- **JS budget** (gzip or brotli; *initial* = bytes fetched before the load event): theme 0.6KB, drawer 2.5KB, assistant entry 3KB, search loader 2KB, Figure Lab 15KB (lazy). **Initial total ≤50KB.** Search index and assistant model are lazy and excluded.
- **Response headers:**

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-<theme-hash>';
  style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self';
  worker-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none';
  form-action 'self'; frame-ancestors 'none'
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Cache-Control: public, max-age=31536000, immutable      # hashed assets only
```

No cookies are set, ever. The theme-script hash is written by the generator, not by hand.

- **A11y:** skip link; landmarks; exactly one h1; `:focus-visible` everywhere; 44px targets; WCAG 1.4.10 reflow at 320 CSS px; text-spacing override survivable; forced-colors supported; `scroll-margin` clears the sticky header for every anchor target.
- **SEO:** title, meta description, canonical, Open Graph image (PNG fallback ≤100KB), JSON-LD for site and articles, `sitemap.xml`, `robots.txt`.
- **Print:** a generated print sheet — canvas white, hairlines black, drawer and controls hidden, link URLs appended after anchors.

---

## Phase 11: Quality Gates (all automated unless marked)

| # | Gate | Method | Pass criterion |
| --- | --- | --- | --- |
| 1 | Payload | `audit:payload` | JS ≤50KB initial, fonts ≤80KB, Figure Lab ≤15KB, each image ≤100KB |
| 2 | Lighthouse | Mobile profile, 4G throttle, median of 5 | Performance ≥95; Accessibility, Best Practices, SEO = 100 |
| 3 | CLS | Lighthouse + Playwright at 320/390/600/768/1024/1280/1536 | <0.05, including font swap and `content-visibility` |
| 4 | Grid geometry | Playwright bounding boxes vs `fixtures/geometry.json` | ±0.5px at 390, 768, 1024, 1280, 1536 |
| 5 | Overflow | `scrollWidth ≤ clientWidth` at every width 320–1920 and at 400% zoom | Zero horizontal scroll |
| 6 | Contrast | Generator-computed pair list, re-verified against rendered DOM in light / dark / more | Text ≥7:1, non-text ≥3:1, **on canvas and on surface** |
| 7 | Privacy | Playwright network log across load, search, assistant, form | Zero cross-origin requests; zero CSP violations; zero cookies; no request carries query text outside the form POST; `crossOriginIsolated === true` |
| 8 | Visual regression | Screenshots at 7 widths × light/dark × en/bn | Section order and spans match `fixtures/sections.json` |
| 9 | Empty states | Render S2, S3, S5 with empty data | Text empty states, no skeletons, no collapsed height |
| 10 | **Generator determinism** | `design:verify` | Regenerated output byte-identical to committed `src/generated/**` |
| 11 | **Token escape lint** | `design:lint` over authored source | Zero raw colors, zero raw lengths outside the I6 allowlist, zero `[...]` arbitraries outside the drawer |
| 12 | **Manifest coverage** | Playwright reads `data-slot` from the live DOM | Every manifest slot renders exactly once per page; no undeclared slot exists |
| 13 | **Heading wrap** | Playwright line-box count at all 7 widths, both locales | h1 ≤4 lines, h2 ≤3; measured font size within ±0.5px of `fixtures/type.json` |
| 14 | **Primitive conformance** | Axe + target-size probe per primitive instance | All interactive instances ≥44×44, named, and reachable |
| 15 | **Glyph coverage** | Subset check against both locale catalogs + UI glyphs | Zero `.notdef`; `→ × + − ·` present |
| 16 | **Motion containment** | AST scan of emitted CSS | Zero transitions, animations or `scroll-behavior` outside `no-preference`; zero animated layout properties |
| 17 | Devices (manual) | iOS Safari, Android Chrome, Firefox, desktop Safari; foldable and landscape emulation; Bangla on Android, iOS, Windows | No layout or glyph defects |
| 18 | Assistive tech (manual) | Keyboard-only and screen reader pass on drawer, figure, FAQ, form | All reachable and correctly announced |
| 19 | No-JS (manual + Playwright with JS disabled) | Load every route | Nav, FAQ, form, figure snapshot and assistant link all work |

Report every gate as **measured value vs threshold**. Fix failures. Never relax a threshold.

---

## Phase 12: Execution Order

1. Init Astro; write the nine manifests and their Zod schemas; implement `design:gen`, `design:verify`, `design:lint`.
2. Generate tokens, theme script + its CSP hash, and response headers. Prove Gates 6, 10, 11.
3. Font pipeline (instancer → subset → fallback metrics); prove Gates 1 and 15.
4. Grid engine, layout module, geometry and type fixtures; prove Gates 4 and 16 **before any section exists**.
5. Primitives: Frame, Card, Row, Control, Field, Disclosure, Drawer; prove Gate 14.
6. S0 header and drawer.
7. S1 hero and the image pipeline; prove Gates 3 and 13.
8. S2, S3 with empty states; prove Gate 9.
9. S5, S6 (capability probe, isolation check, handoff), S7.
10. S8, S9 (form endpoint), S10.
11. S4 Figure Lab (lazy, ≤15KB).
12. Localization (`/bn/`) and Bangla verification.
13. Run every gate; publish the measured-value report.

**Open decisions to confirm before step 9:** the on-device model for the assistant (and whether it needs WebGPU or threaded WASM), the inbox `/api/dispatch` forwards to, and the host that will serve the Phase 10 headers.
