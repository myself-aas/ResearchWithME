import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCatalogue } = vi.hoisted(() => ({
  mockCatalogue: vi.fn(),
}));

vi.mock('@/lib/cms/catalogue', () => ({
  getCachedArticleCatalogue: mockCatalogue,
}));

import {
  extractArticleForLinkedIn,
  getPublishedArticles,
  normalizeCoverImageUrl,
} from '@/lib/linkedin/article-extractor';

describe('Article Extractor (Editorial-Only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = 'https://researchwith.me';
  });

  it('extracts ArticleData from an editorial BlogPost with all fields', async () => {
    const mockArticle = {
      id: 'post-1',
      slug: 'test-editorial',
      title: 'Test Editorial Title',
      subtitle: 'Test subtitle for the editorial',
      category: 'Research Reviews',
      format: 'Deep-Dive Essay',
      publicationType: 'editorial',
      author: {
        id: 'author-1',
        name: 'Ashif Ahmed Shuvo',
        avatar: 'AS',
        role: 'Editor-in-Chief',
        domain: 'AI',
      },
      publishedAt: 'January 15, 2026',
      readTime: '10 min read',
      coverImage: '/images/cover.jpg',
      featured: true,
      summary: 'This is a test editorial summary for LinkedIn posting.',
      content: ['Paragraph 1', 'Paragraph 2'],
      keyTakeaways: ['Takeaway 1', 'Takeaway 2'],
      tags: ['AI', 'Machine Learning', 'Research'],
      likes: 100,
      commentsCount: 10,
      dateISO: '2026-01-15',
    };

    mockCatalogue.mockResolvedValue([mockArticle]);

    const result = await extractArticleForLinkedIn('test-editorial');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Test Editorial Title');
    expect(result!.summary).toBe('This is a test editorial summary for LinkedIn posting.');
    expect(result!.url).toBe('https://researchwith.me/post/test-editorial');
    expect(result!.coverImage).toBe('https://researchwith.me/images/cover.jpg');
    expect(result!.authorName).toBe('Ashif Ahmed Shuvo');
    expect(result!.category).toBe('Research Reviews');
    expect(result!.tags).toEqual(['AI', 'Machine Learning', 'Research']);
    expect(result!.publicationType).toBe('editorial');
    expect(result!.doi).toBeUndefined();
  });

  it('excludes regular review posts by default', async () => {
    const mockReview = {
      id: 'post-review',
      slug: 'regular-review',
      title: 'Regular Review',
      subtitle: 'Not an editorial',
      category: 'Research Reviews',
      format: 'Paper Review',
      publicationType: 'review',
      author: { id: 'a1', name: 'Author', avatar: 'A', role: 'Dev', domain: 'Tech' },
      publishedAt: 'January 15, 2026',
      readTime: '5 min read',
      coverImage: '',
      featured: false,
      summary: 'Review summary',
      content: [],
      keyTakeaways: [],
      tags: ['AI'],
      likes: 0,
      commentsCount: 0,
    };

    mockCatalogue.mockResolvedValue([mockReview]);

    expect(await extractArticleForLinkedIn('regular-review')).toBeNull();
    expect(await getPublishedArticles()).toEqual([]);

    const inspected = await extractArticleForLinkedIn('regular-review', { requireEditorial: false });
    expect(inspected?.publicationType).toBe('review');
  });

  it('preserves absolute https:// cover URLs without double-prefixing', () => {
    const supabaseCover = 'https://example.supabase.co/storage/v1/object/public/blog-images/cover.webp';
    expect(normalizeCoverImageUrl(supabaseCover)).toBe(supabaseCover);
    expect(normalizeCoverImageUrl('/images/cover.jpg')).toBe('https://researchwith.me/images/cover.jpg');
    expect(normalizeCoverImageUrl('data:image/png;base64,abc')).toBeUndefined();
    expect(normalizeCoverImageUrl('')).toBeUndefined();
  });

  it('handles missing cover image and data: URI gracefully on editorial posts', async () => {
    const mockEditorial = {
      id: 'post-2',
      slug: 'no-image-editorial',
      title: 'No Image Editorial',
      subtitle: 'Subtitle',
      category: 'GitHub Repo Teardowns',
      format: 'Deep-Dive Essay',
      publicationType: 'editorial',
      author: { id: 'a1', name: 'Author', avatar: 'A', role: 'Dev', domain: 'Tech' },
      publishedAt: 'January 15, 2026',
      readTime: '5 min read',
      coverImage: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      featured: false,
      summary: 'Summary without image',
      content: [],
      keyTakeaways: [],
      tags: ['GitHub'],
      likes: 0,
      commentsCount: 0,
    };

    mockCatalogue.mockResolvedValue([mockEditorial]);

    const result = await extractArticleForLinkedIn('no-image-editorial');
    expect(result).not.toBeNull();
    expect(result!.coverImage).toBeUndefined();
  });

  it('returns null for non-existent slug', async () => {
    mockCatalogue.mockResolvedValue([]);
    expect(await extractArticleForLinkedIn('non-existent')).toBeNull();
  });
});
