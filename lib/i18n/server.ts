/**
 * Server-side locale resolution — πeme v3.1 §30 route wiring.
 * Reads the `pieme-locale` cookie (set by the client LocaleProvider),
 * validates it as BCP 47, and resolves to a supported locale.
 * Usage in a server component / layout:
 *   const locale = await getRequestLocale();
 *   <html lang={locale} dir={dirOf(locale)}>
 */
import { cookies } from 'next/headers';
import { resolveLocale, dirOf, LOCALE_COOKIE, type Locale } from './locales';

export { LOCALE_COOKIE };

export async function getRequestLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get(LOCALE_COOKIE)?.value ?? 'en';
  return resolveLocale(raw);
}

export async function getRequestDir(): Promise<'ltr' | 'rtl'> {
  return dirOf((await getRequestLocale()) ?? 'en');
}
