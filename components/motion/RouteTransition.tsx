'use client';

/**
 * RouteTransition — the client-navigation beat.
 *
 * The first paint is intentionally **not** animated here: globals.css already
 * runs a no-JavaScript "page settle" (200ms, standard easing) on `<main>`, and
 * duplicating it would double the motion. This component only plays when the
 * pathname changes *after* hydration (a next/link navigation), where the CSS
 * animation has already run once and will not replay.
 *
 * Principle 4 (pose to pose): one start pose, one end pose, no free-running
 * tween. Principle 6 (slow in/out): standard easing. Principle 9 (timing):
 * exactly the 200ms reveal budget — a route change is not a spectacle.
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAnimationControls, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { EASING } from '@/lib/motion/tokens';
import { MotionBoundary } from './MotionScope';

export interface RouteTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export default function RouteTransition({ children, className }: RouteTransitionProps) {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  const controls = useAnimationControls();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (previous.current === null) {
      // First render: let the CSS page settle own this beat.
      previous.current = pathname;
      return;
    }
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (reduce) return;
    void controls.start('nav');
  }, [pathname, reduce, controls]);

  return (
    <MotionBoundary>
      <m.div
        className={className}
        animate={controls}
        variants={{
          nav: {
            opacity: [0.82, 1],
            y: [6, 0],
            transition: { duration: 0.2, ease: [...EASING.standard] },
          },
        }}
      >
        {children}
      </m.div>
    </MotionBoundary>
  );
}
