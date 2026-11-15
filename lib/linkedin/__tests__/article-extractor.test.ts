import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to define the mock before vi.mock is hoisted
const { mockCatalogue } = vi.hoisted(() => ({
  mockCatalogue: vi.fn(),
}));

vi.mock('@/lib/cms/catalogue', () => ({
  getCachedArticleCatalogue: mockCatalogue,
}));

import { extractArticleForLinkedIn, getPublishedArticles } from '@/lib/linkedin/article-extractor';

describe('Article Extractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts ArticleData from BlogPost with all fields', async () => {
    const mockArticle = {
      id: 'post-1',
      slug: 'test-article',
      title: 'Test Article Title',
      subtitle: 'Test subtitle for the article',
      category: 'Research Reviews',
      format: 'Paper Review',
      author: {
        id: 'author-1',
        name: 'Dr. Test Author',
        avatar: 'TA',
        role: 'Researcher',
        domain: 'AI',
      },
      publishedAt: 'January 15, 2026',
      readTime: '10 min read',
      coverImage: '/images/cover.jpg',
      featured: true,
      summary: 'This is a test article summary for LinkedIn posting.',
      content: ['Paragraph 1', 'Paragraph 2'],
      keyTakeaways: ['Takeaway 1', 'Takeaway 2'],
      tags: ['AI', 'Machine Learning', 'Research'],
      likes: 100,
      commentsCount: 10,
      dateISO: '2026-01-15',
    };

    mockCatalogue.mockResolvedValue([mockArticle]);

    const result = await extractArticleForLinkedIn('test-article');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Test Article Title');
    expect(result!.summary).toBe('This is a test article summary for LinkedIn posting.');
    expect(result!.url).toBe('https://researchwith.me/post/test-article');
    expect(result!.coverImage).toBe('https://researchwith.me/images/cover.jpg');
    expect(result!.authorName).toBe('Dr. Test Author');
    expect(result!.category).toBe('Research Reviews');
    expect(result!.tags).toEqual(['AI', 'Machine Learning', 'Research']);
    expect(result!.doi).toBeUndefined();
  });

  it('handles missing cover image gracefully', async () => {
    const mockArticle = {
      id: 'post-2',
      slug: 'no-image-article',
      title: 'No Image Article',
      subtitle: 'Subtitle',
      category: 'GitHub Repo Teardowns',
      format: 'Repo Teardown',
      author: { id: 'a1', name: 'Author', avatar: 'A', role: 'Dev', domain: 'Tech' },
      publishedAt: 'January 15, 2026',
      readTime: '5 min read',
      coverImage: '',
      featured: false,
      summary: 'Summary without image',
      content: [],
      keyTakeaways: [],
      tags: ['GitHub'],
      likes: 0,
      commentsCount: 0,
    };

    mockCatalogue.mockResolvedValue([mockArticle]);

    const result = await extractArticleForLinkedIn('no-image-article');
    expect(result).not.toBeNull();
    expect(result!.coverImage).toBeUndefined();
  });

  it('returns null for non-existent slug', async () => {
    mockCatalogue.mockResolvedValue([]);

    const result = await extractArticleForLinkedIn('non-existent');
    expect(result).toBeNull();
  });

  it('handles data: URI cover images', async () => {
    const mockArticle = {
      id: 'post-3',
      slug: 'data-uri-article',
      title: 'Data URI Article',
      subtitle: 'Subtitle',
      category: 'Research Reviews',
      format: 'Paper Review',
      author: { id: 'a1', name: 'Author', avatar: 'A', role: 'Dev', domain: 'Tech' },
      publishedAt: 'January 15, 2026',
      readTime: '5 min read',
      coverImage: 'data:image/png;base64,abc123',
      featured: false,
      summary: 'Summary with data URI',
      content: [],
      keyTakeaways: [],
      tags: ['Test'],
      likes: 0,
      commentsCount: 0,
    };

    mockCatalogue.mockResolvedValue([mockArticle]);

    const result = await extractArticleForLinkedIn('data-uri-article');
    expect(result).not.toBeNull();
    expect(result!.coverImage).toBeUndefined();
  });

  it('getPublishedArticles returns sorted articles', async () => {
    const mockArticles = [
      {
        id: 'post-1',
        slug: 'article-1',
        title: 'Article 1',
        dateISO: '2026-01-10',
      },
      {
        id: 'post-2',
        slug: 'article-2',
        title: 'Article 2',
        dateISO: '2026-01-15',
      },
      {
        id: 'post-3',
        slug: 'article-3',
        title: 'Article 3',
        dateISO: '2026-01-05',
      },
    ];

    mockCatalogue.mockResolvedValue(mockArticles);

    const result = await getPublishedArticles();
    expect(result).toHaveLength(3);
    expect(result[0].slug).toBe('article-2'); // Most recent first
    expect(result[1].slug).toBe('article-1');
    expect(result[2].slug).toBe('article-3');
  });
});