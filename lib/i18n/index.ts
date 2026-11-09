/**
 * Typed message lookup — πeme v3.1 §30. Keys are checked against the English
 * dictionary at compile time; missing keys fall back to English, then to the
 * key itself (never a crash).
 */
import en from './messages/en.json';
import bn from './messages/bn.json';
import { DEFAULT_LOCALE, type Locale } from './locales';

export type MessageKey = keyof typeof en;

const DICTIONARIES: Record<Locale, Record<string, string>> = { en, bn };

export function t(locale: Locale | string, key: MessageKey, vars?: Record<string, string | number>): string {
  const loc = (locale in DICTIONARIES ? locale : DEFAULT_LOCALE) as Locale;
  let s = DICTIONARIES[loc][key] ?? DICTIONARIES.en[key] ?? String(key);
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export { DEFAULT_LOCALE };
export * from './locales';
export * from './pseudo';
export * from './format';
