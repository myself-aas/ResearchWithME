import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to define mocks before vi.mock is hoisted
const { mockClient, mockExtractor } = vi.hoisted(() => ({
  mockClient: { postArticle: vi.fn() },
  mockExtractor: { extractArticleForLinkedIn: vi.fn() },
}));

vi.mock('@/lib/linkedin/client', () => ({
  LinkedInClient: vi.fn().mockImplementation(() => mockClient),
}));

vi.mock('@/lib/linkedin/article-extractor', () => ({
  extractArticleForLinkedIn: mockExtractor.extractArticleForLinkedIn,
}));

import { postArticleToLinkedIn, batchPostArticles } from '@/lib/linkedin/automation';

describe('LinkedIn Automation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts single article successfully', async () => {
    mockExtractor.extractArticleForLinkedIn.mockResolvedValue({
      title: 'Test Article',
      summary: 'Test summary',
      url: 'https://researchwith.me/post/test',
      authorName: 'Test Author',
      category: 'Research Reviews',
      tags: ['AI'],
      doi: '10.5555/rwm.test',
    });
    mockClient.postArticle.mockResolvedValue({ success: true, postUrn: 'urn:li:share:123' });

    const result = await postArticleToLinkedIn('test-article');
    expect(result.success).toBe(true);
    expect(result.postUrn).toBe('urn:li:share:123');
    expect(mockClient.postArticle).toHaveBeenCalled();
  });

  it('handles article not found', async () => {
    mockExtractor.extractArticleForLinkedIn.mockResolvedValue(null);
    const result = await postArticleToLinkedIn('non-existent');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Article not found');
  });

  it('batch posts multiple articles with rate limiting', async () => {
    const articles = ['article-1', 'article-2', 'article-3'];
    mockExtractor.extractArticleForLinkedIn
      .mockResolvedValueOnce({ title: 'Article 1', summary: 'S1', url: 'u1', authorName: 'A', category: 'C', tags: [], doi: 'd1' })
      .mockResolvedValueOnce({ title: 'Article 2', summary: 'S2', url: 'u2', authorName: 'A', category: 'C', tags: [], doi: 'd2' })
      .mockResolvedValueOnce({ title: 'Article 3', summary: 'S3', url: 'u3', authorName: 'A', category: 'C', tags: [], doi: 'd3' });
    mockClient.postArticle
      .mockResolvedValueOnce({ success: true, postUrn: 'urn:1' })
      .mockResolvedValueOnce({ success: true, postUrn: 'urn:2' })
      .mockResolvedValueOnce({ success: true, postUrn: 'urn:3' });

    const result = await batchPostArticles(articles);
    expect(result.posted).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(3);
  });

  it('continues batch on individual failure', async () => {
    const articles = ['article-1', 'article-2'];
    mockExtractor.extractArticleForLinkedIn
      .mockResolvedValueOnce({ title: 'Article 1', summary: 'S1', url: 'u1', authorName: 'A', category: 'C', tags: [], doi: 'd1' })
      .mockResolvedValueOnce({ title: 'Article 2', summary: 'S2', url: 'u2', authorName: 'A', category: 'C', tags: [], doi: 'd2' });
    mockClient.postArticle
      .mockResolvedValueOnce({ success: true, postUrn: 'urn:1' })
      .mockResolvedValueOnce({ success: false, error: 'Rate limited' });

    const result = await batchPostArticles(articles);
    expect(result.posted).toBe(1);
    expect(result.failed).toBe(1);
  });
});