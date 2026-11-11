'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { hasSupabaseBrowserConfig } from './config';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  /**
   * Mirrors the server-side `public.is_editor()` allowlist. This is a display
   * hint only — every write route re-checks the gate on the server, so nothing
   * here can grant access.
   */
  isEditor: boolean;
  /** Providers already linked to the account, e.g. ['email', 'github']. */
  providers: string[];
  /** Linked scholarly identities with the handle to cite on an application. */
  identities: LinkedIdentity[];
}

export interface LinkedIdentity {
  provider: 'github' | 'orcid';
  /** GitHub username, or the ORCID iD. Empty when the provider omits it. */
  handle: string;
}

export interface Session {
  user: SessionUser | null;
  /** False until the browser session has been read, so the first paint is stable. */
  hydrated: boolean;
  signOut: () => Promise<void>;
}

function displayName(email: string, metadata: Record<string, unknown>) {
  for (const key of ['full_name', 'name', 'display_name', 'user_name']) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 120);
  }
  return email.split('@')[0]?.slice(0, 80) || 'Reader';
}

/**
 * Pulls the handle out of a linked identity. GitHub returns the username under
 * `user_name` or `preferred_username`; the ORCID OIDC provider returns the iD as
 * the subject claim. Both are absent for the `email` provider.
 */
function linkedIdentities(account: User): LinkedIdentity[] {
  const found: LinkedIdentity[] = [];
  for (const identity of account.identities ?? []) {
    if (identity.provider !== 'github' && identity.provider !== 'orcid') continue;
    const data = (identity.identity_data ?? {}) as Record<string, unknown>;
    const candidates = [data.user_name, data.preferred_username, data.sub, data.full_name];
    const handle = candidates.find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
    found.push({
      provider: identity.provider,
      handle: (handle ?? '').trim().slice(0, 160),
    });
  }
  return found;
}

function toSessionUser(account: User, isEditor: boolean): SessionUser {
  const metadata = (account.user_metadata ?? {}) as Record<string, unknown>;
  const email = account.email ?? '';
  const identities = linkedIdentities(account);
  return {
    id: account.id,
    email,
    name: displayName(email, metadata),
    isEditor,
    identities,
    providers: (account.identities ?? [])
      .map((identity) => identity.provider)
      .filter((provider): provider is string => typeof provider === 'string'),
  };
}

/**
 * Read-only mirror of the Supabase session for client components that render on
 * statically generated pages, where a server component cannot read cookies.
 *
 * Deliberately has no setters: the previous `auth-context` let any visitor write
 * an author role into localStorage and the UI honoured it. Permission now comes
 * from the server only, and this hook exists to reflect it, not to hold it.
 */
export function useSession(): Session {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hasSupabaseBrowserConfig()) {
      setHydrated(true);
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | null = null;

    void import('./client')
      .then(({ getSupabaseBrowserClient }) => {
        if (!active) return;
        const supabase = getSupabaseBrowserClient();

        async function read(account: User | null) {
          if (!account) {
            if (active) setUser(null);
            return;
          }
          let isEditor = false;
          try {
            const { data } = await supabase.rpc('is_editor');
            isEditor = data === true;
          } catch {
            // Fail closed: an unreadable allowlist means the header shows reader
            // affordances, and the server still enforces the real gate.
            isEditor = false;
          }
          if (active) setUser(toSessionUser(account, isEditor));
        }

        supabase.auth
          .getUser()
          .then(({ data }) => read(data.user))
          .catch(() => undefined)
          .finally(() => {
            if (active) setHydrated(true);
          });

        const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
          if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return;
          // Deferred: Supabase must not be called synchronously from this callback.
          setTimeout(() => void read(session?.user ?? null), 0);
        });
        unsubscribe = () => subscription.subscription.unsubscribe();
      })
      .catch(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  async function signOut() {
    if (!hasSupabaseBrowserConfig()) return;
    const { getSupabaseBrowserClient } = await import('./client');
    await getSupabaseBrowserClient().auth.signOut();
    setUser(null);
  }

  return { user, hydrated, signOut };
}
