import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockClient, mockExtractor, mockEditorials, mockRpc } = vi.hoisted(() => ({
  mockClient: { postArticle: vi.fn() },
  mockExtractor: { extractArticleForLinkedIn: vi.fn() },
  mockEditorials: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('@/lib/linkedin/client', () => ({
  LinkedInClient: vi.fn().mockImplementation(() => mockClient),
}));

vi.mock('@/lib/linkedin/article-extractor', () => ({
  extractArticleForLinkedIn: mockExtractor.extractArticleForLinkedIn,
  getPublishedEditorialArticles: mockEditorials,
}));

vi.mock('@/lib/supabase/config', () => ({
  isSupabaseConfigured: true,
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabasePublicClient: () => ({ rpc: mockRpc }),
}));

import {
  postArticleToLinkedIn,
  batchPostArticles,
  checkAndPostNewArticles,
} from '@/lib/linkedin/automation';

describe('LinkedIn Automation (Editorial-Only + Deduplication)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'linkedin_list_posted_slugs') return { data: [], error: null };
      return { data: null, error: null };
    });
  });

  it('posts single editorial article successfully and records posted status', async () => {
    mockExtractor.extractArticleForLinkedIn.mockResolvedValue({
      title: 'Test Editorial',
      summary: 'Test summary',
      url: 'https://researchwith.me/post/test-editorial',
      authorName: 'Ashif Ahmed Shuvo',
      category: 'Research Reviews',
      tags: ['AI'],
      publicationType: 'editorial',
    });
    mockClient.postArticle.mockResolvedValue({ success: true, postUrn: 'urn:li:share:123' });

    const result = await postArticleToLinkedIn('test-editorial');
    expect(result.success).toBe(true);
    expect(result.postUrn).toBe('urn:li:share:123');
    expect(mockClient.postArticle).toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledWith(
      'linkedin_record_post_status',
      expect.objectContaining({
        p_slug: 'test-editorial',
        p_status: 'posted',
        p_post_urn: 'urn:li:share:123',
      }),
    );
  });

  it('handles article not found or non-editorial', async () => {
    mockExtractor.extractArticleForLinkedIn.mockResolvedValue(null);
    const result = await postArticleToLinkedIn('non-editorial-review');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not an editorial post');
  });

  it('skips editorial posts already recorded in linkedin_posts', async () => {
    mockExtractor.extractArticleForLinkedIn.mockResolvedValue({
      title: 'Already Posted Editorial',
      summary: 'Summary',
      url: 'https://researchwith.me/post/already-posted',
      authorName: 'Ashif Ahmed Shuvo',
      category: 'Research Reviews',
      tags: [],
      publicationType: 'editorial',
    });
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'linkedin_list_posted_slugs') {
        return { data: [{ post_slug: 'already-posted' }], error: null };
      }
      return { data: null, error: null };
    });

    const result = await postArticleToLinkedIn('already-posted');
    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(mockClient.postArticle).not.toHaveBeenCalled();
  });

  it('checkAndPostNewArticles filters out already-posted editorials', async () => {
    mockEditorials.mockResolvedValue([
      { slug: 'old-editorial', publicationType: 'editorial' },
      { slug: 'new-editorial', publicationType: 'editorial' },
    ]);
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'linkedin_list_posted_slugs') {
        return { data: [{ post_slug: 'old-editorial' }], error: null };
      }
      return { data: null, error: null };
    });
    mockExtractor.extractArticleForLinkedIn.mockResolvedValue({
      title: 'New Editorial',
      summary: 'S',
      url: 'https://researchwith.me/post/new-editorial',
      authorName: 'A',
      category: 'C',
      tags: [],
      publicationType: 'editorial',
    });
    mockClient.postArticle.mockResolvedValue({ success: true, postUrn: 'urn:new' });

    const batch = await checkAndPostNewArticles();
    expect(batch.posted).toBe(1);
    expect(batch.skipped).toBe(1);
    expect(batch.failed).toBe(0);
    expect(mockClient.postArticle).toHaveBeenCalledTimes(1);
  });

  it('batch posts multiple articles with rate limiting', async () => {
    const articles = ['article-1', 'article-2', 'article-3'];
    mockExtractor.extractArticleForLinkedIn
      .mockResolvedValueOnce({ title: 'Article 1', summary: 'S1', url: 'u1', authorName: 'A', category: 'C', tags: [], publicationType: 'editorial' })
      .mockResolvedValueOnce({ title: 'Article 2', summary: 'S2', url: 'u2', authorName: 'A', category: 'C', tags: [], publicationType: 'editorial' })
      .mockResolvedValueOnce({ title: 'Article 3', summary: 'S3', url: 'u3', authorName: 'A', category: 'C', tags: [], publicationType: 'editorial' });
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
      .mockResolvedValueOnce({ title: 'Article 1', summary: 'S1', url: 'u1', authorName: 'A', category: 'C', tags: [], publicationType: 'editorial' })
      .mockResolvedValueOnce({ title: 'Article 2', summary: 'S2', url: 'u2', authorName: 'A', category: 'C', tags: [], publicationType: 'editorial' });
    mockClient.postArticle
      .mockResolvedValueOnce({ success: true, postUrn: 'urn:1' })
      .mockResolvedValueOnce({ success: false, error: 'Rate limited' });

    const result = await batchPostArticles(articles);
    expect(result.posted).toBe(1);
    expect(result.failed).toBe(1);
  });
});
