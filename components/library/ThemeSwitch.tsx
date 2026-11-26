'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import FigureChrome, { READOUT_CLASS } from './FigureChrome';
import {
  applyDocumentTheme,
  normalizeThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/lib/theme';

/**
 * ThemeSwitch — archetype `segmented-swatch-toggle` (the site's chrome
 * figure, FIGURE_CONSTITUTION.md Article 3 "chrome figures").
 *
 * One control everywhere the theme can change: the mobile drawer row, the
 * desktop header button, the /lab registry demo, and — because registration
 * in the registry makes it generative UI — inside the assistant thread,
 * where a reader can literally ask to switch themes and flip it there.
 *
 * The control owns no theme logic of its own: it reads and writes the same
 * `lib/theme` storage key the pre-paint script bootstraps from, applies the
 * document theme through the shared helpers, and announces every change on
 * the `rwm-theme-change` DOM event so the pre-paint closure, sibling
 * controls, and other tabs stay in agreement. SSR renders the `system`
 * state; the first effect reconciles with storage — no layout shift, no
 * flash (the document class is already correct).
 */

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];
const LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};
const LONG_LABELS: Record<ThemePreference, string> = {
  system: 'Follow the system theme',
  light: 'Always light',
  dark: 'Always dark',
};

function useThemePreference(): [ThemePreference, boolean, (next: ThemePreference) => void] {
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
    // Same-tab agreement: sibling controls (drawer, header, thread) listen
    // for the DOM event this control dispatches when it applies a choice.
    const onDomChange = (event: Event) => {
      const detail = (event as CustomEvent<ThemePreference>).detail;
      if (detail) setPreference(normalizeThemePreference(detail));
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('rwm-theme-change', onDomChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('rwm-theme-change', onDomChange);
    };
  }, []);

  function choose(next: ThemePreference) {
    setPreference(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore: the current session can still apply the theme.
    }
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    applyDocumentTheme(next, Boolean(query?.matches));
    window.dispatchEvent(new CustomEvent<ThemePreference>('rwm-theme-change', { detail: next }));
  }

  return [preference, ready, choose];
}

function SegmentIcon({ preference }: { preference: ThemePreference }) {
  const Icon = preference === 'light' ? Sun : preference === 'dark' ? Moon : Monitor;
  return <Icon className="h-4 w-4" aria-hidden="true" />;
}

/**
 * The segmented control itself: a real radiogroup with roving tabindex, a
 * sliding indicator (informational motion — it shows which segment owns the
 * state — with a motion-reduce fallback), and an aria-live readout.
 */
export function ThemeSwitchControl() {
  const [preference, ready, choose] = useThemePreference();

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="relative flex rounded-full border border-line bg-canvas p-1"
        onKeyDown={(event) => {
          const index = ORDER.indexOf(preference);
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            event.preventDefault();
            choose(ORDER[(index + 1) % ORDER.length]);
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault();
            choose(ORDER[(index - 1 + ORDER.length) % ORDER.length]);
          }
        }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1 w-[calc(33.333%-0.1667rem)] rounded-full bg-selection transition-[left] duration-300 ease-standard motion-reduce:transition-none"
          style={{ left: `calc(${ORDER.indexOf(preference) * 33.333}% + 0.1667rem)` }}
        />
        {ORDER.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={preference === option}
            tabIndex={preference === option ? 0 : -1}
            onClick={() => choose(option)}
            aria-label={`${LONG_LABELS[option]}${ready && preference === option ? ' (current)' : ''}`}
            className={`relative z-10 inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-2 font-sans text-xs font-medium transition-colors duration-200 ease-standard focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none ${
              preference === option ? 'text-brand' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <SegmentIcon preference={option} />
            {LABELS[option]}
          </button>
        ))}
      </div>
      <p aria-live="polite" className={`${READOUT_CLASS} mt-2`}>
        {ready ? `${LABELS[preference]} theme — ${LONG_LABELS[preference]}` : 'Theme follows the system'}
      </p>
    </div>
  );
}

/**
 * Compact cycle button for tight chrome (the desktop header): same control
 * state, one button, 44×44px accessible touch target.
 */
export function ThemeSwitchCompact({ className = 'inline-flex' }: { className?: string } = {}) {
  const [preference, ready, choose] = useThemePreference();
  return (
    <button
      type="button"
      onClick={() => choose(ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length])}
      aria-label={ready ? `${LABELS[preference]} theme — switch theme` : 'Switch theme'}
      title={ready ? `${LABELS[preference]} theme` : 'Switch theme'}
      className={`${className} h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-secondary transition-colors duration-200 ease-standard hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none`}
    >
      <SegmentIcon preference={preference} />
    </button>
  );
}

/**
 * The registered figure: the control framed by the shared chrome so the
 * assistant thread (and /lab) render it like any other figure.
 */
export default function ThemeSwitch() {
  return (
    <FigureChrome
      title="Theme, as a figure"
      subtitle="The site's own theme switch, maintained like every figure: one component, rendered here, in the drawer and header, and inside the assistant thread — switching themes from chat works, because it is the same control bound to the same state."
    >
      <ThemeSwitchControl />
    </FigureChrome>
  );
}
