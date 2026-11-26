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
  document.documentElement.dataset.theme = effective === 'dark' ? 'reme-dark' : 'reme-light';
  document.documentElement.classList.toggle('dark', effective === 'dark');
  document.documentElement.classList.toggle('light', preference === 'light');
  return effective;
}

export const THEME_INIT_SCRIPT = `(function(){document.documentElement.dataset.js='true';var normalize=${normalizeThemePreference.toString()};var resolve=${resolveEffectiveTheme.toString()};var p='system';try{p=normalize(window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}));}catch(e){}var q=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');function update(){var e=resolve(p,!!(q&&q.matches));document.documentElement.dataset.theme=e==='dark'?'reme-dark':'reme-light';document.documentElement.classList.toggle('dark',e==='dark');document.documentElement.classList.toggle('light',p==='light');}update();if(q&&q.addEventListener)q.addEventListener('change',update);window.addEventListener('rwm-theme-change',function(e){p=normalize(e.detail);update();});window.addEventListener('storage',function(e){if(e.key===${JSON.stringify(THEME_STORAGE_KEY)}||e.key===null){p=normalize(e.newValue);update();}});})();`;
