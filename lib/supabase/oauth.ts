'use client';

import { getSupabaseBrowserClient } from './client';

/**
 * Providers enabled in Supabase Auth. Add 'orcid' here once its custom OIDC
 * provider is configured in the Supabase dashboard.
 */
export type OAuthProviderId = 'google' | 'github';

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
    provider,
    options: {
      redirectTo: authCallbackUrl(next),
      scopes: provider === 'github' ? 'read:user user:email' : undefined,
    },
  });
  if (error) return { error: error.message };
}
