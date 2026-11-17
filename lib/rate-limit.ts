import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  clientIp,
  createCloudflareRateLimitStore,
  createKvRateLimitStore,
  createMemoryRateLimitStore,
} from './rate-limit-core';
import type {
  CloudflareRateLimiterLike,
  KvNamespaceLike,
  RateLimitOutcome,
  RateLimitStore,
} from './rate-limit-core';

export type {
  CloudflareRateLimiterLike,
  KvNamespaceLike,
  RateLimitOutcome,
  RateLimitStore,
} from './rate-limit-core';
export {
  createCloudflareRateLimitStore,
  createKvRateLimitStore,
  createMemoryRateLimitStore,
} from './rate-limit-core';

function cloudflareEnv(): Partial<Record<string, unknown>> | undefined {
  try {
    return getCloudflareContext().env as Partial<Record<string, unknown>> | undefined;
  } catch {
    // Outside a Worker request (local `next dev`, unit tests) there is no context.
    return undefined;
  }
}

/**
 * Prefers Cloudflare's native Rate Limiting binding (`APP_RATE_LIMITER`,
 * zero KV writes on Free plan), falling back to optional `RATE_LIMIT_KV`,
 * and finally per-isolate memory in local dev/tests.
 */
function nativeLimiterBinding(): CloudflareRateLimiterLike | null {
  const candidate = cloudflareEnv()?.APP_RATE_LIMITER as CloudflareRateLimiterLike | undefined;
  if (candidate && typeof candidate.limit === 'function') {
    return candidate;
  }
  return null;
}

function kvBinding(): KvNamespaceLike | null {
  const candidate = cloudflareEnv()?.RATE_LIMIT_KV as KvNamespaceLike | undefined;
  if (candidate && typeof candidate.get === 'function' && typeof candidate.put === 'function') {
    return candidate;
  }
  return null;
}

let store: RateLimitStore | null = null;

export function getRateLimitStore(): RateLimitStore {
  if (!store) {
    const nativeLimiter = nativeLimiterBinding();
    if (nativeLimiter) {
      store = createCloudflareRateLimitStore(nativeLimiter);
    } else {
      const kv = kvBinding();
      store = kv ? createKvRateLimitStore(kv) : createMemoryRateLimitStore();
    }
  }
  return store;
}

/** Test hook: pin the store so a suite can exercise a chosen backend. */
export function setRateLimitStoreForTesting(next: RateLimitStore | null) {
  store = next;
}

/**
 * Records one hit against `key` and reports whether it is within the window.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitOutcome> {
  return getRateLimitStore().hit(key, limit, windowMs);
}

export function clientKey(request: Request, scope: string) {
  return `${scope}:${clientIp(request)}`;
}
