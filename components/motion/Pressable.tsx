'use client';

/**
 * Pressable — the interaction shell for every actionable surface.
 *
 * Principle 1 (squash & stretch: compress on press), 2 (anticipation: hover
 * lift previews the click), 5 (follow-through: the spring settles rather than
 * stops), 8 (secondary action: the trailing icon is handled by the caller with
 * `group-hover`), 12 (appeal).
 *
 * Boundaries:
 *  - hover never exceeds 1.02 scale / 2px lift (animation-principles hover);
 *  - press compresses to 0.97 — enough to feel mass, not enough to blur text;
 *  - touch devices get no fake hover (`@media (hover: hover)` in CSS mirrors
 *    this; Motion's `whileHover` ignores touch by default);
 *  - `MotionConfig` strips transforms under reduced motion while keeping the
 *    focus ring, active state, and color change.
 */

import { type HTMLMotionProps } from 'motion/react';
import * as m from 'motion/react-m';
import { pressablePoses } from '@/lib/motion/variants';
import { MotionBoundary } from './MotionScope';

export type PressableFeedback = 'squash' | 'lift' | 'none';

export interface PressableProps extends HTMLMotionProps<'button'> {
  /** `lift` for cards and primary actions, `squash` for icon buttons. */
  feedback?: PressableFeedback;
  /** React 19 ref-as-prop — points at the underlying <button>. */
  ref?: React.Ref<HTMLButtonElement>;
  children?: React.ReactNode;
}

export default function Pressable({
  feedback = 'squash',
  type = 'button',
  className,
  children,
  ref,
  ...rest
}: PressableProps) {
  const hover = feedback === 'lift' ? pressablePoses.hover : undefined;
  const tap = feedback === 'none' ? undefined : pressablePoses.tap;

  return (
    <MotionBoundary>
      <m.button
        ref={ref}
        type={type}
        whileHover={hover}
        whileTap={tap}
        className={className}
        {...rest}
      >
        {children}
      </m.button>
    </MotionBoundary>
  );
}
