# UI/UX Audit — frontend, generative assistant, figure library, and layout system

**Date:** 2026-11-25 · **Auditor:** Arena agent, running the `impeccable` skill
(v4.11.0, installed to `.agents/skills/impeccable/` this session) · **Scope:** the
entire frontend — home, blog, article, tags, assistant, figure lab, search,
drawer/header/footer chrome, the generative figure library
(`components/library/` + `lib/figures/`), and the assistant thread UX
(`components/assistant/`).

**Run provenance (per the skill's own invariants).** The impeccable engine
binary could not be downloaded in this sandbox
(`release-assets.githubusercontent.com` is outside the network allowlist), so
`impeccable context`, the bundled detector, and screenshot verification did not
run. Per the skill's launcher-unavailable clause this audit reads the project
context directly (`DESIGN.md`; no `PRODUCT.md` exists — none was invented) and
replicates the detector's deterministic checks with source scans plus the built
HTML. Assessment A (design review) ran inline in this context, so this report
is a **degraded single-context run**: `⚠️ DEGRADED: single-context (sub-agent
tool unavailable; engine download blocked)`. What stayed untested: synthesized
touch gestures in a real browser, runtime pixel contrast reads (token pairs
*are* CI-checked by `tokens:check`), and rendered screenshots.

**Modes applied** (skill §Modes): article/blog/tags = **Read**; assistant, lab,
search, drawer = **Operate**; home = Read with a Persuade first viewport.

---

## Audit Health Score

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 4/4 | WCAG AA enforced by `tokens:check` in CI; header icon buttons are 40 px targets (passes AA's 24 px, below the 44 px ideal) |
| 2 | Performance | 3/4 | Article JS 19 KB page-specific (CI-asserted); `/lab` loads the whole registry client-side and no gate measures its budget |
| 3 | Theming | 3/4 | Full token authority with dual themes; the code-panel syntax palette is pinned hex (`#10141B`, `#82aaff`…) outside tokens and undocumented in DESIGN.md's literals clause |
| 4 | Responsive | 3/4 | Fluid clamp type, scrolling tables, 84 vw drawer — but the pointer-drag figure stages shipped without `touch-action`, so horizontal drags could be eaten by page scroll on touch (fixed in this pass) |
| 5 | Implementation integrity | 4/4 | The registry is the single source of truth and both derived surfaces (MDX map, thread tools) are test-enforced derivations; manual scans found no drift, no hex in components, no hidden randomness |
| **Total** | | **17/20** | **Good — address the weak dimensions** |

## Implementation Integrity Verdict

**Pass.** The implementation expresses a coherent, product-specific system:
facts-as-data figures with declared interaction archetypes enforced by
`test/figure-constitution.test.ts`; one control grammar (primary/secondary
pills, token ranges, mono readouts) reused from the drawer to the thread; the
browser's own surfaces themed (`::selection`, caret, scrollbars, tabular
numerals) — the craft-floor check models skip most reliably. The generative
surface is not a bolt-on: the thread renders the *same* registry components the
articles render, with tool args merged over registry defaults, and the theme
switch in chat is the same control as the drawer's. Nothing surveyed is
interchangeable with an unrelated product.

## Findings by severity

**Fixed in this pass** (interaction-state fixes within the existing token
system — not visual redesigns, so no author approval needed):

- **[P1] Drag surfaces lacked `touch-action`.** Location: `WipeCompare` stage
  (homepage spotlight + lab + thread), `TradeoffPad` stage, `LensPeek` grid.
  Category: Responsive/gestures. The impeccable audit reference flags exactly
  this code smell: pointer-event drag surfaces without `touch-action` lose the
  drag to page scroll on touch (`pointercancel` once scrolling takes over).
  Fixed: `pan-y` on the horizontal surfaces, `none` on the 2-D pad. Untested in
  a real browser (no touch synthesis here) — verify on a device.
- **[P3] Dead acknowledge transition** in `ThemeSwitchCompact`: a remounted
  span always at `rotate(0)` animates nothing. Removed the wrapper; state
  remains fully announced by `aria-label`/`title`.

**Verified handled during the audit** (suspected, then cleared):

- Thread fetch-failure: the adapter catches `loadArchiveIndex()` rejection and
  yields honest recovery copy with a `/search` fallback — the error state the
  component-state contract requires exists.
- `aria-live` readouts: present on every dynamic figure state (reconstructor,
  scrubber, ladder, wipe, pad, race, lens, atlas, switches, quiz, theme).
- Keyboard operation: every drag surface mirrors its state into visible
  sliders, arrow-key handlers, or native inputs (roving tabindex on the theme
  radiogroup).
- Wide article tables: `.mdx-body table` is `display:block; overflow-x:auto` —
  no narrow-viewport overflow.

**Reported — author decision required (visual/copy changes need approval,
standing rule):**

- **[P2] Kickers above headings violate the site's own law.** `DESIGN.md`
  bans "a kicker above a heading"; the impeccable craft floor bans it with no
  appeal. Offenders: the homepage's "From the figure lab" and "Ask the archive"
  mono labels (added 2026-11-25 in the homepage pass — self-inflicted), the
  hero eyebrow ("Essays on research & open code · N essays" — predates this
  branch), and the lab's chip row sitting above each figure title (these chips
  carry real metadata — status/archetype/tool — so they read as apparatus, but
  they are positioned like kickers). Options: (a) fold the metadata into the
  heading line or the paragraph below, (b) amend DESIGN.md's literals clause to
  permit *metadata chips* (not labels) above h2s, or (c) keep as-is and record
  the exception. Awaiting the author's pick.
- **[P2] The code-panel palette is pinned hex outside the token authority.**
  `app/globals.css` sets `pre` to `#10141B`/`#ECEFF4` with a fixed rehype
  highlight palette (`#c792ea`, `#82aaff`, …) — a dark-in-both-themes code
  panel. The convention itself is defensible (and DESIGN.md names the dark
  code panel), but the literals clause says everything else resolves through a
  token, and the palette is blue-bearing. Tokenize it (e.g. `code-panel-bg`,
  `code-token-*` in `tokens/src/`) or add it to the literals clause.
- **[P2] `/lab` has no measured budget.** The §9 table asserts article JS but
  only reports the assistant route; `/lab` now loads the entire registry
  (10 figures) client-side. Recommend extending `check:site` to assert a
  /lab-specific budget like the article's.
- **[P3] Header icon buttons are 40 px (`h-10`) targets.** Consistent across
  search/theme/menu; passes WCAG AA (2.5.8, 24 px) with spacing, below the
  44 px ideal. A deliberate bump to 44 px is a visual change — author's call.
- **[P3] `RacePlayback` speed toggle mid-run.** The active interval keeps the
  speed it was started with until the next play/pause; harmless but surprising.
  Fix by keying the interval on `speed`.

## Patterns (systemic)

- **Derivation discipline is the project's spine** — registry → MDX map →
  thread tools, all test-enforced. Nothing hand-forked was found anywhere, a
  pattern worth keeping as the library grows.
- **Honesty as UX**: no fabricated counts, empty states explain themselves,
  sync modes disclosed in copy. This is the strongest identity signal the
  audit found; protect it while polishing.
- **Token-only colour with a single known exception** (the code panel). The
  no-blue palette rule holds across the UI; the one blue-bearing surface is a
  content-styling palette, not UI chrome.

## Positive findings

- Browser-surface theming (selection, caret, scrollbars, tabular numerals) —
  the cheapest craft signal, done thoroughly.
- Figure chrome is one contract (`FigureChrome`) stripped identically
  in-thread; tone *names* keep data colour token-resolved.
- The drawer dialog is a model implementation: portal, focus trap, restore,
  scroll lock, Escape/scrim dismiss, `motion-reduce` collapses.
- Motion budget: every state-changing transition has a reduce fallback;
  motion always encodes state (rank swaps, reveals, marker moves).

## Recommended actions

1. **[P2] `$impeccable clarify`** (after author decision): resolve the kicker
   pattern per the option chosen; retune the three offending surfaces.
2. **[P2] `$impeccable extract`** (after author decision): pull the code-panel
   palette into `tokens/src/` or amend the literals clause.
3. **[P2] `check:site` extension**: assert a `/lab` JS budget next to the
   article's (no impeccable command needed — it's the §9 gate).
4. **[P3] `$impeccable polish`**: 44 px header targets, race-speed retiming,
   and a rendered-screenshot pass on a machine with the engine network access
   (`impeccable shot` at 390 px and 1280 px) to close the untested gap this
   run documented.
