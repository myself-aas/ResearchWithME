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

  const choices = [
    { value: 'light', label: 'Light', path: 'M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 80q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480q0 83-58.5 141.5T480-280ZM200-440H40v-80h160v80Zm720 0H760v-80h160v80ZM440-760v-160h80v160h-80Zm0 720v-160h80v160h-80ZM256-650l-101-97 57-59 96 100-52 56Zm492 496-97-101 53-55 101 97-57 59Zm-98-550 97-101 59 57-100 96-56-52ZM154-212l101-97 55 53-97 101-59-57Zm326-268Z' },
    { value: 'dark', label: 'Dark', path: 'M480-120q-150 0-255-105T120-480q0-150 105-255t255-105q14 0 27.5 1t26.5 3q-41 29-65.5 75.5T444-660q0 90 63 153t153 63q55 0 101-24.5t75-65.5q2 13 3 26.5t1 27.5q0 150-105 255T480-120Zm0-80q88 0 158-48.5T740-375q-20 5-40 8t-40 3q-123 0-209.5-86.5T364-660q0-20 3-40t8-40q-78 32-126.5 102T200-480q0 116 82 198t198 82Zm-10-270Z' },
    { value: 'system', label: 'System', path: null },
  ] as const;

  return (
    <fieldset>
      <legend className="font-sans text-sm font-semibold text-ink">Theme</legend>
      <p className="mt-1 text-sm text-ink-secondary">Choose a theme or follow your device settings. Currently {effective}.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {choices.map((choice) => (
          <label key={choice.value} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors ${preference === choice.value ? 'border-brand bg-surface-subtle text-ink' : 'border-line text-ink-secondary hover:bg-surface-subtle hover:text-ink'} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand`}>
            <input type="radio" name="theme" value={choice.value} checked={preference === choice.value} onChange={(event) => choose(event.target.value)} className="h-4 w-4 shrink-0 accent-brand" />
            {choice.path && <svg aria-hidden="true" viewBox="0 -960 960 960" className="h-5 w-5 fill-current"><path d={choice.path} /></svg>}
            {choice.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
