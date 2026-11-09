'use client';

/**
 * LocaleProvider — πeme v3.1 §30 route-level wiring.
 *
 * Holds the active locale in React context, mirrors it onto
 * <html lang dir> (Bangla stays LTR; Arabic-style RTL verified in tests),
 * persists the choice to localStorage + the `pieme-locale` cookie so the
 * server (lib/i18n/server.ts) can render the resolved attributes on the
 * next request. Interface locale never changes content language — scholarly
 * objects keep their own `lang` attributes (§30).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, LOCALE_COOKIE, SUPPORTED_LOCALES, dirOf, isValidBcp47, resolveLocale, type Locale } from '@/lib/i18n/locales';
import { t, type MessageKey } from '@/lib/i18n';

interface LocaleContextValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: string) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  dir: 'ltr',
  setLocale: () => {},
  t: (key, vars) => t(DEFAULT_LOCALE, key, vars),
});

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

export default function LocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: string }) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveLocale(initialLocale ?? DEFAULT_LOCALE));

  const setLocale = useCallback((next: string) => {
    if (!isValidBcp47(next)) return;
    const resolved = resolveLocale(next);
    setLocaleState(resolved);
    try {
      localStorage.setItem(LOCALE_COOKIE, resolved);
      document.cookie = `${LOCALE_COOKIE}=${resolved};path=/;max-age=31536000;samesite=lax`;
      document.documentElement.lang = resolved;
      document.documentElement.dir = dirOf(resolved);
    } catch {
      /* private mode — context still updates for this session */
    }
  }, []);

  useEffect(() => {
    // Hydrate from cookie/localStorage on mount (server rendered default).
    try {
      const stored = localStorage.getItem(LOCALE_COOKIE);
      if (stored && isValidBcp47(stored)) setLocale(stored);
    } catch { /* ignore */ }
  }, [setLocale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dir: dirOf(locale), setLocale, t: (key, vars) => t(locale, key, vars) }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export { SUPPORTED_LOCALES };
