// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import BrandLogo from '@/components/BrandLogo';
import { Header } from '@/components/ui/header-2';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import manifest from '@/app/manifest';

describe('brand assets', () => {
  it('renders the supplied wordmark and compact mark with an accessible name', () => {
    const wordmark = renderToStaticMarkup(createElement(BrandLogo));
    const mark = renderToStaticMarkup(createElement(BrandLogo, { showText: false }));
    expect(wordmark).toContain('/brand/wordmark.svg');
    expect(mark).toContain('/brand/mark.svg');
    expect(wordmark).toContain('aria-label="ResearchWithMe"');
    expect(wordmark).toContain('dark:invert');
    expect(readFileSync('public/brand/wordmark.svg')).toEqual(readFileSync('research-with-me (3).svg'));
    expect(readFileSync('public/favicon.svg')).toEqual(readFileSync('research-with-me-favicon.svg'));
  });

  it('advertises actual supplied icon files without incorrectly declaring them maskable', () => {
    for (const icon of manifest().icons ?? []) {
      expect(icon.purpose).not.toBe('maskable');
      expect(readFileSync(`public${icon.src}`).length).toBeGreaterThan(0);
    }
  });

  it('renders distinct toggle icons for open and closed states', () => {
    expect(renderToStaticMarkup(createElement(MenuToggleIcon, { open: true })))
      .not.toBe(renderToStaticMarkup(createElement(MenuToggleIcon, { open: false })));
  });
});

describe('scroll-aware header shell', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  it('raises on scroll but stays full-width while navigation is open', () => {
    act(() => root.render(<Header>Navigation</Header>));
    expect(container.querySelector('header')?.className).not.toContain('shadow-floating');
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 20 });
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(container.querySelector('header')?.className).toContain('shadow-floating');
    act(() => root.render(<Header open>Navigation</Header>));
    expect(container.querySelector('header')?.className).not.toContain('shadow-floating');
  });
});
