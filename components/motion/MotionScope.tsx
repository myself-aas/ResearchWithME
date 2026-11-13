'use client';

/**
 * MotionScope — the single Motion runtime boundary for a surface.
 *
 * `LazyMotion` keeps the feature bundle out of the initial JavaScript: only
 * the `m` component ships with the shell, while `domMax` arrives in its own
 * chunk (./features.ts). Every primitive in this folder renders `m.*` instead
 * of the heavier `motion.*`, and the feature code is shared by every scope on
 * the page.
 *
 * `MotionConfig` carries three system-wide decisions:
 *  - `reducedMotion` from the reader's reme motion mode (full/reduced/static);
 *  - the default transition (`reveal`, 200ms, standard easing) so a primitive
 *    that forgets to name one still lands inside the §9 budget;
 *  - `transition.layout` for shared-layout moves (slow in/slow out).
 *
 * `MotionBoundary` makes every primitive self-sufficient: when a primitive is
 * rendered outside a scope (unit tests, isolated stories, an MDX embed) it
 * wraps itself once. In the app the root layout already provides the scope, so
 * the boundary is a plain fragment and costs nothing.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'motion/react';
import { reducedMotionFor } from '@/lib/motion/mode';
import { SPRING, TRANSITION } from '@/lib/motion/tokens';
import { useMotionMode } from './MotionModeProvider';

const ScopeContext = createContext(false);

/**
 * Feature bundle loader. Kept as a module-level function so `LazyMotion` only
 * calls it once per scope, and so webpack can put `domMax` in its own chunk
 * (see ./features.ts).
 */
const loadFeatures = () => import('./features').then((module) => module.default);

export function useInMotionScope(): boolean {
  return useContext(ScopeContext);
}

export interface MotionScopeProps {
  children: ReactNode;
  /** Set to false to skip the scope when the caller knows one exists. */
  nested?: boolean;
}

export default function MotionScope({ children }: MotionScopeProps) {
  const { mode } = useMotionMode();

  return (
    <ScopeContext.Provider value={true}>
      <LazyMotion features={loadFeatures} strict={false}>
        <MotionConfig reducedMotion={reducedMotionFor(mode)} transition={TRANSITION.reveal}>
          {children}
        </MotionConfig>
      </LazyMotion>
    </ScopeContext.Provider>
  );
}

/** Ensures `m.*` has a feature bundle without adding DOM when one exists. */
export function MotionBoundary({ children }: { children: ReactNode }) {
  const scoped = useInMotionScope();
  if (scoped) return <>{children}</>;
  return <MotionScope>{children}</MotionScope>;
}

/** Default transition for layout-driven primitives. */
export const LAYOUT_TRANSITION = { layout: SPRING.layout };
