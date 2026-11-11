'use client';

/**
 * LocaleSwitcher — πeme v3.1 §30. EN / বাংলা toggle in the site header.
 * A native <select> keeps it keyboard- and screen-reader-accessible;
 * the <label> supplies the accessible name without triggering WCAG 2.5.3
 * option-text mismatch on select[aria-label].
 */
import { useId } from 'react';
import { useLocale } from './LocaleProvider';
import { SUPPORTED_LOCALES } from '@/lib/i18n/locales';

const LABELS: Record<string, string> = { en: 'English', bn: 'বাংলা' };

export default function LocaleSwitcher() {
  const { locale, setLocale, dir } = useLocale();
  const selectId = useId();
  return (
    <div role="group" aria-label="Interface language" className="flex min-h-11 items-center font-sans text-xs text-ink-secondary">
      <label htmlFor={selectId} className="sr-only">
        Interface language / ইন্টারফেস ভাষা
      </label>
      <select
        id={selectId}
        dir="ltr"
        className="min-h-11 rounded-sm border border-line bg-surface px-2.5 font-mono text-xs font-medium text-ink transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l} value={l} lang={l} dir={dir}>
            {LABELS[l] ?? l}
          </option>
        ))}
      </select>
    </div>
  );
}
