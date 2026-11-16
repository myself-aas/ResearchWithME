import { describe, expect, it } from 'vitest';
import { buildArticleCitationMap } from '@/lib/citations-inline';
import { buildCitation } from '@/lib/citations';
import { makeTestArticle } from '@/test/fixtures/articles';

describe('inline citation provenance', () => {
  it('does not attribute the review author or publication year to its reviewed paper', () => {
    const article = makeTestArticle({ publishedAt: '1 February 2024', reviewedArtifact: { type: 'paper', title: 'Original paper', identifier: '10.1234/example', url: 'https://doi.org/10.1234/example', meta: 'Published 2020 · Journal of Examples' } });
    const map = buildArticleCitationMap(article);
    const artifact = map['10.1234/example'];
    expect(artifact.title).toBe('Original paper');
    expect(artifact.author).toBe('');
    expect(artifact.year).toBe('');
    expect(artifact.journal).toBe('');
    expect(artifact.doi).toBe('10.1234/example');
    expect(buildCitation('bibtex', artifact)).not.toContain('publisher =');
    expect(map.rwm.year).toBe('2024');
    expect(map.rwm.kind).toBe('webpage');
    expect(map['1']).toBeUndefined();
  });

  it('does not turn arbitrary identifiers into DOIs or map an unknown numbered reference to the review', () => {
    const article = makeTestArticle({ publishedAt: '', reviewedArtifact: { type: 'github', title: 'Repository', identifier: 'org/repo', url: 'https://github.com/org/repo', meta: 'MIT' } });
    const map = buildArticleCitationMap(article);
    expect(map.rwm.year).toBe('');
    expect(map['1']).toBeUndefined();
    expect(map['org/repo'].doi).toBeUndefined();
    expect(map['org/repo'].kind).toBe('webpage');
    expect(buildArticleCitationMap(makeTestArticle({ publishedAt: '' }))['1']).toBeUndefined();
  });
});
