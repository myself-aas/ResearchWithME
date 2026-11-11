import { describe, expect, it } from 'vitest';
import type { BlogPost } from '@/lib/blog-data';
import { summarizeAuthorWork } from '@/lib/author-work-summary';

function article(overrides: Partial<BlogPost> & Pick<BlogPost, 'slug' | 'title'>): BlogPost {
  const { slug, title, ...rest } = overrides;
  return {
    subtitle: '',
    category: 'Research Reviews',
    format: 'Paper Review',
    author: {} as BlogPost['author'],
    publishedAt: '2026-01-01T00:00:00.000Z',
    readTime: '5 min',
    coverImage: '',
    featured: false,
    summary: '',
    content: [],
    keyTakeaways: [],
    tags: [],
    likes: 0,
    commentsCount: 0,
    ...rest,
    id: slug,
    slug,
    title,
  };
}

describe('summarizeAuthorWork', () => {
  it('summarizes_article_and_reviewed_artifact_counts', () => {
    const result = summarizeAuthorWork([
      article({ slug: 'with-artifact', title: 'With artifact', reviewedArtifact: { type: 'paper', title: 'Paper', url: 'https://example.test', identifier: 'doi:1', meta: 'Published' } }),
      article({ slug: 'without-artifact', title: 'Without artifact' }),
    ]);
    expect(result.totalWorks).toBe(2);
    expect(result.reviewedArtifactCount).toBe(1);
  });

  it('sorts_categories_by_count_then_name', () => {
    const result = summarizeAuthorWork([
      article({ slug: 'a1', title: 'A1', category: 'Data & Policy' }),
      article({ slug: 'a2', title: 'A2', category: 'Health & Medicine' }),
      article({ slug: 'a3', title: 'A3', category: 'Research Reviews' }),
      article({ slug: 'a4', title: 'A4', category: 'Research Reviews' }),
    ]);
    expect(result.byCategory).toEqual([
      { category: 'Research Reviews', count: 2 },
      { category: 'Data & Policy', count: 1 },
      { category: 'Health & Medicine', count: 1 },
    ]);
  });

  it('returns_three_latest_works_in_date_order', () => {
    const result = summarizeAuthorWork([
      article({ slug: 'old', title: 'Old', publishedAt: '2024-01-01' }),
      article({ slug: 'newest', title: 'Newest', dateISO: '2026-06-01', publishedAt: '2020-01-01' }),
      article({ slug: 'middle', title: 'Middle', publishedAt: '2025-01-01' }),
      article({ slug: 'second-newest', title: 'Second', dateISO: '2026-01-01' }),
    ]);
    expect(result.latestWorks.map((work) => work.slug)).toEqual(['newest', 'second-newest', 'middle']);
  });

  it('sorts_invalid_dates_after_valid_dates', () => {
    const result = summarizeAuthorWork([
      article({ slug: 'invalid', title: 'Invalid', publishedAt: 'not-a-date' }),
      article({ slug: 'valid', title: 'Valid', publishedAt: '2025-01-01' }),
    ]);
    expect(result.latestWorks.map((work) => work.slug)).toEqual(['valid', 'invalid']);
  });

  it('returns_empty_summary_for_no_works', () => {
    expect(summarizeAuthorWork([])).toEqual({
      totalWorks: 0,
      reviewedArtifactCount: 0,
      byCategory: [],
      latestWorks: [],
    });
  });
});
