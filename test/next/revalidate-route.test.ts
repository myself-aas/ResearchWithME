import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRoute } from './support';

type Handler = (request: Request) => Promise<Response>;

let POST: Handler;

function call(headers: Record<string, string> = {}) {
  return POST(
    new Request('https://researchwith.me/api/revalidate', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: '{}',
    }),
  );
}

beforeEach(async () => {
  ({ POST } = await loadRoute<{ POST: Handler }>('@/app/api/revalidate/route'));
});
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/revalidate', () => {
  it('is 503 when no secret is configured', async () => {
    vi.stubEnv('REVALIDATE_SECRET', '');
    expect((await call()).status).toBe(503);
  });

  it('rejects a wrong secret', async () => {
    vi.stubEnv('REVALIDATE_SECRET', 's3cret');
    expect((await call({ 'x-revalidate-secret': 'wrong' })).status).toBe(401);
  });
});
