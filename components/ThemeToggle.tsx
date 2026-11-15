'use client';

import { useEffect, useState } from 'react';
import {
  applyDocumentTheme,
  normalizeThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/lib/theme';

export { resolveEffectiveTheme, THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme';

const THEME_CHANGE_EVENT = 'rwm-theme-change';

export default function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [effective, setEffective] = useState<'light' | 'dark'>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setPreference(normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY)));
    } catch {
      // Storage denial does not prevent system mode or an in-memory choice.
    }
    setReady(true);
    const onChange = (event: Event) => setPreference(normalizeThemePreference((event as CustomEvent).detail));
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setPreference(normalizeThemePreference(event.newValue));
      }
    };
    window.addEventListener(THEME_CHANGE_EVENT, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    const update = () => setEffective(applyDocumentTheme(preference, Boolean(query?.matches)));
    update();
    if (preference !== 'system' || !query) return;
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [preference, ready]);

  function choose(value: string) {
    const next = normalizeThemePreference(value);
    setPreference(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The current session's explicit choice remains usable.
    }
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: next }));
  }

  return (
    <label className="inline-flex min-h-11 items-center rounded-sm border border-line bg-surface text-ink">
      <span className="sr-only">Theme</span>
      <select
        value={preference}
        onChange={(event) => choose(event.target.value)}
        aria-label="Theme"
        title={`Theme: ${preference} (currently ${effective})`}
        className="min-h-11 max-w-full rounded-sm bg-surface px-2 font-sans text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:text-sm"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
