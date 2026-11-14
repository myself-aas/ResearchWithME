export type ThemePreference = 'light' | 'dark' | 'system';
export const THEME_STORAGE_KEY = 'rwm-theme';

// Keep these pure and closure-free: the same functions are embedded in the
// pre-paint script so SSR bootstrap and hydrated controls cannot drift.
export function normalizeThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function resolveEffectiveTheme(pref: ThemePreference, prefersDark: boolean): 'light' | 'dark' {
  return pref === 'system' ? (prefersDark ? 'dark' : 'light') : pref;
}

export function applyDocumentTheme(preference: ThemePreference, prefersDark: boolean): 'light' | 'dark' {
  const effective = resolveEffectiveTheme(preference, prefersDark);
  document.documentElement.classList.toggle('dark', effective === 'dark');
  document.documentElement.classList.toggle('light', preference === 'light');
  return effective;
}

export const THEME_INIT_SCRIPT = `(function(){var normalize=${normalizeThemePreference.toString()};var resolve=${resolveEffectiveTheme.toString()};var p='system';try{p=normalize(window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}));}catch(e){}var d=!!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',resolve(p,d)==='dark');document.documentElement.classList.toggle('light',p==='light');})();`;
