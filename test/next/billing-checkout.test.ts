import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLoadedRoutes, loadRoute } from './support';

type Handler = (request: NextRequest) => Promise<Response>;

let POST: Handler;
// The in-memory limiter is process-wide and keyed by client IP, so each test
// gets its own address; otherwise one test's burst would spend the window the
// next one needs. A single test pins one address for every request it makes.
let clientIp = '203.0.113.1';

const createCheckout = vi.fn();
const getDashboardUser = vi.fn();

const CheckoutNotConfiguredError = class extends Error {};
const CheckoutUnavailableError = class extends Error {};

function post(body: unknown = { product: 'copilot' }, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest('https://researchwith.me/api/billing/checkout', {
      method: 'POST',
      headers: { host: 'researchwith.me', 'content-type': 'application/json', 'x-forwarded-for': clientIp, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

let testIndex = 0;

beforeEach(async () => {
  testIndex += 1;
  clientIp = `203.0.113.${testIndex}`;
  vi.resetModules();
  // Registered before the route import: loadRoute calls vi.resetModules(), and a
  // doMock after the import would never reach the module graph the route saw.
  vi.doMock('@/lib/billing/checkout', () => ({
    createCheckout,
    CheckoutNotConfiguredError,
    CheckoutUnavailableError,
  }));
  vi.doMock('@/lib/cms/auth', () => ({ getDashboardUser }));

  ({ POST } = await loadRoute<{ POST: Handler }>('@/app/api/billing/checkout/route'));
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://researchwith.me');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.doUnmock('@/lib/billing/checkout');
  vi.doUnmock('@/lib/cms/auth');
  vi.clearAllMocks();
  await cleanupLoadedRoutes();
});

describe('POST /api/billing/checkout', () => {
  it('refuses a cross-site origin', async () => {
    expect((await post({ product: 'copilot' }, { origin: 'https://evil.example' })).status).toBe(403);
  });

  it('refuses a non-JSON body', async () => {
    getDashboardUser.mockResolvedValue({ id: 'user-1', email: 'r@example.org', name: 'R', isEditor: false });
    expect((await post('hello', { 'content-type': 'text/plain' })).status).toBe(415);
  });

  it('requires a signed-in reader', async () => {
    getDashboardUser.mockResolvedValue(null);
    expect((await post()).status).toBe(401);
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it('rejects a product that is not ours before calling Lemon Squeezy', async () => {
    getDashboardUser.mockResolvedValue({ id: 'user-1', email: 'r@example.org', name: 'R', isEditor: false });
    expect((await post({ product: 'lifetime-deal' })).status).toBe(400);
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it('returns the checkout URL for a known product', async () => {
    getDashboardUser.mockResolvedValue({ id: 'user-1', email: 'r@example.org', name: 'R', isEditor: false });
    createCheckout.mockResolvedValue({ url: 'https://researchwithme.lemonsqueezy.com/checkout/buy/abc' });

    const res = await post({ product: 'copilot' });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ url: 'https://researchwithme.lemonsqueezy.com/checkout/buy/abc' });
    expect(createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        email: 'r@example.org',
        product: 'copilot',
        redirectUrl: 'https://researchwith.me/dashboard/account',
      }),
    );
  });

  it('answers 503, not 502, when the deployment cannot make a checkout', async () => {
    getDashboardUser.mockResolvedValue({ id: 'user-1', email: 'r@example.org', name: 'R', isEditor: false });
    createCheckout.mockRejectedValue(new CheckoutNotConfiguredError('LEMONSQUEEZY_API_KEY is not set'));
    expect((await post()).status).toBe(503);
  });

  it('answers 502 when Lemon Squeezy refuses', async () => {
    getDashboardUser.mockResolvedValue({ id: 'user-1', email: 'r@example.org', name: 'R', isEditor: false });
    createCheckout.mockRejectedValue(new CheckoutUnavailableError('Lemon Squeezy returned 422.'));
    expect((await post()).status).toBe(502);
  });

  it('rate-limits a burst to ten a minute', async () => {
    getDashboardUser.mockResolvedValue({ id: 'user-1', email: 'r@example.org', name: 'R', isEditor: false });
    createCheckout.mockResolvedValue({ url: 'https://researchwithme.lemonsqueezy.com/checkout/buy/abc' });

    const statuses: number[] = [];
    for (let index = 0; index < 11; index += 1) statuses.push((await post()).status);
    expect(statuses.slice(0, 10).every((status) => status === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
