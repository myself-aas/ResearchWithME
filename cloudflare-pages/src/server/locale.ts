/**
 * Pages adapter for interface locale resolution (πeme v3.1 §30).
 *
 * Reads the `pieme-locale` cookie from the request's cookie jar, validates
 * it as BCP 47 and collapses onto the supported set — the same rule the
 * browser LocaleProvider applies before mirroring the choice to
 * localStorage + the cookie. `lib/i18n/server.ts` keeps the Next-only
 * `getRequestLocale()`/`getRequestDir()` API for the Next build until
 * Task 16; nothing in this bundle may import `next/headers`.
 */
import type { RequestContext } from './context';
import { DEFAULT_LOCALE, LOCALE_COOKIE, resolveLocale, type Locale } from '@/lib/i18n/locales';

export function getRequestLocale(ctx: RequestContext): Locale {
  const raw = ctx.cookies.getAll().find((entry) => entry.name === LOCALE_COOKIE)?.value;
  return raw === undefined ? DEFAULT_LOCALE : resolveLocale(raw);
}
