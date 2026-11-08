'use client';

import type { Provider } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from './client';
import { safeNextPath } from '../safe-redirect';

export type OAuthProviderId = 'google' | 'github' | 'orcid';

// ORCID requires a custom OIDC provider with this identifier in Supabase.
const SUPABASE_PROVIDER: Record<OAuthProviderId, Provider> = {
  google: 'google',
  github: 'github',
  orcid: 'custom:orcid',
};

const SCOPES: Record<OAuthProviderId, string> = {
  github: 'read:user user:email',
  orcid: 'openid',
  google: 'openid email profile',
};

export function authCallbackUrl(next: string) {
  if (typeof window === 'undefined') return '/auth/callback';
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath(next, '/'))}`;
}

/** Start a same-tab PKCE flow so its verifier and session use the same browser context. */
export async function startOAuthSignIn(provider: OAuthProviderId, next: string): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseBrowserConfig()) {
    return { ok: false, error: 'Supabase is not configured. Contact the site administrator.' };
  }

  try {
    const { data, error } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: SUPABASE_PROVIDER[provider],
      options: {
        redirectTo: authCallbackUrl(next),
        scopes: SCOPES[provider],
        skipBrowserRedirect: true,
      },
    });
    if (error) return { ok: false, error: error.message };
    if (!data.url) return { ok: false, error: 'The sign-in provider did not return an authorization URL.' };
    window.location.assign(data.url);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not initialize OAuth provider.' };
  }
}
