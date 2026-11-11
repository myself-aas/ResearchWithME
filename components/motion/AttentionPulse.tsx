'use client';

/**
 * AttentionPulse — a bounded, self-stopping attention cue.
 *
 * Principle 10 (exaggeration) constrained by the animation-principles
 * attention-grabbers rules:
 *  - maximum scale 1.15, easing in/out (never a hard bounce);
 *  - **stops after `cycles` (default 3) or ~6 seconds** — no infinite loop;
 *  - only one attention animation should be visible at a time (caller);
 *  - reduced motion shows the static element only, and the announcement is
 *    always carried by text (a live region or label), never by the pulse.
 *
 * Used for the reading-list badge when the count increases, and in the Motion
 * Lab's exaggeration demo.
 */

import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { MotionBoundary } from './MotionScope';

export interface AttentionPulseProps {
  /** Start pulsing when this flips to true. */
  active: boolean;
  /** Maximum scale. Clamped to the 1.15 ceiling. */
  scale?: number;
  /** Number of pulses. Clamped to 3. */
  cycles?: number;
  children: React.ReactNode;
  className?: string;
}

export default function AttentionPulse({
  active,
  scale = 1.15,
  cycles = 3,
  children,
  className,
}: AttentionPulseProps) {
  const reduce = useReducedMotion();
  const ceiling = Math.min(scale, 1.15);
  const pulses = Math.max(1, Math.min(cycles, 3));

  return (
    <MotionBoundary>
      <m.span
        className={`inline-flex ${className}`}
        initial={false}
        animate={
          active && !reduce
            ? { scale: [1, ceiling, 1] }
            : { scale: 1 }
        }
        transition={
          active && !reduce
            ? { duration: 1.1, times: [0, 0.5, 1], repeat: pulses - 1, repeatType: 'loop', ease: 'easeInOut' }
            : undefined
        }
        style={{ transformOrigin: '50% 50%' }}
      >
        {children}
      </m.span>
    </MotionBoundary>
  );
}
