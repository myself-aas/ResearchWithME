'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import {
  applyDocumentTheme,
  normalizeThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/lib/theme';

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];
const LABELS: Record<ThemePreference, string> = {
  system: 'System theme',
  light: 'Light theme',
  dark: 'Dark theme',
};

/**
 * One-button theme control: cycles system → light → dark and persists the
 * choice. The pre-paint script in the root layout owns the first frame, so this
 * button only reflects and forwards a preference.
 */
export default function ThemeMenu() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setPreference(normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY)));
    } catch {
      // Storage denial leaves the in-memory choice usable.
    }
    setReady(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setPreference(normalizeThemePreference(event.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // While the preference is `system`, follow OS-level theme changes live.
  useEffect(() => {
    if (preference !== 'system') return;
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return;
    const update = () => applyDocumentTheme('system', query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [preference]);

  function choose(next: ThemePreference) {
    setPreference(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore: the current session can still apply the theme.
    }
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    applyDocumentTheme(next, Boolean(query?.matches));
  }

  function cycle() {
    const index = ORDER.indexOf(preference);
    choose(ORDER[(index + 1) % ORDER.length]);
  }

  const Icon = preference === 'light' ? Sun : preference === 'dark' ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={ready ? `${LABELS[preference]} — switch theme` : 'Switch theme'}
      title={ready ? LABELS[preference] : 'Switch theme'}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink-secondary transition-colors hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
