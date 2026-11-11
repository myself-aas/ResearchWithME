import { parseCookieHeader, serializeCookieHeader, type CookieOptions } from '@supabase/ssr';

export type { CookieOptions };

export interface CookieEntry {
  name: string;
  value: string;
}

export interface PendingCookie extends CookieEntry {
  options: CookieOptions;
}

/**
 * Copies a Response's headers into a fresh Headers instance, preserving every
 * `Set-Cookie` value. `new Headers(old)` folds repeated Set-Cookie headers in
 * some runtimes, which would silently drop all but one refreshed session
 * cookie — so the multi-valued header is rebuilt explicitly.
 */
export function cloneResponseHeaders(source: Headers): Headers {
  const target = new Headers();
  const multi = typeof source.getSetCookie === 'function' ? source.getSetCookie() : [];
  source.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return;
    target.set(key, value);
  });
  for (const cookie of multi) target.append('set-cookie', cookie);
  // Runtime without getSetCookie(): the combined value was copied verbatim above.
  return target;
}

/**
 * Per-request cookie jar. The SSR Supabase client writes through `setAll`
 * (session refresh, sign-out); those writes accumulate here and are appended
 * to the response in `apply`, which must be called before the response is
 * committed to the client.
 *
 * Cache headers handed over by `@supabase/ssr` on the first write (private,
 * no-store) are captured and applied alongside the cookies so a refreshed
 * session is never served from a shared cache.
 */
export interface CookieJar {
  /** Current view: request cookies overlaid with anything written this request. */
  getAll(): CookieEntry[];
  setAll(cookies: PendingCookie[], cacheHeaders?: Record<string, string>): void;
  /** True once the SSR client has written at least one cookie this request. */
  readonly hasPendingChanges: boolean;
  apply(response: Response): Response;
}

export function createCookieJar(request: Request): CookieJar {
  let initial: CookieEntry[];
  try {
    initial = parseCookieHeader(request.headers.get('cookie') ?? '');
  } catch (error) {
    console.error('Could not parse the request cookie header:', error);
    initial = [];
  }

  const pending: PendingCookie[] = [];
  let cacheHeaders: Record<string, string> | null = null;

  function getAll(): CookieEntry[] {
    const byName = new Map(initial.map((cookie) => [cookie.name, cookie.value]));
    for (const cookie of pending) byName.set(cookie.name, cookie.value);
    return [...byName].map(([name, value]) => ({ name, value }));
  }

  return {
    getAll,

    setAll(cookies, headers) {
      if (headers && !cacheHeaders) cacheHeaders = { ...headers };
      for (const cookie of cookies) pending.push({ ...cookie });
    },

    get hasPendingChanges() {
      return pending.length > 0;
    },

    apply(response) {
      const headers = cloneResponseHeaders(response.headers);
      for (const cookie of pending) {
        headers.append('set-cookie', serializeCookieHeader(cookie.name, cookie.value, cookie.options));
      }
      if (pending.length > 0 && cacheHeaders) {
        for (const [key, value] of Object.entries(cacheHeaders)) {
          if (!headers.has(key)) headers.set(key, value);
        }
        if (!headers.has('cache-control')) {
          headers.set('cache-control', 'private, no-store');
        }
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    },
  };
}
