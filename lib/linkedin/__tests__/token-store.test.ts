import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies at the top level
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  upsert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
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

describe('TokenStore', () => {
  let tokenStore: TokenStore;

  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore = new TokenStore();
  });

  it('retrieves and decrypts tokens from Supabase', async () => {
    mockSupabase.single.mockResolvedValue({
      data: {
        access_token: 'encrypted-access-token',
        refresh_token: 'encrypted-refresh-token',
        expires_at: Date.now() + 3600000,
        scope: 'r_organization_social w_member_social rw_organization_admin',
      },
      error: null,
    });

    const tokens = await tokenStore.getTokens();
      expect(tokens!.access_token).toBe('access-token');
      expect(tokens!.refresh_token).toBe('refresh-token');
  });

  it('saves encrypted tokens to Supabase', async () => {
    mockSupabase.upsert.mockResolvedValue({ error: null });

    await tokenStore.saveTokens({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_at: Date.now() + 5184000000,
      scope: 'r_organization_social w_member_social rw_organization_admin',
    });

    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        access_token: 'encrypted-new-access-token',
        refresh_token: 'encrypted-new-refresh-token',
      }),
      { onConflict: 'id' }
    );
  });
});