import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import BlogFooter from '@/components/BlogFooter';

/**
 * Site chrome is composed per page (BlogHeader + BlogFooter), so the audit
 * guards the two failure modes that repeated composition invites:
 *  - one surface rendering the same chrome component twice, and
 *  - a navigation list pointing two entries at the same destination.
 */
function sourceFiles(root: string): string[] {
  return readdirSync(root, { recursive: true })
    .map((entry) => String(entry))
    .filter((entry) => entry.endsWith('.tsx') && !entry.includes('.test.'))
    // Normalise to `/` so the path checks below hold on Windows, where `join`
    // returns `components\BlogHeader.tsx`.
    .map((entry) => join(root, entry).replaceAll('\\', '/'));
}

function hrefsIn(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

describe('chrome duplication', () => {
  it('renders the footer navigation without duplicate destinations', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(BlogFooter)));
    const counts = new Map<string, number>();
    for (const href of hrefsIn(html)) counts.set(href, (counts.get(href) ?? 0) + 1);

    // `/` legitimately appears twice: the brand link and the editorial-archive
    // sitemap entry. Every other destination must be listed once.
    const duplicates = [...counts.entries()].filter(([href, count]) => href !== '/' && count > 1);
    expect(duplicates).toEqual([]);
    expect(counts.get('/') ?? 0).toBeLessThanOrEqual(2);
    // `/assistant` used to appear in both the Explore list and the utility row.
    expect(counts.get('/assistant')).toBe(1);
  });

  it('never renders BlogHeader or BlogFooter twice in one file', () => {
    const files = [...sourceFiles('app'), ...sourceFiles('components')];
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const headers = (source.match(/<BlogHeader\b/g) ?? []).length;
      const footers = (source.match(/<BlogFooter\b/g) ?? []).length;
      if (headers > 1 || footers > 1) offenders.push(`${file}: ${headers} header(s), ${footers} footer(s)`);
    }

    expect(offenders).toEqual([]);
  });

  it('keeps the hamburger drawer and the bottom bar owned by one header component', () => {
    const files = [...sourceFiles('app'), ...sourceFiles('components')];
    const offenders = files.filter(
      (file) =>
        !file.endsWith('components/BlogHeader.tsx') &&
        /<MobileNavDrawer\b|<MobileBottomNav\b/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
