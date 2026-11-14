import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryApiKeyStore, setApiKeyStoreForTesting, type ApiKeyStore } from '@/lib/api/key-store';
import { generateApiKey, hashApiKey } from '@/lib/api/keys';
import { LedgerUnavailableError, createMemoryLedger, setLedgerForTesting, type ApiLedger } from '@/lib/api/ledger';
import { setAssistantForTesting } from '@/lib/assistant/service';
import { createMemoryRateLimitStore, setRateLimitStoreForTesting } from '@/lib/rate-limit';
import type { BlogPost } from '@/lib/blog-data';

vi.mock('server-only', () => ({}));
const catalogue = vi.fn(async (): Promise<BlogPost[]> => []);
vi.mock('@/lib/cms/catalogue', () => ({ getArticleCatalogue: () => catalogue() }));

import { POST } from '@/app/api/v1/assistant/answers/route';
import { GET as getUsage } from '@/app/api/v1/usage/route';

const URL_ = 'https://researchwith.me/api/v1/assistant/answers';
const post = {
  id: 'p1', slug: 'vllm-teardown', title: 'vLLM teardown', summary: 'Memory behaviour under load.', category: 'GitHub Repo Teardowns',
  tags: ['inference'], keyTakeaways: ['Paged attention'], author: { name: 'B. Author' },
} as unknown as BlogPost;

let keys: ApiKeyStore;
let ledger: ApiLedger;
let key = '';
let keyId = '';
let clock = new Date('2026-11-14T12:00:00Z');

const req = (body: unknown, headers: Record<string, string> = {}, bearer = key) =>
  new Request(URL_, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
const used = async () => (await ledger.usage('user-a', 100)).requestsUsed;

beforeEach(async () => {
  clock = new Date('2026-11-14T12:00:00Z');
  keys = createMemoryApiKeyStore();
  key = generateApiKey().key;
  const created = await keys.create('user-a', { name: 'test', prefix: key.slice(0, 12), keyHash: await hashApiKey(key) });
  if (created === 'LIMIT_REACHED') throw new Error('unexpected');
  keyId = created.id;
  ledger = createMemoryLedger(() => clock, (id) => (id === keyId ? 'user-a' : null));
  setApiKeyStoreForTesting(keys);
  setLedgerForTesting(ledger);
  setRateLimitStoreForTesting(createMemoryRateLimitStore());
  setAssistantForTesting(null);
  catalogue.mockResolvedValue([]);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  setApiKeyStoreForTesting(null); setLedgerForTesting(null); setRateLimitStoreForTesting(null); setAssistantForTesting(null);
  vi.unstubAllEnvs(); vi.restoreAllMocks();
});

describe('POST /api/v1/assistant/answers', () => {
  it('answers with a valid key', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const res = await POST(req({ query: 'replication' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      mode: 'CATALOG', notice: null, citations: [],
      usage: { requestsUsed: 1, requestsIncluded: 100, requestsRemaining: 99, resetsAt: '2026-12-01T00:00:00.000Z' },
    });
    expect(body.answer).toContain('No direct match in the catalog');
    expect(body.id).toMatch(/^req_[0-9a-f]{16}$/);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
  it('cites the matching articles with absolute links', async () => {
    catalogue.mockResolvedValue([post]);
    const seen: unknown[] = [];
    setAssistantForTesting(async (input) => { seen.push(input); return { answer: 'From the model', mode: 'MODEL', notice: null }; });
    const body = await (await POST(req({ query: 'vllm memory' }))).json();
    expect(body.answer).toBe('From the model');
    expect(body.mode).toBe('MODEL');
    expect(body.citations).toEqual([{
      id: 'p1', slug: 'vllm-teardown', title: 'vLLM teardown', author: 'B. Author', category: 'GitHub Repo Teardowns',
      url: 'https://researchwith.me/post/vllm-teardown',
    }]);
    expect(seen[0]).toMatchObject({ query: 'vllm memory', articles: [{ id: 'p1' }] });
  });
  it('refuses a missing key before reading the body', async () => {
    const r = new Request(URL_, { method: 'POST', body: '{not json' });
    const res = await POST(r);
    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toBe('Bearer');
    expect(await res.json()).toEqual({ error: { code: 'UNAUTHENTICATED', message: 'A valid API key is required.' } });
    expect(r.bodyUsed).toBe(false);
  });
  it('gives an unknown key and a revoked key the same answer', async () => {
    const unknown = await POST(req({ query: 'q' }, {}, generateApiKey().key));
    await keys.revoke('user-a', keyId);
    const revoked = await POST(req({ query: 'q' }));
    expect(unknown.status).toBe(401);
    expect(revoked.status).toBe(401);
    expect(await revoked.json()).toEqual(await unknown.json());
    expect(await used()).toBe(0);
  });
  it('replays without a second claim', async () => {
    const assistant = vi.fn(async () => ({ answer: 'A', mode: 'CATALOG' as const, notice: null }));
    setAssistantForTesting(assistant);
    const first = await (await POST(req({ query: 'q' }, { 'Idempotency-Key': 'abcdefgh' }))).json();
    const second = await (await POST(req({ query: 'q' }, { 'Idempotency-Key': 'abcdefgh' }))).json();
    expect(second).toEqual(first);
    expect(assistant).toHaveBeenCalledTimes(1);
    expect(await used()).toBe(1);
  });
  it('counts two requests without an idempotency key separately', async () => {
    await POST(req({ query: 'q' }));
    await POST(req({ query: 'q' }));
    expect(await used()).toBe(2);
  });
  it('rejects the same idempotency key with another body', async () => {
    await POST(req({ query: 'q' }, { 'Idempotency-Key': 'abcdefgh' }));
    const res = await POST(req({ query: 'other' }, { 'Idempotency-Key': 'abcdefgh' }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await used()).toBe(1);
  });
  it('answers 409 while the first request is still running', async () => {
    let finish: (value: { answer: string; mode: 'CATALOG'; notice: null }) => void = () => {};
    setAssistantForTesting(() => new Promise((resolve) => { finish = resolve; }));
    const first = POST(req({ query: 'q' }, { 'Idempotency-Key': 'abcdefgh' }));
    await vi.waitFor(() => expect(finish).not.toHaveLength(0));
    const second = await POST(req({ query: 'q' }, { 'Idempotency-Key': 'abcdefgh' }));
    expect(second.status).toBe(409);
    expect((await second.json()).error.code).toBe('IDEMPOTENCY_IN_FLIGHT');
    finish({ answer: 'A', mode: 'CATALOG', notice: null });
    expect((await first).status).toBe(200);
  });
  it('releases the claim when the assistant throws', async () => {
    setAssistantForTesting(async () => { throw new Error('worker unreachable'); });
    const res = await POST(req({ query: 'q' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('INTERNAL');
    expect(await used()).toBe(0);
  });
  it('releases the claim and answers 503 when the archive is unreachable', async () => {
    catalogue.mockRejectedValue(new Error('archive down'));
    const res = await POST(req({ query: 'q' }));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(await used()).toBe(0);
  });
  it('answers 503 and calls nothing when the ledger is unreachable', async () => {
    const assistant = vi.fn();
    setAssistantForTesting(assistant);
    vi.spyOn(ledger, 'claim').mockRejectedValue(new LedgerUnavailableError('connection reset'));
    const res = await POST(req({ query: 'q' }));
    expect(res.status).toBe(503);
    expect(assistant).not.toHaveBeenCalled();
  });
  it('answers 503, not 401, when the key store is unreachable', async () => {
    vi.spyOn(keys, 'lookup').mockRejectedValue(new Error('connection reset'));
    expect((await POST(req({ query: 'q' }))).status).toBe(503);
  });
  it('still returns the answer when recording it fails', async () => {
    vi.spyOn(ledger, 'complete').mockRejectedValue(new LedgerUnavailableError('connection reset'));
    const res = await POST(req({ query: 'q' }));
    expect(res.status).toBe(200);
    expect(await used()).toBe(1);
  });
  it('returns QUOTA_EXHAUSTED with the reset date', async () => {
    vi.stubEnv('API_FREE_MONTHLY_REQUESTS', '1');
    expect((await POST(req({ query: 'one' }))).status).toBe(200);
    const res = await POST(req({ query: 'two' }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: {
        code: 'QUOTA_EXHAUSTED',
        message: 'The monthly allowance of 1 answers is used. It resets on 2026-12-01.',
        details: { resetsAt: '2026-12-01T00:00:00.000Z', requestsIncluded: 1 },
      },
    });
  });
  it('returns RATE_LIMITED with Retry-After and spends nothing', async () => {
    for (let i = 0; i < 30; i++) expect((await POST(req({ query: `q${i}` }))).status).toBe(200);
    const res = await POST(req({ query: 'one more' }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(body.error.details.retryAfterSeconds).toBe(Number(res.headers.get('Retry-After')));
    expect(await used()).toBe(30);
  });
  it('limits unauthenticated attempts per address', async () => {
    const attempt = () => POST(new Request(URL_, { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.9' } }));
    for (let i = 0; i < 60; i++) expect((await attempt()).status).toBe(401);
    const res = await attempt();
    expect(res.status).toBe(429);
    expect((await res.json()).error.code).toBe('RATE_LIMITED');
  });
  it.each([
    ['{}', 400], [JSON.stringify({ query: '' }), 400], [JSON.stringify({ query: 'x'.repeat(601) }), 400],
    [JSON.stringify({ query: 7 }), 400], ['{not json', 400], ['[]', 400], [JSON.stringify({ query: 'x', pad: 'y'.repeat(9000) }), 400],
  ])('validates %s', async (body, status) => {
    const res = await POST(req(body));
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe('INVALID_REQUEST');
    expect(await used()).toBe(0);
  });
  it('requires JSON', async () => {
    const res = await POST(req({ query: 'q' }, { 'content-type': 'text/plain' }));
    expect(res.status).toBe(415);
    expect((await res.json()).error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });
  it.each([['short'], ['has space in it'], ['x'.repeat(129)]])('rejects the idempotency key %s', async (value) => {
    const res = await POST(req({ query: 'q' }, { 'Idempotency-Key': value }));
    expect(res.status).toBe(400);
    expect(await used()).toBe(0);
  });
  it('logs one line per request and never the key', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await POST(req({ query: 'q' }));
    const lines = log.mock.calls.map((call) => String(call[0]));
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({ event: 'api.answer', keyId, mode: 'CATALOG', status: 200 });
    expect(lines[0]).not.toContain(key);
  });
});

describe('GET /api/v1/usage', () => {
  const get = (bearer = key) => getUsage(new Request('https://researchwith.me/api/v1/usage', { headers: bearer ? { authorization: `Bearer ${bearer}` } : {} }));
  it('reports the plan and the count', async () => {
    await POST(req({ query: 'q' }));
    const res = await get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ plan: 'FREE', requestsUsed: 1, requestsIncluded: 100, requestsRemaining: 99, resetsAt: '2026-12-01T00:00:00.000Z' });
  });
  it('needs a key', async () => {
    expect((await get('')).status).toBe(401);
  });
  it('does not spend allowance', async () => {
    await get(); await get();
    expect(await used()).toBe(0);
  });
});
