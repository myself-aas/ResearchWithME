'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { Moon, Sun } from 'lucide-react';
import { EASING } from '@/lib/motion/tokens';
import Pressable from './motion/Pressable';

export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'rwm-theme';

export function resolveEffectiveTheme(pref: ThemePreference, prefersDark: boolean): 'light' | 'dark' {
  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';
  return prefersDark ? 'dark' : 'light';
}

function applyDocumentTheme(effective: 'light' | 'dark', explicit: ThemePreference) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', effective === 'dark');
  document.documentElement.classList.toggle('light', explicit === 'light');
}

export default function ThemeToggle() {
  const [effective, setEffective] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      const pref: ThemePreference =
        stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'system';
      const prefersDark = Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
      const resolved = resolveEffectiveTheme(pref, prefersDark);
      setEffective(resolved);
      applyDocumentTheme(resolved, pref);
    } catch {
      /* storage unavailable */
    }
  }, []);

  function toggleTheme() {
    const next: 'light' | 'dark' = effective === 'dark' ? 'light' : 'dark';
    setEffective(next);
    applyDocumentTheme(next, next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }

  const label =
    effective === 'dark'
      ? 'Switch to light theme'
      : 'Switch to dark theme';

  return (
    <Pressable
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex min-h-11 min-w-11 items-center justify-center overflow-hidden rounded-sm border border-line bg-surface text-ink transition-colors hover:bg-surface-subtle"
    >
      <AnimatePresence initial={false} mode="wait">
        <m.span
          key={effective}
          initial={{ rotate: -60, opacity: 0, scale: 0.6, y: 6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1, y: 0 }}
          exit={{ rotate: 60, opacity: 0, scale: 0.6, y: -6 }}
          transition={{ duration: 0.2, ease: [...EASING.emphasize] }}
          className="inline-flex"
        >
          {effective === 'dark' ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
        </m.span>
      </AnimatePresence>
    </Pressable>
  );
}
