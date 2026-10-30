import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. Always create a new one per request — never cache it.
 *
 * Cookie writes can fail inside Server Components. That is expected: the
 * middleware refreshes the session on every dashboard request, so we swallow
 * the error here and keep rendering.
 */
/**
 * Reads are capped so a slow or unreachable project cannot hold a page render
 * open. Writes, uploads, and auth are left alone: they need the full timeout.
 */
const READ_TIMEOUT_MS = 8000;

function fetchWithReadTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return fetch(input, init);
  const timeout = AbortSignal.timeout(READ_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: fetchWithReadTimeout },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component: the middleware already handles the
          // refresh, so no action is required here.
        }
      },
    },
  });
}

/**
 * Stateless anonymous client for public reads. It never touches cookies, so it
 * can be used from statically rendered pages and Incremental Static
 * Regeneration without opting the route into dynamic rendering.
 */
let publicClient: SupabaseClient | null = null;

export function getSupabasePublicClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }
  if (!publicClient) {
    publicClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch: fetchWithReadTimeout },
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Anonymous reads never persist a session.
        },
      },
    });
  }
  return publicClient;
}
