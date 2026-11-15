import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthUrl, exchangeCodeForTokens } from '@/lib/linkedin/oauth';

describe('LinkedIn OAuth', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.LINKEDIN_CLIENT_ID = 'test-client-id';
    process.env.LINKEDIN_CLIENT_SECRET = 'test-client-secret';
    process.env.LINKEDIN_REDIRECT_URI = 'https://example.com/callback';
  });

  it('generates correct authorization URL with required scopes', () => {
    const url = getAuthUrl('test-state-123');
    expect(url).toContain('https://www.linkedin.com/oauth/v2/authorization');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
      // URLSearchParams encodes spaces as + not %20
      expect(url).toContain('scope=r_organization_social+w_member_social+rw_organization_admin');
    expect(url).toContain('state=test-state-123');
    expect(url).toContain('response_type=code');
  });

  it('exchanges authorization code for token response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        expires_in: 5184000,
        token_type: 'Bearer',
      }),
    });

    const result = await exchangeCodeForTokens('auth-code-789');
    expect(result.access_token).toBe('access-token-123');
    expect(result.refresh_token).toBe('refresh-token-456');
    expect(result.expires_in).toBe(5184000);
  });
});