import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BURST_LIMIT, BURST_WINDOW_SECONDS, checkBurst } from '@/lib/api/burst';
import { createMemoryRateLimitStore, setRateLimitStoreForTesting } from '@/lib/rate-limit';

beforeEach(() => setRateLimitStoreForTesting(createMemoryRateLimitStore()));
afterEach(() => { setRateLimitStoreForTesting(null); vi.restoreAllMocks(); });

describe('checkBurst', () => {
  it('is 30 requests per 60 seconds', () => {
    expect([BURST_LIMIT, BURST_WINDOW_SECONDS]).toEqual([30, 60]);
  });
  it('denies when the binding denies', async () => {
    expect(await checkBurst('k1', { limit: async () => ({ success: false }) })).toEqual({ allowed: false, retryAfter: 60 });
  });
  it('allows when the binding allows', async () => {
    expect(await checkBurst('k1', { limit: async () => ({ success: true }) })).toEqual({ allowed: true, retryAfter: 0 });
  });
  it('keys the binding by key id', async () => {
    const limit = vi.fn(async () => ({ success: true }));
    await checkBurst('k1', { limit });
    expect(limit).toHaveBeenCalledWith({ key: 'k1' });
  });
  it('falls back to the store when the binding throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = { limit: async () => { throw new Error('binding down'); } };
    for (let i = 0; i < 30; i++) expect((await checkBurst('k2', broken)).allowed).toBe(true);
    const denied = await checkBurst('k2', broken);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);
  });
  it('falls back to the store when there is no binding', async () => {
    for (let i = 0; i < 30; i++) expect((await checkBurst('k3', null)).allowed).toBe(true);
    expect((await checkBurst('k3', null)).allowed).toBe(false);
    expect((await checkBurst('other-key', null)).allowed).toBe(true);
  });
});
