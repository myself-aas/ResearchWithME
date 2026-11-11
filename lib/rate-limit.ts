import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createKvRateLimitStore, createMemoryRateLimitStore } from './rate-limit-core';
import type { KvNamespaceLike, RateLimitOutcome, RateLimitStore } from './rate-limit-core';

export type { KvNamespaceLike, RateLimitOutcome, RateLimitStore } from './rate-limit-core';
export { createKvRateLimitStore, createMemoryRateLimitStore } from './rate-limit-core';

/**
 * Reads the `RATE_LIMIT_KV` binding declared in `wrangler.jsonc`.
 *
 * `env` is widened deliberately: the precise shape lives in `cloudflare-env.d.ts`,
 * which `npm run cf-typegen` regenerates from the Wrangler config and which is
 * git-ignored, so this module must compile without it.
 */
function kvBinding(): KvNamespaceLike | null {
  try {
    const env = getCloudflareContext().env as Partial<Record<string, unknown>> | undefined;
    const candidate = env?.RATE_LIMIT_KV as KvNamespaceLike | undefined;
    if (candidate && typeof candidate.get === 'function' && typeof candidate.put === 'function') {
      return candidate;
    }
  } catch {
    // Outside a Worker request (local `next dev`, unit tests) there is no context.
  }
  return null;
}

let store: RateLimitStore | null = null;

export function getRateLimitStore(): RateLimitStore {
  if (!store) {
    const kv = kvBinding();
    store = kv ? createKvRateLimitStore(kv) : createMemoryRateLimitStore();
  }
  return store;
}

/** Test hook: pin the store so a suite can exercise a chosen backend. */
export function setRateLimitStoreForTesting(next: RateLimitStore | null) {
  store = next;
}

/**
 * Records one hit against `key` and reports whether it is within the window.
 * Always awaited: the KV backend performs I/O.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitOutcome> {
  return getRateLimitStore().hit(key, limit, windowMs);
}

export function clientKey(request: Request, scope: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const address = forwarded || request.headers.get('x-real-ip') || 'local';
  return `${scope}:${address}`;
}
