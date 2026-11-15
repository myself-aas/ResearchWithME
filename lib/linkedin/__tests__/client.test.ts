import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock TokenStore at the top level
const mockTokenStore = {
  getTokens: vi.fn(),
  saveTokens: vi.fn(),
  isTokenExpired: vi.fn(),
};

vi.mock('@/lib/linkedin/token-store', () => ({
  TokenStore: vi.fn().mockImplementation(() => mockTokenStore),
}));

import { LinkedInClient } from '@/lib/linkedin/client';

describe('LinkedInClient', () => {
  let client: LinkedInClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new LinkedInClient();
  });

  it('posts article to company page and returns post URN', async () => {
    mockTokenStore.getTokens.mockResolvedValue({
      access_token: 'valid-access-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() + 3600000,
      scope: 'r_organization_social w_member_social rw_organization_admin',
    });
    mockTokenStore.isTokenExpired.mockReturnValue(false);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'urn:li:share:123456789' }),
    });

    const result = await client.postArticle({
      title: 'Test Article',
      summary: 'Test summary',
      url: 'https://researchwith.me/post/test-article',
      coverImage: 'https://researchwith.me/images/cover.jpg',
      authorName: 'Test Author',
      category: 'Research Reviews',
      tags: ['AI', 'Machine Learning'],
      doi: '10.5555/rwm.test',
    });

    expect(result.success).toBe(true);
    expect(result.postUrn).toBe('urn:li:share:123456789');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.linkedin.com/rest/posts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-access-token',
          'Content-Type': 'application/json',
          'LinkedIn-Version': '2024-07',
        }),
      })
    );
  });

  it('refreshes expired token before posting', async () => {
    mockTokenStore.getTokens
      .mockResolvedValueOnce({
        access_token: 'expired-token',
        refresh_token: 'refresh-token',
        expires_at: Date.now() - 1000,
        scope: 'r_organization_social w_member_social rw_organization_admin',
      })
      .mockResolvedValueOnce({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: Date.now() + 5184000000,
        scope: 'r_organization_social w_member_social rw_organization_admin',
      });
    mockTokenStore.isTokenExpired.mockReturnValue(true);

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 5184000,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'urn:li:share:987654321' }),
      });

    const result = await client.postArticle({
      title: 'Test Article',
      summary: 'Test summary',
      url: 'https://researchwith.me/post/test-article',
      authorName: 'Test Author',
      category: 'Research Reviews',
      tags: [],
    });

    expect(result.success).toBe(true);
    expect(result.postUrn).toBe('urn:li:share:987654321');
    expect(mockTokenStore.saveTokens).toHaveBeenCalled();
  });
});