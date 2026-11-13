import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { validPostBody } from '@/test/fixtures/cms';
import { loadRoute } from './support';

type Handler = (request: NextRequest) => Promise<Response>;

let POST: Handler;

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest('https://researchwith.me/api/cms/posts', {
      method: 'POST',
      headers: { host: 'researchwith.me', 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(async () => {
  ({ POST } = await loadRoute<{ POST: Handler }>('@/app/api/cms/posts/route'));
});
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/cms/posts', () => {
  it('refuses a cross-site origin', async () => {
    const response = await post(validPostBody({ status: 'draft' }), { origin: 'https://evil.example' });
    expect(response.status).toBe(403);
  });

  it('refuses a non-JSON body', async () => {
    const response = await post('hello', { 'content-type': 'text/plain' });
    expect(response.status).toBe(415);
  });

  it('reports field errors for an empty body', async () => {
    const response = await post({});
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(typeof body.fieldErrors).toBe('object');
  });

  it('creates a draft', async () => {
    const input = validPostBody({ status: 'draft' });
    const response = await post(input);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.post.slug).toBe(input.slug);
  });

  it('refuses a duplicate slug', async () => {
    const input = validPostBody({ status: 'draft' });
    expect((await post(input)).status).toBe(201);
    expect((await post(input)).status).toBe(409);
  });
});
