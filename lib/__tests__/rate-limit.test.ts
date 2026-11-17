import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCloudflareRateLimitStore,
  createKvRateLimitStore,
  createMemoryRateLimitStore,
  clientKey,
  type KvNamespaceLike,
} from '@/lib/rate-limit';

/** In-memory stand-in for a Cloudflare KV namespace, recording every write. */
function fakeKv(options: { failReads?: boolean; failWrites?: boolean } = {}) {
  const map = new Map<string, { value: string; ttl?: number }>();
  const writes: Array<{ key: string; value: string; ttl?: number }> = [];

  const kv: KvNamespaceLike = {
    async get(key) {
      if (options.failReads) throw new Error('kv read failed');
      return map.get(key)?.value ?? null;
    },
    async put(key, value, putOptions) {
      if (options.failWrites) throw new Error('kv write failed');
      writes.push({ key, value, ttl: putOptions?.expirationTtl });
      map.set(key, { value, ttl: putOptions?.expirationTtl });
    },
  };

  return { kv, writes, map };
}

describe('KV rate limit store', () => {
  it('allows requests up to the limit and then denies', async () => {
    const { kv } = fakeKv();
    const store = createKvRateLimitStore(kv);

    const first = await store.hit('scope:1.2.3.4', 3, 60_000);
    expect(first).toEqual({ allowed: true, remaining: 2, retryAfter: 0 });

    const second = await store.hit('scope:1.2.3.4', 3, 60_000);
    expect(second.remaining).toBe(1);

    const third = await store.hit('scope:1.2.3.4', 3, 60_000);
    expect(third.remaining).toBe(0);

    const fourth = await store.hit('scope:1.2.3.4', 3, 60_000);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.retryAfter).toBeGreaterThan(0);
  });

  it('counts across store instances, which is the point of using KV', async () => {
    const { kv } = fakeKv();

    // Two separate isolates share one namespace, so the second sees the first's hits.
    expect((await createKvRateLimitStore(kv).hit('shared:ip', 2, 60_000)).allowed).toBe(true);
    expect((await createKvRateLimitStore(kv).hit('shared:ip', 2, 60_000)).allowed).toBe(true);
    expect((await createKvRateLimitStore(kv).hit('shared:ip', 2, 60_000)).allowed).toBe(false);
  });

  it('keeps separate counters per key', async () => {
    const { kv } = fakeKv();
    const store = createKvRateLimitStore(kv);

    await store.hit('a:ip', 1, 60_000);
    expect((await store.hit('a:ip', 1, 60_000)).allowed).toBe(false);
    expect((await store.hit('b:ip', 1, 60_000)).allowed).toBe(true);
  });

  it('namespaces keys so they cannot collide with the cache prefixes', async () => {
    const { kv, writes } = fakeKv();
    await createKvRateLimitStore(kv).hit('cms:create:1.2.3.4', 5, 60_000);
    expect(writes[0].key).toBe('rl:cms:create:1.2.3.4');
  });

  it('sets an expiration so windows expire without a sweeper', async () => {
    const { kv, writes } = fakeKv();
    await createKvRateLimitStore(kv).hit('scope:ip', 5, 120_000);
    expect(writes[0].ttl).toBe(120);
  });

  it('never asks KV for a TTL below its 60 second minimum', async () => {
    const { kv, writes } = fakeKv();
    await createKvRateLimitStore(kv).hit('scope:ip', 5, 5_000);
    expect(writes[0].ttl).toBe(60);
  });

  it('opens a fresh window once the previous one has expired', async () => {
    const { kv, map } = fakeKv();
    const store = createKvRateLimitStore(kv);

    await store.hit('scope:ip', 1, 60_000);
    expect((await store.hit('scope:ip', 1, 60_000)).allowed).toBe(false);

    // Roll the stored window into the past.
    const stored = JSON.parse(map.get('rl:scope:ip')!.value);
    map.set('rl:scope:ip', { value: JSON.stringify({ ...stored, resetAt: Date.now() - 1 }) });

    const after = await store.hit('scope:ip', 1, 60_000);
    expect(after).toEqual({ allowed: true, remaining: 0, retryAfter: 0 });
  });

  it('fails open when KV cannot be read', async () => {
    const { kv } = fakeKv({ failReads: true });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const outcome = await createKvRateLimitStore(kv).hit('scope:ip', 5, 60_000);
    expect(outcome.allowed).toBe(true);
    expect(error).toHaveBeenCalled();

    error.mockRestore();
  });

  it('still enforces the limit when KV cannot be written', async () => {
    const { kv } = fakeKv({ failWrites: true });
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = createKvRateLimitStore(kv);

    // Reads still work, so a stored counter is honoured even though this write failed.
    await store.hit('scope:ip', 1, 60_000);
    const outcome = await store.hit('scope:ip', 1, 60_000);
    expect(outcome.allowed).toBe(true); // no counter persisted, so nothing to deny against
    expect(error).toHaveBeenCalled();

    error.mockRestore();
  });

  it('treats an unreadable stored value as an empty window', async () => {
    const { kv, map } = fakeKv();
    map.set('rl:scope:ip', { value: 'not json' });
    const outcome = await createKvRateLimitStore(kv).hit('scope:ip', 2, 60_000);
    expect(outcome).toEqual({ allowed: true, remaining: 1, retryAfter: 0 });
  });
});

describe('memory rate limit store', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('allows up to the limit within one window', async () => {
    const store = createMemoryRateLimitStore();
    expect((await store.hit('scope:ip', 2, 60_000)).allowed).toBe(true);
    expect((await store.hit('scope:ip', 2, 60_000)).allowed).toBe(true);

    const denied = await store.hit('scope:ip', 2, 60_000);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });

  it('isolates counters per store, which is why it is only a fallback', async () => {
    expect((await createMemoryRateLimitStore().hit('scope:ip', 1, 60_000)).allowed).toBe(true);
    expect((await createMemoryRateLimitStore().hit('scope:ip', 1, 60_000)).allowed).toBe(true);
  });

  it('evicts the oldest key instead of clearing every client at once', async () => {
    const store = createMemoryRateLimitStore(3);

    await store.hit('a:ip', 5, 60_000);
    await store.hit('b:ip', 5, 60_000);
    await store.hit('c:ip', 5, 60_000);
    // Re-hitting an existing key does not move it in the insertion order.
    await store.hit('b:ip', 5, 60_000);
    expect((await store.hit('b:ip', 5, 60_000)).remaining).toBe(2); // three hits used

    // At capacity, so the next new key evicts the oldest insertion: 'a'.
    await store.hit('d:ip', 5, 60_000);

    // 'c' was not evicted, so its window and budget survive.
    expect((await store.hit('c:ip', 5, 60_000)).remaining).toBe(3); // second hit
    // 'a' was evicted, so it starts a fresh window rather than staying denied.
    expect((await store.hit('a:ip', 5, 60_000)).remaining).toBe(4); // first hit
  });

  it('prefers evicting keys whose window has already expired', async () => {
    const store = createMemoryRateLimitStore(2);

    await store.hit('old:ip', 5, 1);
    await store.hit('keep:ip', 5, 60_000);
    await store.hit('keep:ip', 5, 60_000);

    // Let the short window lapse so 'old' is eligible for expiry-based eviction.
    await new Promise((resolve) => setTimeout(resolve, 5));

    await store.hit('new:ip', 5, 60_000);
    expect((await store.hit('keep:ip', 5, 60_000)).remaining).toBe(2); // budget preserved
  });
});

describe('clientKey', () => {
  const req = (headers: Record<string, string>) => new Request('https://researchwith.me/api/x', { headers });

  it('prefers cf-connecting-ip over x-forwarded-for', () => {
    const request = req({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '10.0.0.1' });
    expect(clientKey(request, 'likes')).toBe('likes:203.0.113.7');
  });

  it('falls back to the first x-forwarded-for entry', () => {
    const request = req({ 'x-forwarded-for': ' 198.51.100.1 , 10.0.0.1' });
    expect(clientKey(request, 'likes')).toBe('likes:198.51.100.1');
  });

  it('falls back to x-real-ip, then local', () => {
    expect(clientKey(req({ 'x-real-ip': '192.0.2.5' }), 'likes')).toBe('likes:192.0.2.5');
    expect(clientKey(req({}), 'likes')).toBe('likes:local');
  });

  it('truncates to 64 characters', () => {
    const key = clientKey(req({ 'cf-connecting-ip': 'a'.repeat(100) }), 'likes');
    expect(key.length).toBe('likes:'.length + 64);
  });
});

describe('Cloudflare native rate limit store (zero KV writes)', () => {
  it('allows and denies based on binding response and reports retryAfter in seconds', async () => {
    const allowedStore = createCloudflareRateLimitStore({
      limit: async () => ({ success: true }),
    });
    expect(allowedStore.kind).toBe('ratelimit');
    expect(await allowedStore.hit('likes:1.2.3.4', 10, 60_000)).toEqual({
      allowed: true,
      remaining: 9,
      retryAfter: 0,
    });

    const deniedStore = createCloudflareRateLimitStore({
      limit: async () => ({ success: false }),
    });
    expect(await deniedStore.hit('likes:1.2.3.4', 10, 60_000)).toEqual({
      allowed: false,
      remaining: 0,
      retryAfter: 60,
    });
  });

  it('fails open when the binding throws', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = createCloudflareRateLimitStore({
      limit: async () => {
        throw new Error('binding unavailable');
      },
    });
    expect(await store.hit('likes:1.2.3.4', 10, 60_000)).toEqual({
      allowed: true,
      remaining: 9,
      retryAfter: 0,
    });
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
