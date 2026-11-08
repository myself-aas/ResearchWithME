'use client';

import type { Provider } from '@supabase/supabase-js';
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from './client';
import { isSupabaseConfigured } from './config';

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
  google: 'openid email profile',
};

export function authCallbackUrl(next: string) {
  if (typeof window === 'undefined') return '/auth/callback';
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

export interface OAuthSignInResult {
  ok: boolean;
  error?: string;
  mode: 'cloud-popup' | 'cloud-redirect' | 'interactive';
  url?: string;
}

/**
 * Initiates an OAuth sign-in flow.
 * - In cloud mode (when Supabase credentials are configured), opens the provider
 *   authorization URL in an iframe-safe popup as recommended by the OAuth specification.
 * - In local demo/preview mode, signals 'interactive' so the UI can present the
 *   interactive OAuth 2.0 authorization screen with scope consent and identity attestation.
 */
export async function startOAuthSignIn(
  provider: OAuthProviderId,
  next: string,
  onComplete?: (success: boolean) => void
): Promise<OAuthSignInResult> {
  if (!isSupabaseConfigured || !hasSupabaseBrowserConfig()) {
    return { ok: true, mode: 'interactive' };
  }

  try {
    const supabase = getSupabaseBrowserClient();
    const redirectTo = authCallbackUrl(next);

    // AI Studio preview runs inside an iframe. Standard window redirects to third-party
    // providers (Google, GitHub) fail due to X-Frame-Options: DENY. We ask Supabase for
    // the authorization URL directly with skipBrowserRedirect: true and open it in a popup.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: SUPABASE_PROVIDER[provider],
      options: {
        redirectTo,
        scopes: SCOPES[provider],
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { ok: false, error: error.message, mode: 'cloud-popup' };
    }

    if (data?.url) {
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        data.url,
        `oauth_${provider}_popup`,
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Popup was blocked by browser - fallback to full page redirect with notification
        window.location.assign(data.url);
        return { ok: true, mode: 'cloud-redirect', url: data.url };
      }

      // Listen for postMessage from /auth/callback
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          window.removeEventListener('message', messageHandler);
          if (onComplete) onComplete(true);
          window.location.assign(next);
        } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
          window.removeEventListener('message', messageHandler);
          if (onComplete) onComplete(false);
        }
      };

      window.addEventListener('message', messageHandler);
      return { ok: true, mode: 'cloud-popup', url: data.url };
    }

    return { ok: true, mode: 'interactive' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Could not initialize OAuth provider';
    return { ok: false, error: msg, mode: 'cloud-popup' };
  }
}
