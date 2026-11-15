import { afterEach, describe, expect, it, vi } from 'vitest';
import { LedgerUnavailableError, createMemoryLedger, createSupabaseLedger, monthlyIncluded, periodReset } from '@/lib/api/ledger';

vi.mock('server-only', () => ({}));
afterEach(() => vi.unstubAllEnvs());

let clock = new Date('2026-11-14T12:00:00Z');
const now = () => clock;
const fresh = () => { clock = new Date('2026-11-14T12:00:00Z'); return createMemoryLedger(now); };
const claim = (l: ReturnType<typeof createMemoryLedger>, idempotencyKey: string, requestHash = 'h', included = 2, keyId = 'k') =>
  l.claim({ keyId, idempotencyKey, requestHash, included });

describe('memory ledger', () => {
  it('counts exactly to the allowance', async () => {
    const l = fresh();
    const a = await claim(l, 'i1');
    const b = await claim(l, 'i2');
    const c = await claim(l, 'i3');
    expect(a).toMatchObject({ status: 'CLAIMED', usage: { requestsUsed: 1, requestsIncluded: 2, requestsRemaining: 1, resetsAt: '2026-12-01T00:00:00.000Z' } });
    expect(b).toMatchObject({ status: 'CLAIMED', usage: { requestsUsed: 2, requestsRemaining: 0 } });
    expect(c).toMatchObject({ status: 'QUOTA_EXHAUSTED', usage: { requestsUsed: 2, requestsRemaining: 0 } });
  });
  it('reports in-flight, then replay, then mismatch', async () => {
    const l = fresh();
    const first = await claim(l, 'i1');
    if (first.status !== 'CLAIMED') throw new Error('unexpected');
    expect(await claim(l, 'i1')).toEqual({ status: 'IN_FLIGHT' });
    await l.complete(first.requestId, 'CATALOG', { answer: 'A' });
    expect(await claim(l, 'i1')).toEqual({ status: 'REPLAY', response: { answer: 'A' } });
    expect(await claim(l, 'i1', 'other')).toEqual({ status: 'MISMATCH' });
    expect((await l.usage('k', 2)).requestsUsed).toBe(1);
  });
  it('release returns the unit', async () => {
    const l = fresh();
    const first = await claim(l, 'i1');
    if (first.status !== 'CLAIMED') throw new Error('unexpected');
    await l.release(first.requestId);
    expect((await l.usage('k', 2)).requestsUsed).toBe(0);
    expect((await claim(l, 'i1')).status).toBe('CLAIMED');
  });
  it('does not release a completed request', async () => {
    const l = fresh();
    const first = await claim(l, 'i1');
    if (first.status !== 'CLAIMED') throw new Error('unexpected');
    await l.complete(first.requestId, 'MODEL', { answer: 'A' });
    await l.release(first.requestId);
    expect((await l.usage('k', 2)).requestsUsed).toBe(1);
  });
  it('takes over a claim older than two minutes without counting again', async () => {
    const l = fresh();
    const first = await claim(l, 'i1');
    clock = new Date(clock.getTime() + 121_000);
    const again = await claim(l, 'i1');
    expect(again).toMatchObject({ status: 'CLAIMED', usage: { requestsUsed: 1 } });
    if (first.status !== 'CLAIMED' || again.status !== 'CLAIMED') throw new Error('unexpected');
    expect(again.requestId).toBe(first.requestId);
  });
  it('shares one allowance between the keys of one account', async () => {
    clock = new Date('2026-11-14T12:00:00Z');
    const l = createMemoryLedger(now, () => 'user-a');
    await claim(l, 'i1', 'h', 2, 'key-1');
    await claim(l, 'i1', 'h', 2, 'key-2');
    expect((await claim(l, 'i2', 'h', 2, 'key-1')).status).toBe('QUOTA_EXHAUSTED');
    expect((await l.usage('user-a', 2)).requestsRemaining).toBe(0);
  });
  it('starts a new count in a new month', async () => {
    const l = fresh();
    await claim(l, 'i1', 'h', 1);
    clock = new Date('2026-12-01T00:00:01Z');
    expect(await claim(l, 'i2', 'h', 1)).toMatchObject({ status: 'CLAIMED', usage: { requestsUsed: 1, resetsAt: '2027-01-01T00:00:00.000Z' } });
  });
  it('refuses everything when the allowance is zero', async () => {
    expect((await claim(fresh(), 'i1', 'h', 0)).status).toBe('QUOTA_EXHAUSTED');
  });
});

describe('supabase ledger', () => {
  const ledger = (rpc: ReturnType<typeof vi.fn>) => createSupabaseLedger(async () => ({ rpc }) as never, now);

  it('maps a claimed reply and sends the secret', async () => {
    vi.stubEnv('API_BRIDGE_SECRET', 's3cret');
    clock = new Date('2026-11-14T12:00:00Z');
    const rpc = vi.fn(async () => ({ data: { status: 'CLAIMED', requestId: 'r1', used: 3 }, error: null }));
    const out = await ledger(rpc).claim({ keyId: 'k', idempotencyKey: 'i', requestHash: 'h', included: 100 });
    expect(out).toEqual({ status: 'CLAIMED', requestId: 'r1', usage: { requestsUsed: 3, requestsIncluded: 100, requestsRemaining: 97, resetsAt: '2026-12-01T00:00:00.000Z' } });
    expect(rpc).toHaveBeenCalledWith('api_request_claim', { p_bridge_secret: 's3cret', p_key_id: 'k', p_idempotency_key: 'i', p_request_hash: 'h', p_included: 100 });
  });
  it.each([['REPLAY', { status: 'REPLAY', response: { a: 1 } }], ['IN_FLIGHT', { status: 'IN_FLIGHT' }], ['MISMATCH', { status: 'MISMATCH' }], ['UNKNOWN_KEY', { status: 'UNKNOWN_KEY' }]])('passes %s through', async (_n, data) => {
    const rpc = vi.fn(async () => ({ data, error: null }));
    expect(await ledger(rpc).claim({ keyId: 'k', idempotencyKey: 'i', requestHash: 'h', included: 1 })).toEqual(data);
  });
  it('maps an rpc error to LedgerUnavailableError', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: 'connection reset' } }));
    await expect(ledger(rpc).claim({ keyId: 'k', idempotencyKey: 'i', requestHash: 'h', included: 1 })).rejects.toBeInstanceOf(LedgerUnavailableError);
    await expect(ledger(rpc).usage('u', 1)).rejects.toBeInstanceOf(LedgerUnavailableError);
  });
  it('treats an unrecognised reply as unavailable rather than as a claim', async () => {
    const rpc = vi.fn(async () => ({ data: { status: 'SOMETHING' }, error: null }));
    await expect(ledger(rpc).claim({ keyId: 'k', idempotencyKey: 'i', requestHash: 'h', included: 1 })).rejects.toBeInstanceOf(LedgerUnavailableError);
  });
});

describe('allowance', () => {
  it('reads the allowance from the environment', () => {
    expect(monthlyIncluded({})).toBe(100);
    expect(monthlyIncluded({ API_FREE_MONTHLY_REQUESTS: '250' })).toBe(250);
    expect(monthlyIncluded({ API_FREE_MONTHLY_REQUESTS: '0' })).toBe(0);
    expect(monthlyIncluded({ API_FREE_MONTHLY_REQUESTS: '-3' })).toBe(100);
    expect(monthlyIncluded({ API_FREE_MONTHLY_REQUESTS: 'many' })).toBe(100);
  });
  it('resets on the first instant of the next UTC month', () => {
    expect(periodReset(new Date('2026-12-31T23:59:59Z'))).toBe('2027-01-01T00:00:00.000Z');
  });
});
