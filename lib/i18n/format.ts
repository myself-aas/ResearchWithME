/**
 * Locale-aware formatting — πeme v3.1 §30: BCP 47 tags and Intl formatting.
 */
import { isValidBcp47, resolveLocale, type Locale } from './locales';

export function formatDate(isoUtc: string, locale: Locale | string = 'en'): string {
  const tag = isValidBcp47(locale) ? locale : resolveLocale(String(locale));
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return isoUtc;
  return new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeZone: 'UTC' }).format(d);
}

export function formatNumber(value: number, locale: Locale | string = 'en'): string {
  const tag = isValidBcp47(locale) ? locale : resolveLocale(String(locale));
  return new Intl.NumberFormat(tag).format(value);
}

export function formatDateTime(isoUtc: string, locale: Locale | string = 'en'): string {
  const tag = isValidBcp47(locale) ? locale : resolveLocale(String(locale));
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return isoUtc;
  return new Intl.DateTimeFormat(tag, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(d);
}
