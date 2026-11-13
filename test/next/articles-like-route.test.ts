import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { cleanupLoadedRoutes, loadRoute } from './support';

type Patch = (request: NextRequest, props: { params: Promise<{ id: string }> }) => Promise<Response>;

let PATCH: Patch;
let rl: typeof import('@/lib/rate-limit');

function like(id: string, headers: Record<string, string> = {}) {
  return PATCH(
    new NextRequest(`https://researchwith.me/api/articles/${id}`, {
      method: 'PATCH',
      headers: { host: 'researchwith.me', ...headers },
    }),
    { params: Promise.resolve({ id }) },
  );
}

beforeEach(async () => {
  ({ PATCH } = await loadRoute<{ PATCH: Patch }>('@/app/api/articles/[id]/route'));
  // Must come after loadRoute: vi.resetModules() gives the route its own rate-limit module.
  rl = await import('@/lib/rate-limit');
  rl.setRateLimitStoreForTesting(rl.createMemoryRateLimitStore());
});
afterEach(async () => {
  rl.setRateLimitStoreForTesting(null);
  vi.unstubAllEnvs();
  await cleanupLoadedRoutes();
});

describe('PATCH /api/articles/[id] (like)', () => {
  it('returns 404 for an unknown article', async () => {
    expect((await like('no-such-id')).status).toBe(404);
  });

  it('limits one client to 30 likes a minute', async () => {
    const headers = { 'x-forwarded-for': '203.0.113.7' };
    for (let i = 0; i < 30; i += 1) {
      expect((await like('no-such-id', headers)).status).toBe(404);
    }
    const limited = await like('no-such-id', headers);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('Retry-After')).toBeTruthy();
  });
  it('cannot be bypassed by rotating x-forwarded-for', async () => {
    for (let i = 0; i < 30; i += 1) {
      const headers = { 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': `10.0.0.${i}` };
      expect((await like('no-such-id', headers)).status).toBe(404);
    }
    const limited = await like('no-such-id', {
      'cf-connecting-ip': '203.0.113.7',
      'x-forwarded-for': '10.0.0.30',
    });
    expect(limited.status).toBe(429);
  });
});
