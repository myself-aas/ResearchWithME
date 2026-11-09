/**
 * Locale infrastructure — πeme v3.1 §30 (English + Bangla core, RTL verified
 * with Arabic). BCP 47 tags, RTL map, and direction helpers.
 */

export type Locale = 'en' | 'bn';

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'bn'];
export const DEFAULT_LOCALE: Locale = 'en';

/** Cookie key used to persist the interface locale for server rendering. */
export const LOCALE_COOKIE = 'pieme-locale';

/** Locales that render right-to-left (Arabic used for RTL verification). */
export const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

const BCP47_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i;

export function isValidBcp47(tag: string): boolean {
  return BCP47_RE.test(tag.trim());
}

export function isSupportedLocale(tag: string): tag is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(tag);
}

/** Resolve a BCP 47 tag to a supported locale, falling back to default. */
export function resolveLocale(tag: string): Locale {
  if (!isValidBcp47(tag)) return DEFAULT_LOCALE;
  const base = tag.split('-')[0].toLowerCase();
  return isSupportedLocale(base) ? base : DEFAULT_LOCALE;
}

export function isRTL(tag: string): boolean {
  if (!isValidBcp47(tag)) return false;
  return RTL_LOCALES.has(tag.split('-')[0].toLowerCase());
}

export function dirOf(tag: string): 'ltr' | 'rtl' {
  return isRTL(tag) ? 'rtl' : 'ltr';
}
