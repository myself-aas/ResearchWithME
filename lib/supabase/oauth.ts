'use client';

import type { Provider } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './client';

/** Providers enabled in Supabase Auth. */
export type OAuthProviderId = 'google' | 'github' | 'orcid';

// ORCID is a custom OIDC provider in Supabase; its identifier must match the
// one set under Authentication → Sign In / Providers → Custom providers.
const SUPABASE_PROVIDER: Record<OAuthProviderId, Provider> = {
  google: 'google',
  github: 'github',
  orcid: 'custom:orcid',
};

const SCOPES: Partial<Record<OAuthProviderId, string>> = {
  github: 'read:user user:email',
  orcid: 'openid',
};

export function authCallbackUrl(next: string) {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

/**
 * Starts a full-page OAuth redirect through Supabase. Resolves only when the
 * redirect could not start; on success the browser navigates away.
 */
export async function startOAuthSignIn(provider: OAuthProviderId, next: string): Promise<{ error: string } | void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: SUPABASE_PROVIDER[provider],
    options: {
      redirectTo: authCallbackUrl(next),
      scopes: SCOPES[provider],
    },
  });
  if (error) return { error: error.message };
}
