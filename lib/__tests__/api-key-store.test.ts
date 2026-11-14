import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryApiKeyStore, createSupabaseApiKeyStore } from '@/lib/api/key-store';

vi.mock('server-only', () => ({}));
afterEach(() => vi.unstubAllEnvs());

const input = (n: number) => ({ name: `key ${n}`, prefix: 'rwm_AAAAAAAA', keyHash: String(n).padStart(64, '0') });

describe('memory api key store', () => {
  it('a revoked key no longer resolves', async () => {
    const store = createMemoryApiKeyStore();
    const created = await store.create('user-a', input(1));
    if (created === 'LIMIT_REACHED') throw new Error('unexpected');
    expect(await store.lookup(input(1).keyHash)).toEqual({ keyId: created.id, userId: 'user-a' });
    expect(await store.revoke('user-a', created.id)).toBe(true);
    expect(await store.lookup(input(1).keyHash)).toBeNull();
    expect((await store.list('user-a'))[0].revokedAt).not.toBeNull();
  });
  it("one user cannot revoke another user's key", async () => {
    const store = createMemoryApiKeyStore();
    const created = await store.create('user-a', input(1));
    if (created === 'LIMIT_REACHED') throw new Error('unexpected');
    expect(await store.revoke('user-b', created.id)).toBe(false);
    expect(await store.lookup(input(1).keyHash)).not.toBeNull();
    expect(await store.list('user-b')).toEqual([]);
  });
  it('allows five active keys and counts only active ones', async () => {
    const store = createMemoryApiKeyStore();
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const created = await store.create('user-a', input(i));
      if (created === 'LIMIT_REACHED') throw new Error('unexpected');
      ids.push(created.id);
    }
    expect(await store.create('user-a', input(5))).toBe('LIMIT_REACHED');
    await store.revoke('user-a', ids[0]);
    expect(await store.create('user-a', input(6))).not.toBe('LIMIT_REACHED');
  });
  it('never returns the hash', async () => {
    const store = createMemoryApiKeyStore();
    await store.create('user-a', input(1));
    expect(JSON.stringify(await store.list('user-a'))).not.toContain(input(1).keyHash);
  });
});

describe('supabase api key store', () => {
  it('looks a key up through the bridge function with the secret', async () => {
    vi.stubEnv('BILLING_BRIDGE_SECRET', ' s3cret ');
    const rpc = vi.fn(async () => ({ data: { keyId: 'k1', userId: 'u1' }, error: null }));
    const store = createSupabaseApiKeyStore(async () => ({ rpc }) as never, async () => ({ rpc }) as never);
    expect(await store.lookup('abc')).toEqual({ keyId: 'k1', userId: 'u1' });
    expect(rpc).toHaveBeenCalledWith('api_key_lookup', { p_bridge_secret: 's3cret', p_key_hash: 'abc' });
  });
  it('treats a null reply as an unknown key', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    const store = createSupabaseApiKeyStore(async () => ({ rpc }) as never, async () => ({ rpc }) as never);
    expect(await store.lookup('abc')).toBeNull();
  });
  it('throws when the bridge errors, so the caller answers 503 rather than 401', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: 'connection reset' } }));
    const store = createSupabaseApiKeyStore(async () => ({ rpc }) as never, async () => ({ rpc }) as never);
    await expect(store.lookup('abc')).rejects.toThrow(/connection reset/);
  });
  it('maps the limit trigger to LIMIT_REACHED', async () => {
    const single = vi.fn(async () => ({ data: null, error: { message: 'api_key_limit', code: 'P0001' } }));
    const client = { from: () => ({ insert: () => ({ select: () => ({ single }) }) }) };
    const store = createSupabaseApiKeyStore(async () => client as never, async () => client as never);
    expect(await store.create('u1', input(1))).toBe('LIMIT_REACHED');
  });
});
