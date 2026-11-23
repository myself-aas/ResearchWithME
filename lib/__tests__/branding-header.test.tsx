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
  it('renders the wordmark as the identity', () => {
    const logo = renderToStaticMarkup(createElement(BrandLogo));
    expect(logo).toContain('reme.');
    expect(logo).not.toContain('text-brand-mark');
  });

  it('stays decorative when a wrapping link already carries the name', () => {
    const logo = renderToStaticMarkup(createElement(BrandLogo));
    expect(logo).toMatch(/^<span class="[^"]*" aria-hidden="true">/);
    const labelled = renderToStaticMarkup(createElement(BrandLogo, { label: 'ResearchWithMe' }));
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain('aria-label="ResearchWithMe"');
    expect(labelled).not.toMatch(/^<span class="[^"]*" aria-hidden/);
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
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 200 });
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(container.querySelector('header')?.className).toContain('shadow-floating');
    act(() => root.render(<Header open>Navigation</Header>));
    expect(container.querySelector('header')?.className).not.toContain('shadow-floating');
  });
});
