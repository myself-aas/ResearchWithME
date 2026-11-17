/**
 * Framework-neutral fixed-window rate limiting.
 *
 * Everything in this module is dependency-free so it can run on Cloudflare
 * Workers (via native Rate Limiting bindings or optional KV) and in Node.js
 * local development/tests (in-memory fallback).
 */

export interface RateLimitOutcome {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

/**
 * Structural view of Cloudflare's native Workers Rate Limiting binding
 * (`ratelimits` in wrangler.jsonc). Consumes zero KV writes on the Free plan.
 */
export interface CloudflareRateLimiterLike {
  limit(options: { key: string }): Promise<{ success: boolean }>;
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
  readonly kind: 'ratelimit' | 'kv' | 'memory';
  hit(key: string, limit: number, windowMs: number): Promise<RateLimitOutcome>;
}

/**
 * Native Cloudflare Workers Rate Limiting store (`APP_RATE_LIMITER`).
 * Zero KV writes and fail-open on binding errors so rate-limit transport
 * glitches never cause an outage.
 */
export function createCloudflareRateLimitStore(limiter: CloudflareRateLimiterLike): RateLimitStore {
  return {
    kind: 'ratelimit',

    async hit(key, limit, windowMs) {
      const retryAfterSeconds = Math.max(1, Math.ceil(windowMs / 1000));
      try {
        const { success } = await limiter.limit({ key });
        return success
          ? { allowed: true, remaining: Math.max(0, limit - 1), retryAfter: 0 }
          : { allowed: false, remaining: 0, retryAfter: retryAfterSeconds };
      } catch (error) {
        console.error('Native rate limiter failed; failing open:', error);
        return { allowed: true, remaining: Math.max(0, limit - 1), retryAfter: 0 };
      }
    },
  };
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
 * Best-effort client address for rate-limit keys, shared by both targets.
 * Cloudflare's edge sets `cf-connecting-ip` and strips client-supplied values,
 * so it wins over `x-forwarded-for` (which a client can rotate freely), then
 * `x-real-ip`, then 'local'.
 */
export function clientIp(request: Request): string {
  const cf = request.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf.slice(0, 64);
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded.slice(0, 64);
  return request.headers.get('x-real-ip')?.trim().slice(0, 64) || 'local';
}
