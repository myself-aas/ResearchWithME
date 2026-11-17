'use client';

import type { Provider } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from './client';
import { safeNextPath } from '../safe-redirect';

export type OAuthProviderId = 'google' | 'linkedin' | 'discord' | 'github' | 'orcid';

/** Providers a reader may attach to an existing account to apply as a writer. */
export type LinkableProviderId = 'github' | 'orcid';

/** The providers offered on /login, in the order they are rendered. */
export const SIGN_IN_PROVIDERS = ['google', 'linkedin', 'discord'] as const;
export type SignInProviderId = (typeof SIGN_IN_PROVIDERS)[number];

/**
 * Supabase's provider identifiers. LinkedIn sign-in uses the OpenID Connect
 * connector (`linkedin_oidc`), not the deprecated legacy `linkedin` one: the
 * legacy provider cannot read an email address and LinkedIn has closed it to
 * new apps. ORCID is a custom OIDC provider configured under the identifier
 * `orcid`, so Supabase reports it as `custom:orcid`.
 */
const SUPABASE_PROVIDER: Record<OAuthProviderId, Provider> = {
  google: 'google',
  linkedin: 'linkedin_oidc',
  discord: 'discord',
  github: 'github',
  orcid: 'custom:orcid',
};

const SCOPES: Record<OAuthProviderId, string> = {
  github: 'read:user user:email',
  orcid: 'openid',
  google: 'openid email profile',
  // LinkedIn's OIDC product grants exactly these three; `w_member_social` is a
  // posting permission and does not belong on a sign-in request.
  linkedin: 'openid profile email',
  // Discord sign-in needs the identity and the address, nothing else. Never
  // `bot`, `guilds`, or `permissions` — those belong to a bot install link.
  discord: 'identify email',
};

export function authCallbackUrl(next: string) {
  if (typeof window === 'undefined') return '/auth/callback';
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNextPath(next, '/'))}`;
}

function normaliseError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Sign in with Google, LinkedIn, or Discord. Email and password go straight to
 * Supabase;
 * GitHub and ORCID are identity links on an existing account rather than a way
 * in — see `linkScholarlyIdentity`.
 *
 * `navigate` is injectable so the redirect can be asserted without a browser.
 */
export async function startOAuthSignIn(
  provider: SignInProviderId,
  next: string,
  navigate: (url: string) => void = (url) => window.location.assign(url),
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
    navigate(data.url);
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
