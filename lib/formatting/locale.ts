/**
 * English-first formatting utilities (`lib/formatting/locale.ts`).
 *
 * Keeps deterministic UTC date/number formatting centralized behind a clean
 * locale-parameterized interface while preserving English-only runtime copy.
 */

export type SupportedLocale = 'en';
export type TextDirection = 'ltr' | 'rtl';

export interface LocaleConfig {
  code: SupportedLocale;
  label: string;
  dir: TextDirection;
}

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const LOCALE_CONFIGS: Record<SupportedLocale, LocaleConfig> = {
  en: {
    code: 'en',
    label: 'English',
    dir: 'ltr',
  },
};

export function getLocaleConfig(locale: SupportedLocale = DEFAULT_LOCALE): LocaleConfig {
  return LOCALE_CONFIGS[locale] ?? LOCALE_CONFIGS.en;
}

export function formatShortDate(isoDate: string, locale: SupportedLocale = DEFAULT_LOCALE): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed);
}

export const formatDate = formatShortDate;

export function formatCompactNumber(value: number, locale: SupportedLocale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatRelativeMinutes(isoDate: string, nowMs = Date.now()): string {
  const parsed = new Date(isoDate).getTime();
  if (Number.isNaN(parsed)) return 'recently';
  const diffSec = Math.max(0, Math.round((nowMs - parsed) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.round(diffHr / 24);
  return `${diffDays}d ago`;
}
