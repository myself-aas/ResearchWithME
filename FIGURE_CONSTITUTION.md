# The Figure Constitution

Strict rules for the interactive-figure library that powers visual learning in
the essays (`components/library/`, `lib/figures/`, `/lab`, and the generative
surface in `/assistant`). **Every agent designing, building, or reviewing a
figure follows this document without exception.** Where AGENTS.md speaks about
the site as a whole, this document speaks about figures specifically; on any
conflict, the stricter rule wins.

Enforcement is automated: `test/figure-constitution.test.ts` fails CI on every
article marked **[check]** below. A figure is not "mostly compliant" — it is
either compliant or it does not ship.

---

## Article 1 — One archetype per figure [check]

Every figure declares exactly one **interaction archetype** in
`lib/figures/registry.ts` (`archetype`), and no two library figures may share
one. "Unique" means the *interaction pattern*, not the subject: a masking
slider and a noise slider are the same figure. The current archetypes:

| Archetype | Component | The reader's hands do |
| --- | --- | --- |
| `ratio-slider-staggered-reveal` | `MaskedPatchReconstructor` | set a ratio, trigger a staggered reconstruction |
| `time-scrub-field` | `SeasonScrubber` | drag one thumb through continuous time |
| `listbox-ladder-picker` | `CheckpointLadder` | pick an item, watch the marker move and cards swap |
| `stage-selector-pipeline` | `PrithviExplorer` | pick a stage, the diagram re-renders |
| `dataset-switcher-bars` | `FloodResultsChart` / `PastisResultsChart` | switch datasets, bars swap *(legacy pair)* |
| `drag-wipe-comparison` | `WipeCompare` | drag a viewport boundary across two fields |
| `2d-parameter-drag` | `TradeoffPad` | drag one point through a 2-D parameter plane |
| `playback-race-series` | `RacePlayback` | run a transport (play/pause/step/speed) |
| `hover-lens-peek` | `LensPeek` | move a lens that swaps the layer inside it |
| `pinned-hotspot-annotation` | `HotspotAtlas` | activate anchored pins, read the annotation |
| `toggle-assumption-inference` | `AssumptionSwitches` | flip switches, outcomes re-derive |
| `answer-reveal-quiz` | `SelfCheckQuiz` | commit to an answer, get judged |

**Check:** registry archetype uniqueness among `library` and non-legacy
`adopted` entries. `npm run figures:new` refuses a claimed archetype up front.

## Article 2 — Facts are data; components are machines [check]

A library component contains **no topic data and no topic logic**. Every fact
— values, labels, units, thresholds, colours-as-tone-names — arrives through
props from the adopting post's data module (`lib/post/<slug>.ts`) or from a
fixture. Library files never import from `lib/post/*` or `content/*`. A post
binding composes a library component; **re-implementing an existing pattern
inside a post is forbidden** — extend the library instead.

**Check:** import scan over `components/library/**` and `lib/figures/**`.

## Article 3 — Generative UI is not optional [check]

Every figure renders in **two surfaces from one component**: the article body
(MDX, via the registry-derived `mdxComponents`) and the assistant thread
(via the registry-derived `generativeTools.by_name`). Registration happens in
exactly one place — `lib/figures/registry.ts` — and both derived surfaces are
generated from it. Hand-forking either surface is a violation. A figure that
only exists in an article is half-shipped and cannot merge.

**Check:** `mdx-components.tsx` and `GenerativeFigures.tsx` must derive from
`FIGURES`; every registry entry must carry `toolName`, non-empty `keywords`,
and defaults.

## Article 4 — Uniform chrome, one contract [check]

A figure's outermost element is a `<figure>` with the shared chrome from
`components/library/FigureChrome.tsx`: captioned header, body, readout. The
assistant's `FigureFrame` strips exactly this chrome in-thread
(`[&>figure]` overrides). No figure invents its own header, badge, or border
system without amending this constitution.

**Check:** library components import `FigureChrome` (or extend it via a
constitution amendment recorded in this file).

## Article 5 — The static page survives `curl` [check]

The initial render is **server-rendered and meaningful**: the figure's default
state, its readout, and its interpretation are in the HTML. No loading
spinners on first paint, no `typeof window` branching on the initial state.
`check:site` must find each figure's initial state in the built page it
appears on (`/lab` for library fixtures, the article for adopted figures).

**Check:** built HTML contains the figure's initial-state markup.

## Article 6 — Tokens are the only colours [check]

Chrome uses semantic token classes (`bg-surface`, `text-ink`, `border-line`,
`bg-brand`, …) — never hex, never `rgb()`, never blue. Data colours arrive as
tone *names* and resolve through `lib/figures/tones.ts`, which tracks the
token authority in `tokens/src/`. Artwork that carries its own ink follows the
DESIGN.md literals clause, not this article.

**Check:** hex-literal scan over `components/library/**` and `lib/figures/**`.

## Article 7 — Accessible by construction [check]

- Every control is a real `<button>`, `<input>`, or `<a>` — never a clickable
  `<div>`; touch targets ≥ 44 px (`min-h-11`).
- The figure is keyboard-operable without a pointer: sliders are native inputs;
  draggable stages mirror their state into visible sliders, arrow-key handlers,
  or both.
- Every dynamic readout lives in an `aria-live="polite"` region and states the
  current state in words. **State is never carried by colour alone.**
- Focus is always visible (`focus-visible:outline-2 …`).

**Check:** review per figure; the readout/aria-live requirement is asserted in
the component review checklist of the template.

## Article 8 — Deterministic and serialisable [check]

- No `Math.random()`, no `Date.now()`, no wall-clock in render. Randomness
  comes from `lib/figures/random.ts`, seeded by a prop or constant — the same
  render twice is the same render (hydration safety, reproducible tests,
  reproducible thread).
- Props and registry defaults are JSON-serialisable (`FigureArg`), so the same
  data renders on `/lab`, in MDX, and through a tool call.
- Pure logic (ranks, evaluations, scoring, clamps) lives in
  `lib/figures/<slug>.ts` with unit tests; components stay thin renderers.

**Check:** scan for `Math.random(` / `Date.now(`; logic modules unit-tested.

## Article 9 — Motion means something [check]

Animation must encode information the reader needs (a reconstruction, a rank
swap, a marker move) and must never decorate. Every transition carries
`motion-reduce:transition-none`; timer-driven sequences honour
`prefers-reduced-motion` (jump to the final state). Decorative motion on the
article path remains banned (AGENTS.md §12).

**Check:** review per figure; `RacePlayback`'s reduce fallback is the reference
implementation.

## Article 10 — A figure lands complete [check]

One commit carries **all** of: the component, its fixture (library status), its
pure logic module, its registry entry, its unit tests, the passing
constitution checks, and — when adopting — the post's data module, the thin
binding, the flipped `status`/`posts`, and extended `routeFigure` tests.
Scaffolding exists so this is cheap: `npm run figures:new -- <slug>` writes the
component from `templates/GENERATIVE_FIGURE_TEMPLATE.tsx.tmpl` and the fixture,
and refuses duplicate archetypes and tool names.

**Check:** `npm run quality` (includes the constitution suite) and
`npm run verify` must pass before push; CI re-runs both.

## Article 11 — The assistant contract is the article contract [check]

Tool args carry defaults (`initialRatio`, `initialMonth`, `initialCheckpoint`,
…); a tool call with **partial or empty arguments** still renders a sensible
figure (the registry defaults are the floor). Routing keywords live on the
registry entry (≥ 2, lowercase, matched with `includes`), and registry order is
routing precedence. The tool-UI wrapper is the shared factory in
`components/assistant/GenerativeFigures.tsx` — per-figure tool wrappers are
hand-written relics and must not return.

**Check:** registry keywords/defaults assertions; routing is tested in
`test/assistant-retrieval.test.ts`.

## Article 12 — Visual changes need the author [standing rule]

Proposing a new archetype, changing a shipped figure's visual design, or
amending this constitution requires the author's approval in the PR — state
the pattern, the rationale, and the archetype it must not collide with. The
PR comment shows the uniqueness matrix. Standing rule from the design-system
work (2026-11-25): **visual design changes need author approval.**

---

## Grandfather clause

Pre-library post components (`MaskedPatchReconstructor`, `SeasonScrubber`,
`CheckpointLadder`, `PrithviExplorer`, `FloodResultsChart`,
`PastisResultsChart`) are the **prototype generation**: they stay scoped to
their post and are registered as `adopted` (the charts flagged `legacy`). They
are exempt from Articles 2, 4, and 6's letter but not their spirit; when an
essay next touches them, they migrate onto the library and lose the exemption.
New figures — no exceptions, no grandfathering.

## The two templates

- **Component template:** `templates/GENERATIVE_FIGURE_TEMPLATE.tsx.tmpl`
  (scaffold via `npm run figures:new`). The constitution, inlined as the
  checklist the file itself carries.
- **Post layout system:** `templates/GENERATIVE_POST_LAYOUT.mdx.tmpl`. The
  anatomy of a figure-bearing essay: lead-in before every figure,
  interpretation after it, one archetype per concept, and the adoption
  checklist that keeps Article 10 true.
