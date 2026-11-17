import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
  rpc: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  getSupabasePublicClient: () => mockSupabase,
}));

vi.mock('@/lib/supabase/config', () => ({
  isSupabaseConfigured: true,
}));

vi.mock('@/lib/crypto', () => ({
  encrypt: vi.fn((s: string) => `encrypted-${s}`),
  decrypt: vi.fn((s: string) => s.replace('encrypted-', '')),
}));

import { TokenStore } from '@/lib/linkedin/token-store';

describe('TokenStore (Bridge RPC)', () => {
  let tokenStore: TokenStore;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LINKEDIN_BRIDGE_SECRET = 'bridge-test-secret';
    tokenStore = new TokenStore();
  });

  it('retrieves and decrypts tokens via linkedin_get_tokens RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [
        {
          access_token: 'encrypted-access-token',
          refresh_token: 'encrypted-refresh-token',
          expires_at: Date.now() + 3600000,
          scope: 'r_organization_social w_member_social rw_organization_admin',
        },
      ],
      error: null,
    });

    const tokens = await tokenStore.getTokens();
    expect(mockSupabase.rpc).toHaveBeenCalledWith('linkedin_get_tokens', {
      p_secret: 'bridge-test-secret',
    });
    expect(tokens!.access_token).toBe('access-token');
    expect(tokens!.refresh_token).toBe('refresh-token');
  });

  it('saves encrypted tokens via linkedin_save_tokens RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    await tokenStore.saveTokens({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_at: 1800000000000,
      scope: 'r_organization_social w_member_social rw_organization_admin',
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('linkedin_save_tokens', {
      p_access_token: 'encrypted-new-access-token',
      p_refresh_token: 'encrypted-new-refresh-token',
      p_expires_at: 1800000000000,
      p_scope: 'r_organization_social w_member_social rw_organization_admin',
      p_secret: 'bridge-test-secret',
    });
  });

  it('deletes tokens via linkedin_delete_tokens RPC', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    await tokenStore.deleteTokens();

    expect(mockSupabase.rpc).toHaveBeenCalledWith('linkedin_delete_tokens', {
      p_secret: 'bridge-test-secret',
    });
  });
});
