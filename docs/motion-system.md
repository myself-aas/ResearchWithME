# πeme Motion System v1

> Interface motion for ResearchWithME, built on [`motion`](https://motion.dev)
> (the package formerly published as Framer Motion) and Disney's twelve
> animation principles as catalogued by
> [`dylantarre/animation-principles`](https://github.com/dylantarre/animation-principles).
>
> Normative parent: [`pieme-design-system-v3.1.md`](./pieme-design-system-v3.1.md) §9
> (Interface Motion) and §10 (`MotionMode`). This document does not add
> durations or easings — it explains how the existing ones are applied.

---

## 1. Why a motion system

πeme motion has one job: **explain a change**. A filter that reorders a
catalogue, a citation that opens, a save that is confirmed, a page that was
replaced — each of those is a relationship or a state, and motion is how the
reader sees it. Anything else is decoration, and §9 rules decoration out:
no infinite glow, no particle streams, no decorative telemetry, no
cursor-follow, no number-count animation, and no motion that implies
verification without a real state change.

The twelve principles are the vocabulary we use to make that explanation
legible. They are not an instruction to animate more; most of them are
constraints ("one primary reveal per viewport", "nothing exceeds 700ms").

---

## 2. Architecture

```
lib/motion/
  tokens.ts        six durations, four easings, five pattern presets,
                   spring presets, stagger + distance + scale constants
  variants.ts      hidden/visible poses for seven reveal kinds, stagger
                   containers, press/hover poses
  principles.ts    the twelve principles as data (intent, pattern, guardrail,
                   primitives) — consumed by /motion and by the tests
  hooks.ts         delayed loading, scroll progress, warm imports
  lazy.tsx         lazyWidget() code-split boundary, deferToIdle()
  mode.ts          MotionMode = full | reduced | static

components/motion/
  MotionModeProvider.tsx   persisted mode → html[data-motion-mode]
  MotionScope.tsx          LazyMotion + MotionConfig for the app
  features.ts              the domMax bundle, loaded in its own chunk
  use-armed-reveal.ts      SSR-safe "hide only below the fold" mechanism
  Reveal.tsx               scroll-triggered entrance (7 poses)
  Stagger.tsx              sequenced entrances
  Pressable.tsx            press squash / hover lift
  MotionList.tsx           pose-to-pose lists with layout + exit
  MotionPillGroup.tsx      shared-layout filter control
  SuccessCheck.tsx         drawn confirmation tick
  AttentionPulse.tsx       bounded, self-stopping attention cue
  LoadingState.tsx         delayed spinner, bounded shimmer, status region
  LazyMount.tsx            viewport-gated mount for heavy widgets
  RouteTransition.tsx      the client-navigation beat
```

Two runtimes, one contract:

- **CSS** (`app/globals.css` + `cloudflare-pages/src/globals.css`) owns the
  first paint: the 200ms page settle and the `[data-enter]` choreography used
  above the fold. This is what renders when JavaScript is slow, blocked, or
  absent, and it is where the reduced-motion contract is enforced for
  non-JavaScript clients.
- **Motion** owns everything after hydration: scroll reveals, layout changes,
  presence (dialogs, toasts, lists), gesture feedback, and lazy boundaries.

`MotionScope` is the only place a feature bundle is wired: the `m` components
all come from the light `motion/react-m` entry, and `domMax` itself is fetched
by `LazyMotion` through `import('./features')`, so it lands in its own chunk
instead of the initial shell. `MotionBoundary` makes
each primitive self-sufficient — a primitive rendered outside the app scope
(unit test, isolated story, MDX embed) wraps itself once instead of throwing.

---

## 3. Tokens

Source of truth: `tokens/src/motion.json` → `tokens/generated/tokens.css` →
`lib/motion/tokens.ts`. Nothing may hard-code a duration or a curve.

| Token | Value | Pattern |
|---|---|---|
| `instant` | 0ms | state without a transition |
| `fast` | 120ms | press, toggle, icon swap |
| `standard` | 200ms | **reveal** — source details, methods, annotations, lists |
| `deliberate` | 320ms | **verify** / **archive** — confirmed state, de-emphasis |
| `connect` | 480ms | **connect** — citation and provenance relationships |
| `synthesize` | 700ms | **synthesize** — evidence-to-draft, the hard ceiling |

| Easing | Curve | Use |
|---|---|---|
| `standard` | `cubic-bezier(0.2, 0, 0, 1)` | default for reveals and settles |
| `enter` | `cubic-bezier(0, 0, 0, 1)` | entrances: commit fast, land gently |
| `exit` | `cubic-bezier(0.3, 0, 1, 1)` | exits: hold, then leave |
| `emphasize` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | state changes worth noticing |

Springs (`SPRING.press`, `lift`, `layout`, `panel`, `expressive`, `scroll`)
describe the same read times with follow-through. They are allowed only where
a physical settle explains something: press, layout travel, a panel arriving,
a confirmation pop, a scroll-smoothed indicator. They are not a way to extend
the 700ms ceiling — `expressive` still lands in ~320ms.

Stagger is capped: `STAGGER.item = 50ms`, `STAGGER.cap = 500ms`. After the
tenth item in a grid, the rest arrive together. Long sequences are the most
common way an interface starts feeling slower than it is.

---

## 4. The twelve principles, as implemented

| # | Principle | Where it lives | Guardrail |
|---|---|---|---|
| 1 | Squash & stretch | `Pressable`, `SuccessCheck`, `Reveal` (`squash`) | scale floor 0.97, ceiling 1.12; never deform text |
| 2 | Anticipation | `Pressable` hover, `Reveal` (`anticipate`), dialog exit | ≤ 4px pull-back; never delay a click response |
| 3 | Staging | `Stagger`, `MotionDialog` backdrop/panel, `/motion` | one primary reveal per viewport; supporting layers stop at 60% |
| 4 | Straight ahead / pose to pose | `MotionList`, `MotionPillGroup`, `RouteTransition` | one start pose, one end pose — no free-running tweens |
| 5 | Follow-through & overlapping | `Stagger`, toasts, icon swap delays | 50ms stagger, ≤ 500ms sequence |
| 6 | Slow in / slow out | every transition in the product | linear only for scroll-linked progress |
| 7 | Arc | `Reveal` (`arc`), theme toggle, citation popover | ≤ 1.2° rotation with paired X/Y travel |
| 8 | Secondary action | like/save/copy confirmations, trailing icons | one per interaction; never changes the accessible name |
| 9 | Timing | `DURATION` + `TRANSITION` tokens | nothing above 700ms; indicators 200ms/500ms |
| 10 | Exaggeration | `SuccessCheck`, `AttentionPulse`, lab only | overshoot ≤ 1.12; pulses stop after 3 cycles |
| 11 | Solid drawing | dialogs, elevation, the progress ring | 2px–24px offsets on a single z-axis; no fake 3D on text |
| 12 | Appeal | the sum — hover lifts, reading progress, empty states | charm never overrides clarity |

The registry in `lib/motion/principles.ts` is the machine-readable version of
this table; `/motion` renders it and `lib/__tests__/motion-system.test.tsx`
asserts that all twelve exist with real tokens and primitives.

---

## 5. The SSR contract

This is the part that is easy to get wrong, so it is enforced by design:

1. **Content is never hidden by an animation.** `Reveal` and `Stagger` render
   plain markup on the server and on the first client paint. They do **not**
   pass `initial={{ opacity: 0 }}`.
2. **Only below-the-fold content is armed.** After mount, `useArmedReveal`
   measures the element inside a layout effect. If it is already on screen it
   is left alone — the CSS page settle owns the first beat. If it is below the
   fold, the hidden pose is applied before the browser paints and released on
   intersection. There is no flash in either direction.
3. **Pointer/touch and reduced motion are checked before arming.** No
   `IntersectionObserver` or `prefers-reduced-motion: reduce` means no arming.
4. **Above-the-fold choreography is CSS**, via `[data-enter]` attributes with
   `--enter-delay`. It renders at full speed on the first byte and collapses
   under reduced motion.
5. **Tests assert it.** `lib/__tests__/catalog-motion.test.tsx` requires the
   feed's server markup to contain no `opacity:0`; the motion system test
   asserts the same for `Reveal`, `Stagger`, and `MotionList`.

`initial={false}` is the default for presence-free components (`MotionItem`,
`SuccessCheck`, `AttentionPulse`, indicators). Where an entrance is genuinely
needed for a client-only widget (dialog panel, toast), the SSR markup may carry
the hidden pose — those surfaces are inert without JavaScript anyway.

---

## 6. Reduced motion and motion modes

`MotionMode` (spec §10) has three values:

- **full** — everything, while still honouring the OS preference via
  `MotionConfig reducedMotion="user"`.
- **reduced** — transforms and layout animation are suppressed
  (`reducedMotion="always"`); opacity and colour still explain state.
- **static** — no animation at all. `html[data-motion-mode="static"]` removes
  CSS animations and transitions too; used by the lab and by visual regression.

The mode is persisted as `rwm-motion-mode`, defaults to the OS preference, and
is mirrored onto the `<html>` element so CSS can react without a hydration
round-trip.

Rules every primitive follows:

- never the only signal — a status is always text + colour, never motion;
- `aria-live` regions are never moved by layout animation;
- focus rings and hover colours survive every mode;
- infinite animation is reserved for a real "still working" indicator
  (`Spinner`), and `SkeletonShard` shimmer stops after three cycles.

---

## 7. Loading contract

| Situation | Delay before indicator | Minimum visible | Cycle |
|---|---|---|---|
| Inline data (comments, corpus) | 200ms | 500ms | — |
| Skeleton | immediate | 500ms | 1500ms × 3 |
| Button spinner | 0ms | 400ms | — |
| Route chunk | boundary renders instantly | — | — |

`useDelayedLoading(loading, { delay, minDuration })` implements the first two
columns. `LoadingState` wraps it with `role="status"`, `aria-busy`, and a
screen-reader-only label. Skeletons are `aria-hidden` and shaped like the
content they replace.

Two skeleton primitives, split by where they run:

- `SkeletonShard` (`components/motion/LoadingState`) — hydrated surfaces. A
  bounded shimmer (three cycles) driven by `motion`, suppressed entirely under
  reduced motion.
- `Skeleton` + `RouteSkeleton` (`components/ui`) — route-level `loading.tsx`
  segments. CSS-only `animate-pulse`, because a deferred route can paint
  before the motion scope hydrates; the global reduced-motion rule in
  `globals.css` neutralises the pulse. Segments that ship one:
  `app/post/[slug]`, `app/paper/[slug]`, `app/papers`, `app/authors`.

---

## 8. Lazy loading

Three tiers, chosen by what the content is for:

1. **Route content** — server-rendered, always. Never behind a spinner.
2. **Crawlable sections** — rendered on the server, revealed on intersection
   (`Reveal`), and optionally skipped by the renderer with
   `[data-lazy-section]` (`content-visibility: auto`).
3. **Interactive-only widgets** — code-split with `lazyWidget()` and mounted
   by `LazyMount` when within ~600px of the viewport. Current adopters:
   - `DeferredImpactChart` (Recharts radar on author pages),
   - `DeferredDiscussion` (comment panel on articles),
   - the command palette (already split, now warmed on hover/focus),
   - the Markdown editor (writer studio).

`LazyMount` reserves the widget's height so mounting never shifts the layout,
and its placeholder is a labelled `role="status"` region. Hydration is
deterministic: server and first client render both show the placeholder, then
the observer decides — so there is no mismatch and no content→skeleton flash.

`useWarmImport(loader)` starts a split import on hover, focus, or pointer-down
for surfaces where the open latency is perceptible (the palette). `deferToIdle`
is available for non-urgent warm-up work and is intentionally unused on the
critical path.

**Do not** lazy-load: article bodies, paper abstracts, author names, citation
metadata, navigation, or anything that carries SEO or no-JS meaning.

---

## 9. Bundle budget

The runtime is split deliberately:

- `motion/react-m` (the `m` component only) ships with the app shell;
- `domMax` (animations, gestures, exit, layout, drag) is requested by
  `LazyMotion` from `components/motion/features.ts`, which is a dynamic import
  and therefore its own chunk;
- code-split modules (`recharts`, editor, graph) stay out of the shell.

Measured on this branch: **182.6 KB / 200 KB gzip** shell, `node
scripts/check-budgets.mjs` PASS — below the 187.1 KB the branch started from,
even after adding the whole motion system.

Consequence to be honest about: an element that mounts in the first frame,
before the feature chunk resolves, does not adopt its hidden pose, so it
appears at rest rather than animating in. That is the same failure mode the
system already prefers (content is never hidden waiting for JavaScript), and
every mount after the chunk resolves animates normally.

Verify with:

```bash
npm run build && node scripts/check-budgets.mjs
```

Shell budget: 200KB gzip (§18).

---

## 10. Using it

```tsx
import Reveal, { Stagger, StaggerItem, Pressable, SuccessCheck } from '@/components/motion';

// Below-the-fold section, arcs in once.
<Reveal as="section" variant="arc" amount={0.12}>
  <h2>Methods</h2>
</Reveal>

// A card grid, sequenced and capped.
<Stagger as="ul" className="grid gap-4 md:grid-cols-3">
  {items.map((item) => (
    <StaggerItem as="li" key={item.id}>
      <Card {...item} />
    </StaggerItem>
  ))}
</Stagger>

// A filter that reorders without teleporting.
<MotionList className="grid gap-4">
  {filtered.map((item) => (
    <MotionItem key={item.id}>{item.title}</MotionItem>
  ))}
</MotionList>

// Confirmation feedback, with the label change doing the announcing.
<Pressable onClick={save} aria-pressed={saved}>
  {saved ? <SuccessCheck /> : <BookmarkIcon />}
  <span>{saved ? 'Saved' : 'Save'}</span>
</Pressable>
```

Rules for writing a new animated component:

- Import `m` from **`motion/react-m`** (`import * as m from 'motion/react-m'`)
  and hooks/presence from `motion/react`. Never import `motion` or `domMax`
  directly — that pulls the feature bundle back into the shell and breaks §18.
- Use `m.*` elements, not `motion.*`; the latter drags the full runtime in.

Checklist for a new animated surface:

- [ ] Duration comes from a token; easing comes from a token.
- [ ] The motion explains a relationship or a state change — say which one.
- [ ] Content is visible with JavaScript disabled.
- [ ] Reduced motion leaves a readable static state.
- [ ] Nothing loops indefinitely except a real progress indicator.
- [ ] Any list change uses `MotionList`/`layout`, not a re-mount flash.
- [ ] `/motion` was checked in `full`, `reduced`, and `static` modes.

---

## 11. Verification

```bash
npm run quality        # lint + typecheck + tests + Impeccable source scan
npx vitest run lib/__tests__/motion-system.test.tsx
```

`motion-system.test.tsx` checks: token parity with the generated CSS, the
700ms ceiling, the twelve-principle registry, stagger caps, SSR output free of
`opacity:0`, nested scope safety (single and double wrapping), the lazy
placeholder's `role="status"`, and the reduced-motion rendering path.

Manual review lives at `/motion` (`noindex`), linked from the footer.

---

## 12. Lottie micro-interactions

Four decorative state glyphs, each bound to one §9 pattern. They supplement
the `m.*` primitives; they do not replace `SuccessCheck` or `AttentionPulse`.

| Component        | Pattern    | Length            | Use                                      |
|------------------|------------|-------------------|------------------------------------------|
| `VerifyMark`     | verify     | 467ms (≤ connect) | peer-verified, saved, copied             |
| `ConnectMark`    | connect    | 467ms (≤ connect) | citation or provenance link made         |
| `SynthesizeMark` | synthesize | 700ms             | evidence gathered into one result        |
| `AttentionMark`  | attention  | 3 × 700ms, stops  | a count changed                          |

**Compositions are code, not exports.** `lib/lottie/compose.ts` builds
Bodymovin JSON from `DURATION_MS` (floored to whole 60fps frames, so a
composition never overruns its token) and the four `EASING` curves.
`lib/lottie/animations.ts` holds the four compositions. Do not add an After
Effects export: it would bypass the token contract and bake in colours.

**Theme.** Shapes are painted in placeholder ink. `.pieme-lottie` in
`globals.css` recolours strokes and fills to `currentColor`, so colour a glyph
with a `text-*` token.

**Runtime.** `LottiePlayer` imports `lottie-web`'s SVG-only light build
(~46 KB gzip) on first play, in its own chunk. Nothing Lottie-related ships
with the shell.

**Static first.** Every glyph server-renders its resting frame as inline SVG.
That frame is what readers see without JavaScript, in `reduced` and `static`
modes, and under `prefers-reduced-motion`; the runtime is never requested in
those cases.

**Playback.** Never loops. `autoplay={false}` keeps the static frame and loads
nothing until `playKey` first changes; each later change replays in place.

```tsx
import { VerifyMark } from '@/components/lottie';

const [saves, setSaves] = useState(0);
<button onClick={() => { save(); setSaves((n) => n + 1); }}>
  <VerifyMark size={16} autoplay={false} playKey={saves} />
  <span>{saves ? 'Saved' : 'Save'}</span>
</button>
```

Verification: `npx vitest run lib/__tests__/lottie.test.ts` (token easings,
duration budget, SSR fallback); live demos at `/motion` → "Lottie
micro-interactions".

### Research lifecycle diagrams

`components/workflows/WorkflowDiagram` renders the four lifecycles in
`lib/workflows/research-workflows.ts` as an ordered list of stages. Opening a
stage's capability disclosure is the only trigger; the stage glyph plays its
pattern once. Each capability is marked `live` (with the shipping component)
or `planned`, and a test fails if a `live` reference does not exist. For
Markdown docs, `toMermaid(workflow)` emits the same diagram as a theme-neutral
Mermaid flowchart.
