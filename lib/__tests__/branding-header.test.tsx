// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import BrandLogo from '@/components/BrandLogo';
import BrandMark from '@/components/BrandMark';
import { Header } from '@/components/ui/header-2';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import manifest from '@/app/manifest';

describe('brand assets', () => {
  it('renders the monogram lockup as the identity, without a repeated letter', () => {
    const logo = renderToStaticMarkup(createElement(BrandLogo));
    // The mark is the "r" monogram; the wordmark would repeat that letter.
    expect(logo).toContain('text-brand-mark');
    expect(logo).not.toContain('reme');
  });

  it('renders the wordmark only when explicitly asked', () => {
    const withText = renderToStaticMarkup(createElement(BrandLogo, { showText: true }));
    expect(withText).toContain('reme');
  });

  it('stays decorative when a wrapping link already carries the name', () => {
    const logo = renderToStaticMarkup(createElement(BrandLogo));
    // The wrapper, not the inner svg, carries the decorative flag.
    expect(logo).toMatch(/^<span class="[^"]*" aria-hidden="true">/);
    const labelled = renderToStaticMarkup(createElement(BrandLogo, { label: 'ResearchWithMe' }));
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain('aria-label="ResearchWithMe"');
    expect(labelled).not.toMatch(/^<span class="[^"]*" aria-hidden/);
  });

  it('inlines the mark so forced-colors can repaint it', () => {
    const mark = renderToStaticMarkup(createElement(BrandMark));
    // currentColor is what the OS overrides; a baked fill would be ignored.
    expect(mark).toContain('fill="currentColor"');
    expect(mark).toContain('<svg');
    expect(mark).toContain('viewBox="0 0 100 100"');
    expect(mark).toContain('aria-hidden="true"');
  });

  it('keeps the inlined monogram geometry identical to the shipped file', () => {
    const file = readFileSync('public/brand/mark.svg', 'utf8');
    const path = file.match(/ d="([^"]+)"/)?.[1];
    const transform = file.match(/transform="([^"]+)"/)?.[1];
    const mark = renderToStaticMarkup(createElement(BrandMark));
    expect(path).toBeTruthy();
    expect(mark).toContain(path as string);
    expect(mark).toContain(transform as string);
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
