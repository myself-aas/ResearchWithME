import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KEY_PATTERN, hashApiKey } from '@/lib/api/keys';
import { createMemoryApiKeyStore, setApiKeyStoreForTesting, type ApiKeyStore } from '@/lib/api/key-store';

vi.mock('server-only', () => ({}));
const getDashboardUser = vi.fn();
vi.mock('@/lib/cms/auth', () => ({ getDashboardUser: () => getDashboardUser() }));

import { GET, POST } from '@/app/api/account/api-keys/route';
import { DELETE } from '@/app/api/account/api-keys/[keyId]/route';

const URL_ = 'http://localhost/api/account/api-keys';
const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request(URL_, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const del = (id: string) => DELETE(new Request(`${URL_}/${id}`, { method: 'DELETE' }), { params: Promise.resolve({ keyId: id }) });

let store: ApiKeyStore;
beforeEach(() => {
  store = createMemoryApiKeyStore();
  setApiKeyStoreForTesting(store);
  getDashboardUser.mockResolvedValue({ id: 'user-a', email: 'a@example.org' });
});
afterEach(() => { setApiKeyStoreForTesting(null); vi.restoreAllMocks(); });

describe('api key routes', () => {
  it('stores only the hash', async () => {
    const create = vi.spyOn(store, 'create');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await POST(post({ name: 'laptop' }));
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.key).toMatch(KEY_PATTERN);
    expect(create.mock.calls[0][0]).toBe('user-a');
    expect(create.mock.calls[0][1]).toEqual({ name: 'laptop', prefix: body.key.slice(0, 12), keyHash: await hashApiKey(body.key) });
    expect(JSON.stringify([...log.mock.calls, ...err.mock.calls])).not.toContain(body.key);
    const listed = await (await GET(new Request(URL_))).json();
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0]).toMatchObject({ id: body.id, name: 'laptop', prefix: body.prefix, revokedAt: null });
    expect(JSON.stringify(listed)).not.toContain(body.key);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
  it('refuses a sixth active key', async () => {
    for (let i = 0; i < 5; i++) expect((await POST(post({ name: `k${i}` }))).status).toBe(201);
    const res = await POST(post({ name: 'k5' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: 'INVALID_REQUEST', message: 'You can have at most 5 active keys. Revoke one first.' } });
  });
  it('returns 401 without a session', async () => {
    getDashboardUser.mockResolvedValue(null);
    for (const res of [await GET(new Request(URL_)), await POST(post({ name: 'x' })), await del('abc')]) {
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe('UNAUTHENTICATED');
    }
  });
  it('rejects a cross-origin write', async () => {
    const res = await POST(post({ name: 'x' }, { origin: 'https://evil.example' }));
    expect(res.status).toBe(400);
    expect(await store.list('user-a')).toEqual([]);
  });
  it.each([[{}], [{ name: '' }], [{ name: '   ' }], [{ name: 'x'.repeat(61) }], [{ name: 7 }]])('rejects the name in %j', async (body) => {
    expect((await POST(post(body))).status).toBe(400);
  });
  it('revokes, then answers 404 for a key that is not yours', async () => {
    const created = await (await POST(post({ name: 'laptop' }))).json();
    expect((await del(created.id)).status).toBe(204);
    expect(await store.lookup(await hashApiKey(created.key))).toBeNull();
    getDashboardUser.mockResolvedValue({ id: 'user-b' });
    const res = await del(created.id);
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('NOT_FOUND');
  });
  it('answers 503 when the store is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(store, 'list').mockRejectedValue(new Error('connection reset'));
    const res = await GET(new Request(URL_));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('UPSTREAM_UNAVAILABLE');
  });
});
