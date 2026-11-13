/**
 * reme v3.1 — motion variant library.
 *
 * Every variant set encodes one or more of Disney's twelve principles as
 * documented by `dylantarre/animation-principles`, inside reme's restraint
 * budget (≤ 700 ms, no infinite decorative loops, no cursor-follow).
 *
 * Naming contract:
 *   `hidden` — the pre-animation pose (never emitted during SSR; see Reveal).
 *   `visible` — the resting pose.
 * Feeds (Reveal, Stagger) drive these through animation controls so the first
 * paint is always the visible pose.
 */

import type { TargetAndTransition, Transition, Variants } from 'motion/react';
import { DISTANCE, EASING, OPACITY, SCALE, SPRING, STAGGER, TRANSITION } from './tokens';

/** Canonical reveal poses, in the order the docs list them. */
export const revealKinds = ['rise', 'fade', 'arc', 'squash', 'mask', 'anticipate', 'stage'] as const;

export type RevealKind = (typeof revealKinds)[number];

/**
 * Individual reveal poses.
 *
 * | kind       | principles                                  |
 * |------------|---------------------------------------------|
 * | rise       | anticipation (offset), slow in/out          |
 * | fade       | staging (least energy), appeal              |
 * | arc        | arc, secondary action, solid drawing        |
 * | squash     | squash & stretch, appeal                    |
 * | mask       | staging (curtain), straight-ahead reveal    |
 * | anticipate | anticipation, follow-through (overshoot)    |
 * | stage      | staging, follow-through, overlapping action |
 */
export const revealVariants: Record<RevealKind, Variants> = {
  rise: {
    hidden: { opacity: 0, y: DISTANCE.reveal },
    visible: {
      opacity: OPACITY.visible,
      y: 0,
      transition: { ...TRANSITION.reveal, ease: [...EASING.enter] },
    },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: OPACITY.visible, transition: TRANSITION.reveal },
  },
  arc: {
    // X + Y travel together with a whisper of rotation: a curved path rather
    // than a straight slide (principle 7 — arcs; principle 11 — solid drawing).
    hidden: { opacity: 0, x: -DISTANCE.reveal * 0.75, y: DISTANCE.reveal, rotate: -0.6 },
    visible: {
      opacity: OPACITY.visible,
      x: 0,
      y: 0,
      rotate: 0,
      transition: { ...TRANSITION.connect, ease: [...EASING.emphasize] },
    },
  },
  squash: {
    // Compress on the way in, expand to rest: squash & stretch at 2% amplitude.
    hidden: { opacity: 0, scaleX: 1.02, scaleY: SCALE.enter - 0.02, transformOrigin: '50% 100%' },
    visible: {
      opacity: OPACITY.visible,
      scaleX: 1,
      scaleY: 1,
      transition: { ...SPRING.lift, opacity: TRANSITION.reveal },
    },
  },
  mask: {
    // Curtain wipe: staging + straight-ahead. Used for figures and plates.
    hidden: { opacity: 0, clipPath: 'inset(0% 0% 100% 0%)' },
    visible: {
      opacity: OPACITY.visible,
      clipPath: 'inset(0% 0% 0% 0%)',
      transition: { duration: 0.48, ease: [...EASING.standard] },
    },
  },
  anticipate: {
    // Pull back below the resting pose, then overshoot by 3px before settling.
    hidden: { opacity: 0, y: DISTANCE.hero },
    visible: {
      opacity: [0, 1, 1],
      y: [DISTANCE.hero, -DISTANCE.micro, 0],
      transition: { duration: 0.32, times: [0, 0.62, 1], ease: [...EASING.standard] },
    },
  },
  stage: {
    // The supporting layer arrives first, then the subject rises over it.
    hidden: { opacity: 0, y: DISTANCE.panel, scale: SCALE.enter },
    visible: {
      opacity: OPACITY.visible,
      y: 0,
      scale: 1,
      transition: { ...TRANSITION.verify, delay: STAGGER.lead, ease: [...EASING.enter] },
    },
  },
};

/**
 * Add a delay to a variant set's visible transition without discarding the
 * easing/duration the pose already declares. Used by `Reveal` for hairlines,
 * captions, and other elements that follow a primary subject (principle 5).
 */
export function withDelay(variants: Variants, delay: number): Variants {
  if (!delay) return variants;
  const visible = (variants.visible ?? {}) as Record<string, unknown>;
  const transition = (visible.transition ?? {}) as Transition;
  return {
    ...variants,
    visible: { ...visible, transition: { ...transition, delay } },
  };
}

/** Parent container used by `Stagger` and `Reveal` when `stagger` is set. */
export function staggerContainer(step: number = STAGGER.item, lead: number = STAGGER.lead): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: step, delayChildren: lead },
    },
  };
}

/** Child pose for staggered lists — follow-through and overlapping action. */
export function staggerItem(kind: RevealKind = 'rise', step: number = STAGGER.item, index = 0): Variants {
  const pose = revealVariants[kind];
  const delay = Math.min(index * step, STAGGER.cap);
  const visible = pose.visible as Record<string, unknown>;
  const transition = (visible.transition ?? {}) as Transition;
  return {
    hidden: pose.hidden,
    visible: { ...visible, transition: { ...transition, delay } },
  };
}

/** Hover/tap poses for interactive surfaces (anticipation + squash & stretch). */
export const pressablePoses: Record<'rest' | 'hover' | 'tap', TargetAndTransition> = {
  rest: { y: 0, scale: 1 },
  hover: { y: -2, scale: SCALE.hover, transition: SPRING.lift },
  tap: { y: 0, scale: SCALE.press, transition: SPRING.press },
};
