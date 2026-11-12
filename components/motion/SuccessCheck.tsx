'use client';

/**
 * SuccessCheck — confirmation feedback for copy/save/verify actions.
 *
 * Principles: 1 (squash & stretch — the disc pops then settles), 7 (arc — the
 * tick is drawn along its own path, not faded), 8 (secondary action — the draw
 * follows the pop by ~80ms), 10 (exaggeration — bounded overshoot to 1.12),
 * 12 (appeal).
 *
 * Accessibility: the icon is decorative; the caller already renders the
 * changed text label ("Copied", "Saved"). No `aria-live` is added here to
 * avoid double announcements.
 *
 * SSR: `initial={false}` means the tick's geometry is never emitted as
 * "not-yet-drawn", so the check is complete for clients without JavaScript.
 */

import * as m from 'motion/react-m';
import { EASING, SPRING } from '@/lib/motion/tokens';
import { useHydratedReducedMotion } from '@/lib/motion/hooks';
import { MotionBoundary } from './MotionScope';

export interface SuccessCheckProps {
  /** Outer diameter in px. Default 16. */
  size?: number;
  className?: string;
  /** Skip the pop, keep only the draw (e.g. inside a dense table row). */
  quiet?: boolean;
}

export default function SuccessCheck({ size = 16, className = '', quiet = false }: SuccessCheckProps) {
  const reduce = useHydratedReducedMotion();

  return (
    <MotionBoundary>
      <m.svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        aria-hidden="true"
        className={className}
        initial={false}
        animate={reduce || quiet ? undefined : { scale: [0.82, 1.12, 1], rotate: [-8, 2, 0] }}
        transition={{ duration: 0.42, times: [0, 0.6, 1], ease: [...EASING.emphasize] }}
        style={{ transformOrigin: '50% 50%' }}
      >
        <m.circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="1.75"
          initial={false}
          animate={reduce ? undefined : { scale: [0.9, 1], opacity: [0.4, 1] }}
          transition={SPRING.expressive}
          style={{ transformOrigin: '50% 50%' }}
        />
        <m.path
          d="M6.75 12.4 10.4 16 17.4 8.6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          initial={false}
          animate={reduce ? undefined : { pathLength: [0, 1] }}
          transition={{ duration: 0.4, ease: [...EASING.enter], delay: 0.08 }}
        />
      </m.svg>
    </MotionBoundary>
  );
}
