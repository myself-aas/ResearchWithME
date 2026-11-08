import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface RateLimitOutcome {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

/**
 * Structural view of the slice of a Cloudflare KV namespace this module uses.
 * Declared locally so `lib/` does not depend on `@cloudflare/workers-types`,
 * and so tests can supply a plain object.
 */
export interface KvNamespaceLike {
  get(key: string, options?: { type?: 'text' }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface RateLimitStore {
  readonly kind: 'kv' | 'memory';
  hit(key: string, limit: number, windowMs: number): Promise<RateLimitOutcome>;
}

/** Keys are namespaced so they cannot collide with the OpenNext cache prefixes. */
const KEY_PREFIX = 'rl:';
/** KV rejects a TTL below 60 seconds; every window here is at least that long. */
const MIN_TTL_SECONDS = 60;

interface Bucket {
  count: number;
  resetAt: number;
}

function deny(resetAt: number, now: number): RateLimitOutcome {
  return { allowed: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
}

function allow(remaining: number): RateLimitOutcome {
  return { allowed: true, remaining: Math.max(0, remaining), retryAfter: 0 };
}

function ttlSeconds(windowMs: number) {
  return Math.max(MIN_TTL_SECONDS, Math.ceil(windowMs / 1000));
}

function parseBucket(raw: string | null): Bucket | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { count?: unknown; resetAt?: unknown };
    if (typeof parsed.count === 'number' && typeof parsed.resetAt === 'number') {
      return { count: parsed.count, resetAt: parsed.resetAt };
    }
  } catch {
    // An unreadable value is treated as an empty window rather than an outage.
  }
  return null;
}

/**
 * Fixed-window counter shared by every Worker isolate through KV.
 *
 * Two properties are deliberate:
 * - **Fail open.** A KV read or write failure logs and allows the request. A
 *   cache outage should degrade protection, not take the site down.
 * - **Best effort under concurrency.** KV has no atomic increment, so two
 *   isolates can read the same count and both write `count + 1`, under-counting
 *   by at most the number of concurrent isolates. That is a loose limit, not a
 *   billing gate; it still bounds a single client far more tightly than the
 *   per-isolate memory it replaces.
 */
export function createKvRateLimitStore(kv: KvNamespaceLike): RateLimitStore {
  return {
    kind: 'kv',

    async hit(key, limit, windowMs) {
      const now = Date.now();
      const kvKey = `${KEY_PREFIX}${key}`;
      const ttl = ttlSeconds(windowMs);

      let bucket: Bucket | null;
      try {
        bucket = parseBucket(await kv.get(kvKey, { type: 'text' }));
      } catch (error) {
        console.error('Rate limiter could not read its counter:', error);
        return allow(limit - 1);
      }

      if (!bucket || bucket.resetAt <= now) {
        const fresh: Bucket = { count: 1, resetAt: now + windowMs };
        try {
          await kv.put(kvKey, JSON.stringify(fresh), { expirationTtl: ttl });
        } catch (error) {
          console.error('Rate limiter could not open a window:', error);
        }
        return allow(limit - 1);
      }

      if (bucket.count >= limit) return deny(bucket.resetAt, now);

      const count = bucket.count + 1;
      try {
        await kv.put(kvKey, JSON.stringify({ count, resetAt: bucket.resetAt }), {
          expirationTtl: ttlSeconds(bucket.resetAt - now),
        });
      } catch (error) {
        console.error('Rate limiter could not record a hit:', error);
      }
      return allow(limit - count);
    },
  };
}

/**
 * Per-isolate fallback used in local development and in tests, and on any
 * deployment without a `RATE_LIMIT_KV` binding. Counts are per Worker instance,
 * so the effective ceiling is `limit x isolate count`.
 */
export function createMemoryRateLimitStore(maxKeys = 5_000): RateLimitStore {
  const buckets = new Map<string, Bucket>();

  return {
    kind: 'memory',

    async hit(key, limit, windowMs) {
      const now = Date.now();
      const bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= now) {
        // Evict expired windows first, then the oldest remaining entries.
        // Clearing the whole map would reset every client's budget at once.
        if (buckets.size >= maxKeys) {
          for (const [storedKey, stored] of buckets) {
            if (stored.resetAt <= now) buckets.delete(storedKey);
          }
          for (const storedKey of buckets.keys()) {
            if (buckets.size < maxKeys) break;
            buckets.delete(storedKey);
          }
        }
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return allow(limit - 1);
      }

      if (bucket.count >= limit) return deny(bucket.resetAt, now);

      bucket.count += 1;
      return allow(limit - bucket.count);
    },
  };
}

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
