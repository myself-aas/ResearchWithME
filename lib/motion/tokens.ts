/**
 * reme v3.1 — Interface motion tokens (spec §9) in the shape Motion consumes.
 *
 * The design system speaks in milliseconds (`instant 0`, `fast 120`,
 * `standard 200`, `deliberate 320`, `connect 480`, `synthesize 700`) and four
 * cubic-bézier easings. Motion (`motion/react`, formerly Framer Motion) speaks
 * in seconds and `[x1, y1, x2, y2]` tuples, so this module is the single
 * translation layer: nothing else in the codebase hard-codes a duration, an
 * easing curve, or a spring.
 *
 * Motion principles applied here (dylantarre/animation-principles):
 * - **Timing** — six published durations, no ad-hoc numbers.
 * - **Slow in / slow out** — every pattern owns an easing, chosen per intent.
 * - **Follow through / overlapping** — stagger constants are capped so a
 *   sequence never exceeds half a second (see `STAGGER.cap`).
 *
 * The values are inert data (no React), so they can be imported from server
 * components, route metadata, tests, and the Remotion/Hyperframes token
 * consumers without pulling the animation runtime into that bundle.
 */

import type { Transition } from 'motion/react';

/** Durations in milliseconds — the canonical form used by the design spec. */
export const DURATION_MS = {
  instant: 0,
  fast: 120,
  standard: 200,
  deliberate: 320,
  connect: 480,
  synthesize: 700,
} as const;

export type MotionDurationName = keyof typeof DURATION_MS;

/** Same durations in seconds, the unit `motion` transitions expect. */
export const DURATION_S = {
  instant: DURATION_MS.instant / 1000,
  fast: DURATION_MS.fast / 1000,
  standard: DURATION_MS.standard / 1000,
  deliberate: DURATION_MS.deliberate / 1000,
  connect: DURATION_MS.connect / 1000,
  synthesize: DURATION_MS.synthesize / 1000,
} as const;

/** Cubic-bézier tuple accepted by `motion`'s `ease` option. */
export type BezierEasing = readonly [number, number, number, number];

/** reme v3.1 §9 easings (mirrors the `--ease-*` custom properties in globals.css). */
export const EASING = {
  /** Long, calm departure and landing. Default for reveals and settles. */
  standard: [0.2, 0, 0, 1],
  /** Entrances: immediate commitment, gentle landing. */
  enter: [0, 0, 0, 1],
  /** Exits: hold, then leave decisively. */
  exit: [0.3, 0, 1, 1],
  /** Emphasis: a little more acceleration for state changes worth noticing. */
  emphasize: [0.2, 0.8, 0.2, 1],
} as const satisfies Record<string, BezierEasing>;

export type MotionEasingName = keyof typeof EASING;

const asEase = (easing: BezierEasing): BezierEasing => easing;

/**
 * Tween presets mapped 1:1 to the five reme motion patterns:
 * reveal → source details, connect → provenance relationship,
 * verify → confirmed state, synthesize → evidence-to-draft, archive → de-emphasis.
 */
export const TRANSITION = {
  instant: { duration: DURATION_S.instant, ease: asEase(EASING.standard) },
  fast: { duration: DURATION_S.fast, ease: asEase(EASING.enter) },
  /** Reveal, 200ms — source details, methods, annotations, list items. */
  reveal: { duration: DURATION_S.standard, ease: asEase(EASING.standard) },
  /** Verify, 320ms — confirmed state change with icon and text. */
  verify: { duration: DURATION_S.deliberate, ease: asEase(EASING.standard) },
  /** Archive, 320ms — reduce emphasis while preserving recovery. */
  archive: { duration: DURATION_S.deliberate, ease: asEase(EASING.exit) },
  /** Connect, 480ms — citation or provenance relationship. */
  connect: { duration: DURATION_S.connect, ease: asEase(EASING.emphasize) },
  /** Synthesize, up to 700ms — bounded, reversible evidence-to-draft. */
  synthesize: { duration: DURATION_S.synthesize, ease: asEase(EASING.standard) },
} as const satisfies Record<string, Transition>;

export type MotionPatternName = keyof typeof TRANSITION;

/**
 * Spring presets. reme treats springs as *timing with follow-through*: the
 * duration tokens tell you the intended read time, the spring constants deliver
 * that read time with the correct overshoot.
 */
export const SPRING = {
  /** Micro-interaction: press, toggle, checkbox. Reads as ~120ms. */
  press: { type: 'spring', stiffness: 560, damping: 34, mass: 0.55 },
  /** Standard settle after a hover/lift. Reads as ~200ms. */
  lift: { type: 'spring', stiffness: 300, damping: 28, mass: 0.85 },
  /** Layout move (shared indicator, list reorder). Reads as ~320ms. */
  layout: { type: 'spring', stiffness: 380, damping: 36, mass: 1 },
  /** Dialog / sheet entrance. Deliberate, no wobble. */
  panel: { type: 'spring', stiffness: 300, damping: 30, mass: 0.9 },
  /** Delight only: confirmation pops, heart, checkmark. Bounded overshoot. */
  expressive: { type: 'spring', stiffness: 320, damping: 16, mass: 0.8 },
  /** Amortised scroll indicator (reading progress). */
  scroll: { stiffness: 220, damping: 40, mass: 0.6, restDelta: 0.0005 },
} as const satisfies Record<string, Transition | { stiffness: number; damping: number; mass: number; restDelta?: number }>;

export const STAGGER = {
  /** 50ms between list items — animation-principles "stagger formula". */
  item: 0.05,
  /** 100ms between page sections. */
  section: 0.1,
  /** 150ms between hero beats (staging). */
  hero: 0.15,
  /** A sequence never runs longer than this; extra items land together. */
  cap: 0.5,
  /** Delay before the first child starts. */
  lead: 0.04,
} as const;

/** Stagger delay for the nth item, capped at the published sequence budget. */
export function staggerDelay(index: number, step: number = STAGGER.item): number {
  return Math.min(Math.max(index, 0) * step, STAGGER.cap);
}

/**
 * Travel distances. The design system asks for restraint; these are the
 * largest offsets any surface may use, keyed by the weight of the element.
 */
export const DISTANCE = {
  /** 4px — icon nudges, secondary action. */
  micro: 4,
  /** 12px — cards, list items, reveals. */
  reveal: 12,
  /** 20px — panels, sheets, popovers. */
  panel: 20,
  /** 24px — hero beats and section headers. */
  hero: 24,
} as const;

/** Scale factors for squash-and-stretch, anticipation, and appeal. */
export const SCALE = {
  /** Pressed state: compress. */
  press: 0.97,
  /** Entering from "behind": nearly full size. */
  enter: 0.985,
  /** Hover lift: barely perceptible, never a jump. */
  hover: 1.02,
  /** Confirmation pop: bounded overshoot. */
  pop: 1.12,
  /** Attention pulse ceiling (auto-decays, see AttentionPulse). */
  pulse: 1.15,
} as const;

export const OPACITY = {
  /** De-emphasised (archive/staging background). */
  muted: 0.6,
  /** Resting visible state. */
  visible: 1,
  /** SSR-safe "pre-reveal" value — content is never fully hidden in markup. */
  veil: 0.999,
} as const;

/** True when the user (or the app's static mode) asked for no motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
