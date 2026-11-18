// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ configured: true, signInWithOAuth: vi.fn() }));

vi.mock('@/lib/supabase/client', () => ({
  hasSupabaseBrowserConfig: () => state.configured,
  getSupabaseBrowserClient: () => ({ auth: { signInWithOAuth: state.signInWithOAuth } }),
}));

import { SIGN_IN_PROVIDERS, authCallbackUrl, startOAuthSignIn } from '@/lib/supabase/oauth';

beforeEach(() => {
  state.configured = true;
  state.signInWithOAuth.mockReset();
});

describe('OAuth sign-in providers', () => {
  it('offers exactly the three providers rendered on /login', () => {
    expect(SIGN_IN_PROVIDERS).toEqual(['google', 'linkedin', 'discord']);
  });

  it('starts Google with the openid/email/profile scopes', async () => {
    state.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/o/oauth2/v2/auth?x=1' },
      error: null,
    });
    const navigate = vi.fn();

    const result = await startOAuthSignIn('google', '/dashboard', navigate);

    expect(result).toEqual({ ok: true });
    expect(state.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=%2Fdashboard`,
        scopes: 'openid email profile',
        skipBrowserRedirect: true,
      },
    });
    expect(navigate).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth?x=1');
  });

  it('starts LinkedIn through the OIDC provider, not the deprecated legacy one', async () => {
    state.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://www.linkedin.com/oauth/v2/authorization?x=1' },
      error: null,
    });
    const navigate = vi.fn();

    const result = await startOAuthSignIn('linkedin', '/dashboard', navigate);

    expect(result).toEqual({ ok: true });
    expect(state.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'linkedin_oidc',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=%2Fdashboard`,
        scopes: 'openid profile email',
        skipBrowserRedirect: true,
      },
    });
    expect(navigate).toHaveBeenCalledWith('https://www.linkedin.com/oauth/v2/authorization?x=1');
  });

  it('starts Discord with the owner-approved OIDC scopes — never bot or guild permissions', async () => {
    state.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://discord.com/oauth2/authorize?x=1' },
      error: null,
    });
    const navigate = vi.fn();

    const result = await startOAuthSignIn('discord', '/dashboard', navigate);

    expect(result).toEqual({ ok: true });
    const call = state.signInWithOAuth.mock.calls[0][0];
    expect(call.provider).toBe('discord');
    expect(call.options.scopes).toBe('openid identify email connections');
    expect(call.options.scopes).not.toContain('bot');
    expect(call.options.scopes).not.toContain('guilds');
    expect(call.options.scopes).not.toContain('permissions');
    expect(call.options.redirectTo).toBe(
      `${window.location.origin}/auth/callback?next=%2Fdashboard`,
    );
    expect(navigate).toHaveBeenCalledWith('https://discord.com/oauth2/authorize?x=1');
  });

  it("sanitises the post-sign-in path so an external return URL cannot hijack the callback", async () => {
    expect(authCallbackUrl('//evil.example')).toBe(
      `${window.location.origin}/auth/callback?next=%2F`,
    );
    expect(authCallbackUrl('/write')).toContain('next=%2Fwrite');
  });

  it('reports a provider failure without navigating away', async () => {
    state.signInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: 'Provider is not enabled' },
    });
    const navigate = vi.fn();

    const result = await startOAuthSignIn('linkedin', '/dashboard', navigate);

    expect(result).toEqual({ ok: false, error: 'Provider is not enabled' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports a missing authorization URL instead of a blank redirect', async () => {
    state.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });
    const result = await startOAuthSignIn('google', '/dashboard', vi.fn());
    expect(result.ok).toBe(false);
    expect(result.error).toContain('did not return an authorization URL');
  });

  it('refuses to start when Supabase is not configured', async () => {
    state.configured = false;
    const result = await startOAuthSignIn('linkedin', '/dashboard', vi.fn());
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not configured');
    expect(state.signInWithOAuth).not.toHaveBeenCalled();
  });
});
