'use client';

/**
 * useArmedReveal — the shared "arm only what is below the fold" mechanism.
 *
 * Used by `Reveal` and `Stagger`. Extracted because the correctness argument
 * (see Reveal) is worth stating once: SSR output stays visible, the hidden
 * pose is adopted inside a layout effect (before paint), and reduced motion
 * bypasses the whole thing.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  useAnimationControls,
  useInView,
  useReducedMotion,
  type UseInViewOptions,
} from 'motion/react';

export interface ArmedRevealOptions {
  once?: boolean;
  amount?: UseInViewOptions['amount'];
  margin?: UseInViewOptions['margin'];
  /** Fraction of the viewport below which content counts as "below the fold". */
  foldRatio?: number;
}

export interface ArmedReveal<T extends HTMLElement> {
  ref: React.RefObject<T | null>;
  controls: ReturnType<typeof useAnimationControls>;
  inView: boolean;
  reducedMotion: boolean | null;
}

export function useArmedReveal<T extends HTMLElement = HTMLDivElement>(
  options: ArmedRevealOptions = {},
): ArmedReveal<T> {
  const { once = true, amount = 0.18, margin = '0px 0px -10% 0px', foldRatio = 0.9 } = options;
  const reducedMotion = useReducedMotion();
  const ref = useRef<T | null>(null);
  const controls = useAnimationControls();
  const inView = useInView(ref, { once, amount, margin });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || reducedMotion || typeof IntersectionObserver === 'undefined') return;
    const viewport = window.innerHeight || 0;
    const rect = node.getBoundingClientRect();
    if (rect.top <= viewport * foldRatio) {
      // Already on screen: never hide it. The CSS page settle owns this beat.
      controls.set('visible');
      return;
    }
    controls.set('hidden');
    node.style.willChange = 'opacity, transform';
  }, [controls, reducedMotion, foldRatio]);

  useEffect(() => {
    if (!inView) return;
    void controls.start('visible').then(() => {
      if (ref.current) ref.current.style.willChange = '';
    });
  }, [controls, inView]);

  return { ref, controls, inView, reducedMotion };
}
