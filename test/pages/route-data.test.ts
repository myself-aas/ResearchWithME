/**
 * Contract tests for the secure `/__data` loader transport (Task 10).
 * The transport never fetches the supplied URL; it matches the route table
 * in-process and executes the matched loader there.
 */
import { describe, expect, it } from 'vitest';
import { createTestApp } from '@/test/support/pages';
import {
  ROUTE_DATA_PATH,
  sanitizeRedirectLocation,
  serializeRouteError,
  toSerializableJson,
} from '@/cloudflare-pages/src/server/route-data';

describe('handleRouteData', () => {
  it('refuses an external loader target', async () => {
    const app = createTestApp();
    const res = await app.request('/__data?routeId=home&url=%2F%2Fevil.example');
    expect(res.status).toBe(400);
  });

  it('accepts only GET', async () => {
    const app = createTestApp();
    const res = await app.request('/__data?routeId=home&url=%2F', { method: 'POST' });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET');
  });

  it('rejects missing or unknown parameters', async () => {
    const app = createTestApp();
    expect((await app.request('/__data?url=%2F')).status).toBe(400);
    expect((await app.request('/__data?routeId=home')).status).toBe(400);
    expect((await app.request('/__data?routeId=no-such-route&url=%2F')).status).toBe(400);
  });

  it('rejects a route id that the URL does not match', async () => {
    const app = createTestApp();
    // '/' matches only the home route; papers is not matched by it.
    expect((await app.request('/__data?routeId=papers&url=%2F')).status).toBe(400);
    // Unknown paths match the catch-all, never home.
    expect((await app.request('/__data?routeId=home&url=%2Fdefinitely-missing')).status).toBe(400);
  });

  it('rejects absolute, protocol-relative and javascript URLs', async () => {
    const app = createTestApp();
    for (const bad of [
      'https%3A%2F%2Fevil.example%2F',
      'http%3A%2F%2Fevil.example%2F',
      '%2F%2Fevil.example',
      'javascript%3Aalert(1)',
      '%5C%5Cevil.example',
    ]) {
      const res = await app.request(`/__data?routeId=home&url=${bad}`);
      expect(res.status, `url=${bad}`).toBe(400);
    }
  });

  it('returns a no-store JSON envelope for a matched route without a loader', async () => {
    // The catch-all not-found route is the only route without a loader; the
    // public reader routes gained theirs in Task 11.
    const app = createTestApp();
    const res = await app.request(`${ROUTE_DATA_PATH}?routeId=not-found&url=%2Fdefinitely-missing`);

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('cache-control')).toContain('no-store');
    const envelope = await res.json();
    expect(envelope).toEqual({ kind: 'data', data: null });
  });

  it('round-trips the query string into matching', async () => {
    const app = createTestApp();
    const res = await app.request('/__data?routeId=home&url=%2F%3Fcat%3Ddata');
    expect(res.status).toBe(200);
    expect((await res.json()).kind).toBe('data');
  });
});

describe('toSerializableJson', () => {
  it('passes JSON primitives through and drops non-JSON values', () => {
    expect(toSerializableJson({ a: 1, b: 'x', c: true, d: null })).toEqual({ a: 1, b: 'x', c: true, d: null });
    // Non-JSON-representable values collapse to null rather than throwing,
    // so a hostile loader can never crash the hydration embed.
    expect(toSerializableJson({ f: undefined, g: () => 1, h: Symbol('s') })).toEqual({
      g: null,
      h: null,
    });
    expect(toSerializableJson(Number.NaN)).toBeNull();
    expect(toSerializableJson(Infinity)).toBeNull();
  });

  it('breaks reference cycles instead of recursing forever', () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    expect(toSerializableJson(cyclic)).toEqual({ a: 1, self: null });
  });
});

describe('serializeRouteError', () => {
  it('keeps the status and payload of a thrown Response-shaped error', () => {
    // query() converts thrown Responses into error results; emulate the shape
    // the transport actually sees.
    const parts = serializeRouteError({ status: 404, statusText: '', internal: false, data: 'post not found' });
    expect(parts.status).toBe(404);
    expect(parts.statusText).toBe('Not Found');
    expect(parts.internal).toBe(false);
    expect(parts.data).toBe('post not found');
    // A raw Response keeps its status but cannot be read synchronously:
    // the payload collapses to a generic message.
    const raw = serializeRouteError(new Response('post not found', { status: 404 }));
    expect(raw.status).toBe(404);
    expect(raw.data).toEqual({ message: 'Not Found' });
  });

  it('collapses unexpected Errors to a generic 500 without leaking internals', () => {
    const parts = serializeRouteError(new Error('db password hunter2'));
    expect(parts.status).toBe(500);
    expect(JSON.stringify(parts)).not.toContain('hunter2');
  });

  it('clamps non-error statuses onto the 5xx range', () => {
    expect(serializeRouteError({ status: 200, statusText: 'OK', internal: false, data: 'x' }).status).toBe(500);
    expect(serializeRouteError({ status: 418, statusText: '', internal: false, data: null }).status).toBe(418);
  });
});

describe('sanitizeRedirectLocation', () => {
  it('allows same-origin paths and http(s) URLs', () => {
    expect(sanitizeRedirectLocation('/login')).toBe('/login');
    expect(sanitizeRedirectLocation('/login?next=%2Fwrite')).toBe('/login?next=%2Fwrite');
    expect(sanitizeRedirectLocation('https://researchwith.me/auth')).toBe('https://researchwith.me/auth');
  });

  it('rejects protocol-relative, javascript:, data: and control characters', () => {
    expect(sanitizeRedirectLocation('//evil.example')).toBeNull();
    expect(sanitizeRedirectLocation('javascript:alert(1)')).toBeNull();
    expect(sanitizeRedirectLocation('data:text/html,<script>')).toBeNull();
    expect(sanitizeRedirectLocation('/ok\r\nset-cookie: a=b')).toBeNull();
    expect(sanitizeRedirectLocation('')).toBeNull();
  });
});
