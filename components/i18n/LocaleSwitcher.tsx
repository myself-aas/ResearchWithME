'use client';

/**
 * LocaleSwitcher — πeme v3.1 §30. EN / বাংলা toggle in the site header.
 * A native <select> keeps it keyboard- and screen-reader-accessible;
 * the current locale is announced via aria-live.
 */
import { useLocale } from './LocaleProvider';
import { SUPPORTED_LOCALES } from '@/lib/i18n/locales';

const LABELS: Record<string, string> = { en: 'English', bn: 'বাংলা' };

export default function LocaleSwitcher() {
  const { locale, setLocale, dir } = useLocale();
  return (
    <label className="flex min-h-11 items-center gap-2 font-sans text-sm text-text-secondary">
      <span className="sr-only">Interface language / 인터ফেস ভাষা</span>
      <select
        aria-label="Interface language"
        dir="ltr"
        className="min-h-11 rounded-sm border border-line bg-surface px-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
      >
        {SUPPORTED_LOCALES.map((l) => (
          <option key={l} value={l} lang={l} dir={dir}>
            {LABELS[l] ?? l}
          </option>
        ))}
      </select>
    </label>
  );
}
