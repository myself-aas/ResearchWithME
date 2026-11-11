import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, TEST_ORIGIN, createFakeKv } from '@/test/support/pages';
import {
  createRequestContext,
  rateLimit,
  resetSharedRateLimitStoreForTesting,
  type AppEnv,
} from '@/cloudflare-pages/src/server/context';
import { applyHeaders } from '@/cloudflare-pages/src/server/headers';
import { handleRequest } from '@/cloudflare-pages/src/server/dispatch';
import { cloneResponseHeaders } from '@/cloudflare-pages/src/server/cookies';
import type { KvNamespaceLike } from '@/lib/rate-limit-core';

const minimalEnv = (overrides: AppEnv = {}): AppEnv => ({ ...overrides });

beforeEach(() => {
  resetSharedRateLimitStoreForTesting();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('request-scoped context', () => {
  it('selects a fresh binding and enforces its limit', async () => {
    const app = createTestApp();
    const ctx = app.context('anonymous');

    expect((await rateLimit(ctx, 'assistant:client', 1, 60_000)).allowed).toBe(true);
    expect((await rateLimit(ctx, 'assistant:client', 1, 60_000)).allowed).toBe(false);
  });

  it('rate-limits against distinct KV bindings independently', async () => {
    const first = createFakeKv();
    const second = createFakeKv();

    const ctxA = createRequestContext(
      new Request(`${TEST_ORIGIN}/`),
      minimalEnv({ RATE_LIMIT_KV: first.kv }),
      'pages',
    );
    const ctxB = createRequestContext(
      new Request(`${TEST_ORIGIN}/`),
      minimalEnv({ RATE_LIMIT_KV: second.kv }),
      'pages',
    );

    expect(ctxA.rateLimitStore.kind).toBe('kv');
    expect((await rateLimit(ctxA, 'assistant:client', 1, 60_000)).allowed).toBe(true);
    // A different binding must not see or write the first binding's window.
    expect((await rateLimit(ctxB, 'assistant:client', 1, 60_000)).allowed).toBe(true);
    expect((await rateLimit(ctxA, 'assistant:client', 1, 60_000)).allowed).toBe(false);
    expect([...first.store.keys()]).toContain('rl:assistant:client');
    expect([...second.store.keys()]).toContain('rl:assistant:client');
    expect([...first.store.keys()]).toEqual([...second.store.keys()]);
  });

  it('fails open when the KV binding throws', async () => {
    const errors: unknown[] = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args);
    });
    const broken: KvNamespaceLike = {
      async get() {
        throw new Error('kv read failed');
      },
      async put() {
        throw new Error('kv write failed');
      },
    };
    const ctx = createRequestContext(
      new Request(`${TEST_ORIGIN}/`),
      minimalEnv({ RATE_LIMIT_KV: broken }),
      'pages',
    );

    const outcome = await rateLimit(ctx, 'assistant:client', 1, 60_000);
    expect(outcome.allowed).toBe(true);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('falls back to a process-scoped memory store without a binding', async () => {
    const first = createRequestContext(new Request(`${TEST_ORIGIN}/a`), minimalEnv(), 'pages');
    const second = createRequestContext(new Request(`${TEST_ORIGIN}/b`), minimalEnv(), 'pages');

    expect(first.rateLimitStore.kind).toBe('memory');
    // The shared isolate budget applies across contexts (limit x isolate).
    expect((await rateLimit(first, 'memory:scope', 1, 60_000)).allowed).toBe(true);
    expect((await rateLimit(second, 'memory:scope', 1, 60_000)).allowed).toBe(false);
  });

  it('isolates the rate-limit store per request binding, not from an earlier one', async () => {
    const kv = createFakeKv();
    const otherKv = createFakeKv();
    const app = createTestApp({ env: { RATE_LIMIT_KV: otherKv.kv } });
    const fromOtherBinding = app.context('anonymous');

    const local = createRequestContext(
      new Request(`${TEST_ORIGIN}/`),
      minimalEnv({ RATE_LIMIT_KV: kv.kv }),
      'pages',
    );
    expect((await rateLimit(local, 'shared:scope', 1, 60_000)).allowed).toBe(true);
    expect((await rateLimit(fromOtherBinding, 'shared:scope', 1, 60_000)).allowed).toBe(true);
  });

  it('gives the fixture roles separate sessions and refreshes role cookies', async () => {
    const app = createTestApp({ expiredSessions: true });
    const reader = app.context('reader');
    const editor = app.context('editor');

    const readerUser = await reader.services.sessionClient(reader)?.auth.getUser();
    const editorUser = await editor.services.sessionClient(editor)?.auth.getUser();
    expect(readerUser?.data.user?.id).not.toBe(editorUser?.data.user?.id);

    const readerCookies = reader.cookies.getAll().map((cookie) => cookie.name);
    const editorCookies = editor.cookies.getAll().map((cookie) => cookie.name);
    expect(readerCookies).toContain('reader-refreshed-1');
    expect(readerCookies).toContain('reader-refreshed-2');
    expect(readerCookies).not.toContain('editor-refreshed-1');
    expect(editorCookies).toContain('editor-refreshed-1');
    expect(editorCookies).toContain('editor-refreshed-2');

    const readerResponse = reader.cookies.apply(new Response('ok'));
    const setCookies = readerResponse.headers.getSetCookie();
    expect(setCookies).toHaveLength(2);
    expect(readerResponse.headers.get('cache-control')).toContain('no-store');
  });

  it('flushes request cookies and supabase setAll through apply()', async () => {
    const req = new Request(`${TEST_ORIGIN}/`, { headers: { cookie: 'a=1; b=2' } });
    const jar = createRequestContext(req, minimalEnv({ RATE_LIMIT_KV: createFakeKv().kv }), 'pages');

    expect(jar.cookies.getAll()).toEqual(
      expect.arrayContaining([
        { name: 'a', value: '1' },
        { name: 'b', value: '2' },
      ]),
    );

    jar.cookies.setAll(
      [{ name: 'a', value: '3', options: { path: '/', httpOnly: true } }],
      { 'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0', Expires: '0', Pragma: 'no-cache' },
    );
    expect(jar.cookies.getAll().find((cookie) => cookie.name === 'a')?.value).toBe('3');

    const response = jar.cookies.apply(
      new Response('body', { status: 201, headers: { 'x-custom': 'kept' } }),
    );
    expect(response.status).toBe(201);
    expect(response.headers.get('x-custom')).toBe('kept');
    expect(response.headers.get('set-cookie')).toContain('a=3');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.text()).toBe('body');
  });
});

describe('handleRequest', () => {
  it('applies the security policy on the happy path', async () => {
    const app = createTestApp();
    const res = await app.request('/');

    expect(res.status).toBe(200);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('strict-transport-security')).toContain('max-age=');
    expect(res.headers.get('content-security-policy-report-only')).toContain("default-src 'self'");
    // The SSR document sets no cookies by itself; when a handler does set one,
    // applyHeaders forces a private, no-store policy (covered above in the
    // cookie-flush test).
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('applies the security policy to a 404 response', async () => {
    const app = createTestApp();
    const res = await app.request('/not-a-route');

    expect(res.status).toBe(404);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });

  it('fails closed with a 503 when an effective-production deployment is misconfigured', async () => {
    vi.stubEnv('RWM_BUILD_TARGET', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    const res = await handleRequest(
      new Request(`${TEST_ORIGIN}/`),
      { RWM_DEPLOY_ENV: 'production' },
      'pages',
    );

    expect(res.status).toBe(503);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(await res.text()).not.toContain('supabase');
  });

  it('preserves a handler-set frame option and leaves foreign cache headers alone', async () => {
    const app = createTestApp();
    vi.stubEnv('RWM_BUILD_TARGET', 'test');
    const response = new Response('ok', {
      headers: { 'x-frame-options': 'SAMEORIGIN', 'cache-control': 'public, max-age=60' },
    });
    const finalised = applyHeaders(
      response,
      app.context('anonymous'),
    );
    expect(finalised.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(finalised.headers.get('cache-control')).toBe('public, max-age=60');
  });

  it('cloneResponseHeaders preserves every set-cookie value', () => {
    const source = new Headers();
    source.append('set-cookie', 'one=1; Path=/; HttpOnly');
    source.append('set-cookie', 'two=2; Path=/; HttpOnly');
    source.set('x-other', 'kept');

    const cloned = cloneResponseHeaders(source);
    expect(cloned.getSetCookie()).toHaveLength(2);
    expect(cloned.get('x-other')).toBe('kept');
  });
});
