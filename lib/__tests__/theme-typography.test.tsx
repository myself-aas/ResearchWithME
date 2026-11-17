// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import ThemeToggle, { resolveEffectiveTheme } from '@/components/ThemeToggle';

describe('Archival typography, 68ch prose & ThemeToggle', () => {
  it.each(['app/globals.css'])('%s enforces font stacks and 68ch reading measure', (file) => {
    const css = readFileSync(join(process.cwd(), file), 'utf8');
    expect(css).toContain('JetBrains Mono');
    expect(css).toContain('68ch');
    expect(css).toMatch(/--font-serif:\s*'Plus Jakarta Sans',\s*var\(--font-newsreader\)/);
    expect(css).toMatch(/--font-sans:\s*'Plus Jakarta Sans',\s*var\(--font-inter\)/);
    expect(css).toMatch(/--font-mono:\s*'Aptos Mono',\s*'JetBrains Mono'/);
    expect(css).not.toMatch(/@font-face[^}]*Aptos/);
    expect(css).not.toMatch(/Hind Siliguri|Noto Serif Bengali|lang="bn"/);
  });

  it('resolves light/dark preference deterministically and renders an accessible 44px theme control', () => {
    expect(resolveEffectiveTheme('dark', false)).toBe('dark');
    expect(resolveEffectiveTheme('light', true)).toBe('light');
    expect(resolveEffectiveTheme('system', true)).toBe('dark');
    const html = renderToStaticMarkup(createElement(ThemeToggle));
    expect(html).toContain('min-h-11');
    expect(html).toContain('<legend');
    expect(html).toContain('type="radio"');
  });
});


describe('theme preference lifecycle', () => {
  let root: Root | null = null;
  let container: HTMLDivElement;
  let dark = false;
  const listeners = new Set<() => void>();

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
    dark = false;
    listeners.clear();
    vi.stubGlobal('matchMedia', () => ({
      get matches() { return dark; },
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    }));
    container = document.createElement('div');
    document.body.append(container);
  });
  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    container.remove();
    document.documentElement.classList.remove('light', 'dark');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  function mount() {
    root = createRoot(container);
    act(() => root!.render(createElement(ThemeToggle)));
    return container;
  }
  function choose(target: HTMLElement, value: string) {
    const input = target.querySelector<HTMLInputElement>(`input[value="${value}"]`)!;
    act(() => input.click());
  }
  function changeOS(value: boolean) {
    dark = value;
    act(() => listeners.forEach((listener) => listener()));
  }

  it('theme_system_choice_reacts_without_overriding_explicit_choice', () => {
    const select = mount();
    expect(select).not.toBeNull();
    choose(select!, 'system');
    changeOS(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    changeOS(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    choose(select!, 'dark');
    changeOS(false);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('rwm-theme')).toBe('dark');
    choose(select!, 'light');
    changeOS(true);
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('remains operable when storage reads and writes are denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    dark = true;
    const select = mount();
    expect(select).not.toBeNull();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    choose(select!, 'light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('keeps multiple theme selectors independently checked and synchronized', () => {
    root = createRoot(container);
    act(() => root!.render(createElement('div', null, createElement(ThemeToggle), createElement(ThemeToggle))));
    const selectors = container.querySelectorAll('fieldset');
    choose(selectors[0], 'dark');
    expect(selectors[0].querySelector<HTMLInputElement>('input[value=dark]')?.checked).toBe(true);
    expect(selectors[1].querySelector<HTMLInputElement>('input[value=dark]')?.checked).toBe(true);
    choose(selectors[1], 'light');
    expect(selectors[0].querySelector<HTMLInputElement>('input[value=light]')?.checked).toBe(true);
    expect(selectors[1].querySelector<HTMLInputElement>('input[value=light]')?.checked).toBe(true);
    choose(selectors[0], 'dark');
    changeOS(false);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('restores explicit preference and removes media listeners on unmount', () => {
    localStorage.setItem('rwm-theme', 'dark');
    const select = mount();
    expect(select).not.toBeNull();
    expect(select!.querySelector<HTMLInputElement>('input[value=dark]')?.checked).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    choose(select!, 'system');
    expect(listeners.size).toBe(1);
    act(() => root!.unmount());
    root = null;
    expect(listeners.size).toBe(0);
  });
});

describe('shared pre-paint theme bootstrap', () => {
  it('applies system preference even when storage is denied or invalid', async () => {
    const { THEME_INIT_SCRIPT } = await import('@/lib/theme');
    for (const stored of [null, 'invalid', 'light', 'dark', 'system']) {
      document.documentElement.className = '';
      const fakeWindow = { localStorage: { getItem: () => stored }, matchMedia: () => ({ matches: true }), addEventListener: () => {} };
      new Function('window', 'document', THEME_INIT_SCRIPT)(fakeWindow, document);
      expect(document.documentElement.classList.contains('dark')).toBe(stored !== 'light');
      expect(document.documentElement.classList.contains('light')).toBe(stored === 'light');
    }
    const deniedWindow = { localStorage: { getItem() { throw new Error('denied'); } }, matchMedia: () => ({ matches: true }), addEventListener: () => {} };
    new Function('window', 'document', THEME_INIT_SCRIPT)(deniedWindow, document);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    document.documentElement.className = '';
  });
});
