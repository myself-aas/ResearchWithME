import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkedInClient } from '@/lib/linkedin/client';
import { formatLinkedInPost } from '@/lib/linkedin/content-formatter';

// Mock the catalogue at the top level using vi.hoisted
const { mockCatalogue } = vi.hoisted(() => ({
  mockCatalogue: vi.fn(),
}));

vi.mock('@/lib/cms/catalogue', () => ({
  getCachedArticleCatalogue: mockCatalogue,
}));

// Mock token store at the top level
const { mockTokenStore } = vi.hoisted(() => ({
  mockTokenStore: {
    getTokens: vi.fn(),
    saveTokens: vi.fn(),
    isTokenExpired: vi.fn(),
  },
}));

vi.mock('@/lib/linkedin/token-store', () => ({
  TokenStore: vi.fn().mockImplementation(() => mockTokenStore),
}));

import { extractArticleForLinkedIn } from '@/lib/linkedin/article-extractor';

describe('LinkedIn Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LINKEDIN_CLIENT_ID = 'test-client';
    process.env.LINKEDIN_CLIENT_SECRET = 'test-secret';
    process.env.LINKEDIN_REDIRECT_URI = 'https://test.com/callback';
    process.env.LINKEDIN_COMPANY_URN = 'urn:li:organization:144133153';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://researchwith.me';
  });

  it('full flow: extract article -> format -> post', async () => {
    // Mock editorial article data (LinkedIn automation applies to editorials only)
    const mockArticle = {
      id: 'post-integration',
      slug: 'integration-test',
      title: 'Integration Test Article',
      subtitle: 'Testing the full pipeline',
      category: 'Research Reviews',
      format: 'Deep-Dive Essay',
      publicationType: 'editorial',
      author: { id: 'a1', name: 'Test Author', avatar: 'TA', role: 'Researcher', domain: 'AI' },
      publishedAt: 'January 15, 2026',
      readTime: '10 min read',
      coverImage: '/images/test.jpg',
      featured: true,
      summary: 'This is a test article for integration testing.',
      content: ['Para 1'],
      keyTakeaways: ['Takeaway 1'],
      tags: ['Testing', 'Integration'],
      likes: 0,
      commentsCount: 0,
      dateISO: '2026-01-15',
    };

    mockCatalogue.mockResolvedValue([mockArticle]);

    mockTokenStore.getTokens.mockResolvedValue({
      access_token: 'valid-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() + 3600000,
      scope: 'r_organization_social w_member_social rw_organization_admin',
    });
    mockTokenStore.saveTokens.mockResolvedValue(undefined);
    mockTokenStore.isTokenExpired.mockReturnValue(false);

    // Mock fetch for LinkedIn API
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'urn:li:share:integration123' }),
      });

    // Run full flow
    const article = await extractArticleForLinkedIn('integration-test');
    expect(article).not.toBeNull();

    const formatted = formatLinkedInPost(article!);
    expect(formatted.text).toContain('Integration Test Article');
    expect(formatted.text.length).toBeLessThanOrEqual(3000);

    const client = new LinkedInClient();
    const result = await client.postArticle(article!);
    expect(result.success).toBe(true);
    expect(result.postUrn).toBe('urn:li:share:integration123');
  });

  it('handles special characters in article content', async () => {
    const mockArticle = {
      id: 'post-special',
      slug: 'special-chars',
      title: 'Article with "Quotes" & <Tags>',
      subtitle: 'Subtitle',
      category: 'Research Reviews',
      format: 'Deep-Dive Essay',
      publicationType: 'editorial',
      author: { id: 'a1', name: 'Author', avatar: 'A', role: 'Researcher', domain: 'AI' },
      publishedAt: 'January 15, 2026',
      readTime: '5 min read',
      coverImage: '',
      featured: false,
      summary: 'Summary with special chars: "quotes", <tags>, & ampersands',
      content: [],
      keyTakeaways: [],
      tags: ['Special', 'Chars'],
      likes: 0,
      commentsCount: 0,
    };

    mockCatalogue.mockResolvedValue([mockArticle]);

    mockTokenStore.getTokens.mockResolvedValue({
      access_token: 'valid-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() + 3600000,
      scope: 'r_organization_social w_member_social rw_organization_admin',
    });
    mockTokenStore.saveTokens.mockResolvedValue(undefined);
    mockTokenStore.isTokenExpired.mockReturnValue(false);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'urn:li:share:special123' }),
    });

    const article = await extractArticleForLinkedIn('special-chars');
    const formatted = formatLinkedInPost(article!);
    
    // Verify special characters are handled
    expect(formatted.text).toContain('"Quotes"');
    expect(formatted.text).toContain('<Tags>');
    expect(formatted.text).toContain('& ampersands');
  });
});