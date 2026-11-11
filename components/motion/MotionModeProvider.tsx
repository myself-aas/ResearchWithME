'use client';

/**
 * MotionModeProvider — πeme v3.1 §10 motion modes (`full` · `reduced` · `static`).
 *
 * The provider does three things:
 *  1. persists the reader's choice (`rwm-motion-mode`) next to the theme;
 *  2. mirrors it onto `<html data-motion-mode>` so CSS can switch without
 *     hydration (see the `[data-motion-mode="static"]` block in globals.css);
 *  3. exposes `mode` and `setMode` to MotionScope, which forwards it to
 *     `MotionConfig reducedMotion`.
 *
 * Default behaviour: follow the operating system. An explicit choice always
 * wins, and `full` still respects `prefers-reduced-motion` at the component
 * level because MotionConfig is told `reducedMotion="user"`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  MOTION_MODE_ATTRIBUTE,
  MOTION_MODE_STORAGE_KEY,
  isMotionMode,
  resolveInitialMode,
  type MotionMode,
} from '@/lib/motion/mode';
import { prefersReducedMotion } from '@/lib/motion/tokens';

interface MotionModeContextValue {
  mode: MotionMode;
  setMode: (mode: MotionMode) => void;
  /** True when the reader asked for no transform/layout animation. */
  suppressed: boolean;
}

const MotionModeContext = createContext<MotionModeContextValue>({
  mode: 'full',
  setMode: () => {},
  suppressed: false,
});

export function useMotionMode(): MotionModeContextValue {
  return useContext(MotionModeContext);
}

export default function MotionModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<MotionMode>('full');

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(MOTION_MODE_STORAGE_KEY);
    } catch {
      /* storage blocked — fall back to the media query */
    }
    const resolved = resolveInitialMode(stored, prefersReducedMotion());
    setModeState(resolved);
    document.documentElement.setAttribute(MOTION_MODE_ATTRIBUTE, resolved);
  }, []);

  const setMode = useCallback((next: MotionMode) => {
    if (!isMotionMode(next)) return;
    setModeState(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute(MOTION_MODE_ATTRIBUTE, next);
    }
    try {
      window.localStorage.setItem(MOTION_MODE_STORAGE_KEY, next);
    } catch {
      /* storage blocked — the in-memory mode still applies */
    }
  }, []);

  const value = useMemo<MotionModeContextValue>(
    () => ({ mode, setMode, suppressed: mode !== 'full' }),
    [mode, setMode],
  );

  return <MotionModeContext.Provider value={value}>{children}</MotionModeContext.Provider>;
}
