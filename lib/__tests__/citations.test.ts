import { describe, expect, it } from 'vitest';
import { buildCitation, citationFileExtension, type CitationSource } from '@/lib/citations';

const source: CitationSource = {
  title: 'Inside vLLM and PagedAttention',
  author: 'Maya Lin',
  year: '2026',
  journal: 'ResearchWithMe Technical Reviews',
  doi: '10.5555/rwm.2026.0401',
  url: 'https://researchwith.me/post/inside-vllm-and-paged-attention',
};

describe('buildCitation', () => {
  it('builds APA with the family name first', () => {
    expect(buildCitation('apa', source)).toContain('Lin, M. (2026).');
    expect(buildCitation('apa', source)).toContain('https://doi.org/10.5555/rwm.2026.0401');
  });

  it('builds MLA with a quoted title', () => {
    expect(buildCitation('mla', source)).toContain('"Inside vLLM and PagedAttention."');
  });

  it('builds IEEE with a bracketed citation number', () => {
    expect(buildCitation('ieee', source).startsWith('[1] M. Lin')).toBe(true);
  });

  it('builds valid BibTeX keys and strips DOI prefixes', () => {
    const bibtex = buildCitation('bibtex', { ...source, doi: 'https://doi.org/10.5555/rwm.2026.0401' });
    expect(bibtex.startsWith('@article{lin2026,')).toBe(true);
    expect(bibtex).toContain('doi = {10.5555/rwm.2026.0401}');
    expect(bibtex).not.toContain('https://doi.org/https://doi.org');
  });

  it('omits the platform publisher when explicitly requested for an external paper', () => {
    const external = buildCitation('bibtex', { ...source, publisher: null, url: undefined });
    expect(external).not.toContain('publisher =');
    expect(external).not.toContain('ResearchWithMe Press');
    expect(buildCitation('bibtex', { ...source, publisher: 'A real publisher' })).toContain('publisher = {A real publisher}');
  });

  it('does not invent a venue or publisher for missing metadata', () => {
    const minimal = { title: 'Unknown venue', author: 'Ada Lovelace', year: '', journal: '', doi: '' };
    for (const format of ['apa', 'mla', 'chicago', 'ieee', 'bibtex', 'ris'] as const) {
      const output = buildCitation(format, minimal);
      expect(output).not.toContain('ResearchWithMe');
      expect(output).not.toContain('publisher =');
      expect(output).not.toContain('journal =');
      expect(output).not.toContain('JO  -');
    }
  });

  it('does not invent an author when the author is unknown', () => {
    const sourceWithoutAuthor: CitationSource = { title: 'A paper', author: '', year: '', journal: '' };
    for (const format of ['apa', 'mla', 'chicago', 'ieee', 'bibtex', 'ris'] as const) {
      const output = buildCitation(format, sourceWithoutAuthor);
      expect(output).not.toContain('Author');
      expect(output).not.toContain('author =');
      expect(output).not.toContain('AU  -');
    }
  });

  it('builds RIS with typed fields', () => {
    const ris = buildCitation('ris', source);
    expect(ris).toContain('TY  - JOUR');
    expect(ris).toContain('ER  - ');
  });

  it('handles missing values without crashing', () => {
    const minimal = buildCitation('apa', { title: '', author: '', year: '', journal: '', doi: '' });
    expect(minimal).toContain('Untitled');
    expect(minimal).toContain('n.d.');
  });

  it('handles a single-word author name', () => {
    expect(buildCitation('apa', { ...source, author: 'Plato' })).toContain('Plato, P.');
  });
});

describe('citationFileExtension', () => {
  it('maps formats to file extensions', () => {
    expect(citationFileExtension('ris')).toBe('ris');
    expect(citationFileExtension('bibtex')).toBe('bib');
    expect(citationFileExtension('apa')).toBe('txt');
  });
});
