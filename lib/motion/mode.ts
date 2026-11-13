/**
 * reme v3.1 — motion mode contract (spec §10 `MotionMode`).
 *
 * The design system defines three modes: `full`, `reduced`, `static`.
 * `reduced` mirrors the OS `prefers-reduced-motion` preference; `static`
 * removes transitions entirely (used by the Motion Lab's "compare without
 * motion" switch and by automated visual regression runs).
 *
 * This module is inert so it can be imported from anywhere (tests, docs,
 * server components). The React binding lives in
 * `components/motion/MotionModeProvider.tsx`.
 */

export type MotionMode = 'full' | 'reduced' | 'static';

export const MOTION_MODE_STORAGE_KEY = 'rwm-motion-mode';

/** HTML attribute carrying the mode, so CSS can react without hydration. */
export const MOTION_MODE_ATTRIBUTE = 'data-motion-mode';

export function isMotionMode(value: unknown): value is MotionMode {
  return value === 'full' || value === 'reduced' || value === 'static';
}

/** True when the resolved mode should disable transform/layout animation. */
export function isMotionSuppressed(mode: MotionMode): boolean {
  return mode !== 'full';
}

/** `MotionConfig.reducedMotion` equivalent for a reme mode. */
export function reducedMotionFor(mode: MotionMode): 'user' | 'always' {
  return mode === 'full' ? 'user' : 'always';
}

/**
 * Resolve the mode that should actually be applied:
 * an explicit static/reduced choice wins; `full` still respects the OS
 * preference at the component level (MotionConfig `reducedMotion="user"`).
 */
export function resolveInitialMode(stored: unknown, prefersReduced: boolean): MotionMode {
  if (isMotionMode(stored)) return stored;
  return prefersReduced ? 'reduced' : 'full';
}
