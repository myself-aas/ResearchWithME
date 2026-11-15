// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildCatalogIndex, normalizeIdentifierQuery, searchCatalog } from '@/lib/search/catalog-index';
import { makeTestArticle } from '@/test/fixtures/articles';

const articles = [
  makeTestArticle({
    title: 'Inside vLLM & PagedAttention: Memory Fragmentation in LLM Serving',
    slug: 'inside-vllm-paged-attention',
    author: {
      ...makeTestArticle().author,
      id: 'maya-lin',
      name: 'Maya Lin',
      github: 'https://github.com/mayalin-sys',
      orcid: 'https://orcid.org/0000-0001-9234-8812',
    },
    reviewedArtifact: {
      type: 'github',
      title: 'vllm-project/vllm',
      url: 'https://github.com/vllm-project/vllm',
      identifier: 'vllm-project/vllm',
      meta: '44.8k Stars · Apache-2.0',
    },
    tags: ['CUDA', 'LLM', 'serving'],
  }),
];

describe('catalog-index + CommandPalette search', () => {
  it('strips URL wrappers/case/trailing punctuation on GitHub repos and ORCIDs and ranks exact match #1', () => {
    expect(normalizeIdentifierQuery('https://github.com/vllm-project/vllm/')).toBe('vllm-project/vllm');
    expect(normalizeIdentifierQuery('https://orcid.org/0000-0001-9234-8812')).toBe('0000-0001-9234-8812');

    const index = buildCatalogIndex({ articles, authors: articles.map((a) => a.author) });
    expect(searchCatalog('https://github.com/vllm-project/vllm/', index)[0]?.href).toBe('/post/inside-vllm-paged-attention');
    expect(searchCatalog('https://orcid.org/0000-0001-9234-8812', index)[0]?.kind).toBe('specialist');
  });

  it('fuzzy-matches titles, tags, and writers via Fuse.js', () => {
    const index = buildCatalogIndex({ articles, authors: articles.map((a) => a.author) });
    expect(searchCatalog('PagedAttention CUDA', index)[0]?.href).toBe('/post/inside-vllm-paged-attention');
    expect(searchCatalog('Maya Lin', index).some((r) => r.kind === 'specialist')).toBe(true);
  });
});
