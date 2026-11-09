import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  shortCitation,
  fullCitation,
  machineCitation,
  cslJson,
  type CitationSource,
} from '@/lib/citations';
import Citation from '@/components/scholarly/Citation';

const source: CitationSource = {
  title: 'A Very Long Study Title That Exceeds Sixty Characters For Truncation',
  author: 'Ada Lovelace',
  year: '2026',
  journal: 'Journal of Examples',
  doi: '10.1000/xyz123',
  url: 'https://example.com/x',
};

describe('citation views (§7)', () => {
  it('short view truncates long titles and keeps author/year', () => {
    const s = shortCitation(source);
    expect(s).toContain('Lovelace, A. (2026).');
    expect(s).toContain('…');
    expect(s.length).toBeLessThan(100);
  });

  it('full view is the APA reference with DOI URL', () => {
    expect(fullCitation(source)).toContain('https://doi.org/10.1000/xyz123');
  });

  it('machine views: BibTeX, RIS, CSL-JSON', () => {
    expect(machineCitation('bibtex', source)).toContain('@article{lovelace2026');
    expect(machineCitation('ris', source)).toContain('TY  - JOUR');
    const csl = JSON.parse(machineCitation('csl-json', source));
    expect(csl.type).toBe('article-journal');
    expect(csl.DOI).toBe('10.1000/xyz123');
    expect(csl.author[0].family).toBe('Lovelace');
    expect(csl['container-title']).toBe('Journal of Examples');
    expect(cslJson(source)).toBe(machineCitation('csl-json', source));
  });
});

describe('Citation component rendering', () => {
  it('renders view tabs, copy button, live-region feedback, and internal id + DOI', () => {
    const html = renderToStaticMarkup(createElement(Citation, { source, internalId: '018f2a6e-7c1d-7f3a-9b2c-4d5e6f708192' }));
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Short');
    expect(html).toContain('Machine');
    expect(html).toContain('>Copy<');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Internal ID: 018f2a6e');
    expect(html).toContain('DOI: 10.1000/xyz123');
    expect(html).toContain('font-mono');
  });

  it('defaults to the full APA view', () => {
    const html = renderToStaticMarkup(createElement(Citation, { source }));
    expect(html).toContain('Journal of Examples');
    expect(html).toContain('aria-selected="true"');
  });
});
