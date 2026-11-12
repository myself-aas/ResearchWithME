'use client';

/**
 * Shared motion hooks — the only place lifecycle/timing logic lives.
 *
 * Each hook exists because a principle cannot be implemented correctly inside
 * a single component:
 *
 * - `useDelayedLoading` implements the animation-principles timing contract
 *   for loading states: appear after 200ms, stay for at least 500ms, so a fast
 *   response never flashes a spinner and a slow one feels acknowledged.
 * - `useScrollProgress` maps scroll to a spring-smoothed MotionValue (the
 *   reading indicator is scroll-linked linear motion; the spring supplies
 *   slow-in/slow-out without the user driving jitter).
 * - `useWarmImport` starts a dynamic import on intent (hover/focus/touch) so a
 *   lazy panel is already parsed by the time it opens.
 * - `useWhileInView` is not re-exported: `motion`'s `useInView` is used
 *   directly by `Reveal`, with arming logic local to that primitive.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import { SPRING } from './tokens';

export interface DelayedLoadingOptions {
  /** How long to wait before showing an indicator. Default 200ms. */
  delay?: number;
  /** Minimum time the indicator stays once shown. Default 500ms. */
  minDuration?: number;
}

/**
 * Returns `true` only while a loading indicator should be visible.
 *
 * ```tsx
 * const showSkeleton = useDelayedLoading(pending, { delay: 200, minDuration: 500 });
 * ```
 */
export function useDelayedLoading(loading: boolean, options: DelayedLoadingOptions = {}): boolean {
  const { delay = 200, minDuration = 500 } = options;
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (loading) {
      if (visible) return;
      const timer = window.setTimeout(() => {
        shownAt.current = performance.now();
        setVisible(true);
      }, delay);
      return () => window.clearTimeout(timer);
    }

    if (!visible) return;
    const elapsed = performance.now() - shownAt.current;
    const remaining = Math.max(0, minDuration - elapsed);
    const timer = window.setTimeout(() => setVisible(false), remaining);
    return () => window.clearTimeout(timer);
  }, [loading, visible, delay, minDuration]);

  return visible;
}

export interface ScrollProgressResult {
  /** 0–1, un-smoothed. */
  raw: MotionValue<number>;
  /** 0–1, spring-smoothed for display. */
  smooth: MotionValue<number>;
  /** 0–100, rounded, safe to render as text and to write to aria-valuenow. */
  percent: number;
}

/**
 * Scroll-linked progress for reading surfaces.
 * The spring replaces the previous `requestAnimationFrame` throttle: it keeps
 * the bar from snapping when the user jumps to an anchor.
 */
export function useScrollProgress(): ScrollProgressResult {
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, SPRING.scroll);
  const percentValue = useTransform(smooth, (value) => Math.round(Math.min(1, Math.max(0, value)) * 100));
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const unsubscribe = percentValue.on('change', (value) => {
      setPercent((previous) => (previous === value ? previous : value));
    });
    return unsubscribe;
  }, [percentValue]);

  return { raw: scrollYProgress, smooth, percent };
}

/** Spring-smoothed 0–1 value driven by an external signal (e.g. hover focus). */
export function useSmoothedValue(value: number): MotionValue<number> {
  const source = useMotionValue(value);
  const smoothed = useSpring(source, SPRING.lift);
  useEffect(() => {
    source.set(value);
  }, [source, value]);
  return smoothed;
}

export interface WarmImportHandlers {
  onMouseEnter: () => void;
  onFocus: () => void;
  onPointerDown: () => void;
}

/**
 * Begin a code-split import on user intent instead of on mount.
 *
 * The loader is idempotent (the bundler caches the module), and we only call
 * it once per mount to avoid repeated microtask churn.
 */
export function useWarmImport(loader: () => Promise<unknown>, enabled = true): WarmImportHandlers {
  const warmed = useRef(false);
  const warm = useCallback(() => {
    if (!enabled || warmed.current) return;
    warmed.current = true;
    void loader().catch(() => {
      // A failed warm-up is invisible: the real import will retry on demand.
      warmed.current = false;
    });
  }, [enabled, loader]);

  return { onMouseEnter: warm, onFocus: warm, onPointerDown: warm };
}

/** True once the component has hydrated; used to keep SSR markup motion-free. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

/** `true` when the primary pointer can hover — gates hover-only affordances. */
export function useCanHover(): boolean {
  const [canHover, setCanHover] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return canHover;
}

/**
 * `useReducedMotion()` that is safe to branch render output on.
 *
 * On the server the reader's preference is unknown (`useReducedMotion()` is
 * `null`), so markup is rendered as if motion is allowed. A client that
 * prefers reduced motion would otherwise render different `animate` targets
 * on its first pass and trip a hydration attribute mismatch. This returns
 * `false` until hydration — matching the server — and the real preference
 * afterwards. Motion values are still suppressed globally by MotionConfig
 * `reducedMotion`, so nothing animates in that first frame.
 *
 * Use it wherever the result changes JSX (props such as `animate`); effects
 * can keep using `useReducedMotion()` directly.
 */
export function useHydratedReducedMotion(): boolean {
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  return hydrated && Boolean(reduce);
}
