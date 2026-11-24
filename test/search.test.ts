import { describe, expect, it } from 'vitest';
import type { SearchDoc } from '@/lib/content/types';
import { MAX_SEARCH_RESULTS, searchDocs, toLiteDocs } from '@/lib/search';

function doc(overrides: Partial<SearchDoc> & Pick<SearchDoc, 'slug' | 'title'>): SearchDoc {
  return {
    href: `/blog/${overrides.slug}`,
    description: '',
    tags: [],
    date: '2026-01-01',
    readingTimeMinutes: 6,
    text: '',
    ...overrides,
  };
}

const temporal = doc({
  slug: 'prithvi-eo-2-0',
  title: 'Prithvi-EO-2.0, Read Closely',
  description: 'A geospatial foundation model with temporal and location embeddings.',
  tags: ['earth-observation', 'vision-transformers'],
  text: 'The 600M checkpoint is a masked autoencoder over HLS time series.',
});

const repro = doc({
  slug: 'reproducible-figures',
  title: 'Reproducible Figures',
  description: 'Turning a notebook into a figure anyone can rebuild.',
  tags: ['reproducibility', 'tooling'],
  text: 'Cache the inputs, pin the environment, and render the same bytes twice.',
});

const docs = [temporal, repro];

describe('toLiteDocs', () => {
  it('drops the body so the search page does not carry the archive', () => {
    const lite = toLiteDocs(docs);
    expect(lite).toHaveLength(2);
    for (const entry of lite) expect('text' in entry).toBe(false);
    expect(lite[0].title).toBe(temporal.title);
    expect(lite[0].tags).toEqual(temporal.tags);
  });

  it('serialises smaller than the full index', () => {
    expect(JSON.stringify(toLiteDocs(docs)).length).toBeLessThan(JSON.stringify(docs).length);
  });
});

describe('searchDocs', () => {
  it('ranks a title match first', () => {
    expect(searchDocs(docs, 'prithvi')[0].slug).toBe('prithvi-eo-2-0');
  });

  it('matches tags', () => {
    expect(searchDocs(docs, 'reproducibility')[0].slug).toBe('reproducible-figures');
  });

  it('matches body text when the full index is available', () => {
    expect(searchDocs(docs, 'masked autoencoder')[0].slug).toBe('prithvi-eo-2-0');
    expect(searchDocs(toLiteDocs(docs), 'masked autoencoder')).toHaveLength(0);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(searchDocs(docs, '  PRITHVI  ')[0].slug).toBe('prithvi-eo-2-0');
  });

  it('returns the newest posts for an empty query', () => {
    expect(searchDocs(docs, '')).toEqual(docs.slice(0, 8));
    expect(searchDocs(docs, '   ')).toEqual(docs.slice(0, 8));
  });

  it('caps results', () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      doc({ slug: `post-${index}`, title: `Post ${index}`, text: 'shared term' }),
    );
    expect(searchDocs(many, 'shared', 5)).toHaveLength(5);
    expect(searchDocs(many, 'shared').length).toBeLessThanOrEqual(MAX_SEARCH_RESULTS);
  });

  it('returns nothing for an unmatched query', () => {
    expect(searchDocs(docs, 'zzzzznothing')).toEqual([]);
  });
});
