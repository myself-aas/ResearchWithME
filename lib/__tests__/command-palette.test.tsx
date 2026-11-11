// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BlogPost } from '@/lib/blog-data';
import { buildCatalogIndex, normalizeIdentifierQuery, searchCatalog } from '@/lib/search/catalog-index';

const articles: BlogPost[] = JSON.parse(readFileSync(join(process.cwd(), 'data/articles.json'), 'utf8'));

describe('catalog-index + CommandPalette search', () => {
  it('Review Focus #2: strips URL wrappers/case/trailing punctuation on DOIs, GitHub repos, and ORCIDs and ranks exact match #1', () => {
    expect(normalizeIdentifierQuery('https://doi.org/10.5555/RWM.POST-1.')).toBe('10.5555/rwm.post-1');
    expect(normalizeIdentifierQuery('https://github.com/vllm-project/vllm/')).toBe('vllm-project/vllm');
    expect(normalizeIdentifierQuery('https://orcid.org/0000-0001-9234-8812')).toBe('0000-0001-9234-8812');

    const index = buildCatalogIndex({ articles, papers: [], authors: articles.map((a) => a.author) });
    expect(searchCatalog('https://doi.org/10.5555/RWM.POST-1.', index)[0]?.href).toBe('/post/inside-vllm-and-paged-attention');
    expect(searchCatalog('https://github.com/vllm-project/vllm/', index)[0]?.href).toBe('/post/inside-vllm-and-paged-attention');
    expect(searchCatalog('https://orcid.org/0000-0001-9234-8812', index)[0]?.kind).toBe('specialist');
  });

  it('fuzzy-matches titles, tags, and verified specialists via Fuse.js', () => {
    const index = buildCatalogIndex({ articles, papers: [], authors: articles.map((a) => a.author) });
    expect(searchCatalog('PagedAttention CUDA', index)[0]?.href).toBe('/post/inside-vllm-and-paged-attention');
    expect(searchCatalog('Marcus Vance', index).some((r) => r.kind === 'specialist')).toBe(true);
  });
});
