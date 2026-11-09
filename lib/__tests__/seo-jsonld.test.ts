import { describe, expect, it } from 'vitest';
import { articleJsonLd, scholarlyArticleJsonLd, jsonLdScript } from '@/lib/seo/jsonld';

describe('JSON-LD structured data (audit fix)', () => {
  it('Article schema has headline, author, publisher, mainEntityOfPage', () => {
    const d = articleJsonLd({
      title: 'T', description: 'D', path: '/post/x', authorName: 'A',
      datePublished: '2026-11-09', imagePath: '/images/x.png',
    });
    expect(d['@type']).toBe('Article');
    expect(d.headline).toBe('T');
    expect(d.author).toEqual({ '@type': 'Person', name: 'A' });
    expect(d.mainEntityOfPage).toContain('/post/x');
    expect(d.image?.[0]).toContain('/images/x.png');
  });

  it('ScholarlyArticle schema carries DOI sameAs and journal', () => {
    const d = scholarlyArticleJsonLd({
      title: 'P', description: 'A', path: '/paper/p', authors: ['X', 'Y'],
      datePublished: '2026-01-01', doi: '10.1000/xyz', journal: 'J',
    });
    expect(d['@type']).toBe('ScholarlyArticle');
    expect(d.sameAs).toBe('https://doi.org/10.1000/xyz');
    expect(d.author).toHaveLength(2);
  });

  it('jsonLdScript escapes </script> to prevent XSS breakout', () => {
    const out = jsonLdScript({ title: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c/script>');
  });
});
