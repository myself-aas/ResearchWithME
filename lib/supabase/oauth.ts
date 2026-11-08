'use client';

import type { Provider } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from './client';
import { safeNextPath } from '../safe-redirect';

export type OAuthProviderId = 'google' | 'github' | 'orcid';

/** Providers a reader may attach to an existing account to apply as a writer. */
export type LinkableProviderId = 'github' | 'orcid';

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

function normaliseError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Sign in. Used for Google only: email and password go straight to Supabase, and
 * GitHub and ORCID are identity links on an existing account rather than a way
 * in — see `linkScholarlyIdentity`.
 */
export async function startOAuthSignIn(
  provider: OAuthProviderId,
  next: string,
): Promise<{ ok: boolean; error?: string }> {
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
    return { ok: false, error: normaliseError(err, 'Could not initialize the sign-in provider.') };
  }
}

/**
 * Attach GitHub or ORCID to the account that is already signed in.
 *
 * This must not be `signInWithOAuth`: that would replace the session with a new
 * one for the provider account, signing the reader out of the identity they
 * applied from. `linkIdentity` keeps the current session and adds the provider to
 * `user.identities`, which is what the application reads back.
 */
export async function linkScholarlyIdentity(
  provider: LinkableProviderId,
  returnTo: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!hasSupabaseBrowserConfig()) {
    return { ok: false, error: 'Supabase is not configured. Contact the site administrator.' };
  }

  try {
    const { data, error } = await getSupabaseBrowserClient().auth.linkIdentity({
      provider: SUPABASE_PROVIDER[provider],
      options: {
        redirectTo: authCallbackUrl(returnTo),
        scopes: SCOPES[provider],
        skipBrowserRedirect: true,
      },
    });
    if (error) return { ok: false, error: error.message };
    if (!data?.url) return { ok: false, error: 'The provider did not return an authorization URL.' };
    window.location.assign(data.url);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: normaliseError(err, 'Could not start connecting that account.') };
  }
}
