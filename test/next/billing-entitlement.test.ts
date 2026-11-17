import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLoadedRoutes, loadRoute } from './support';

type Handler = (request: Request) => Promise<Response>;

let GET: Handler;

const getEntitlement = vi.fn();
const getDashboardUser = vi.fn();

beforeEach(async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fake.supabase.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  vi.stubEnv('LEMONSQUEEZY_WEBHOOK_SECRET', 'whsec_test');
  vi.stubEnv('BILLING_BRIDGE_SECRET', 'bridge_test_secret');

  vi.doMock('@/lib/billing/store', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/billing/store')>();
    return { ...actual, getBillingStore: async () => ({ applyEvent: vi.fn(), getEntitlement }) };
  });
  vi.doMock('@/lib/cms/auth', () => ({ getDashboardUser }));

  ({ GET } = await loadRoute<{ GET: Handler }>('@/app/api/billing/entitlement/route'));

  // loadRoute blanks the Supabase values so the file-backed CMS runs. This route
  // reads `isBillingConfigured()` per request, so re-stating them here is enough
  // to exercise the configured branch without a database.
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fake.supabase.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.doUnmock('@/lib/billing/store');
  vi.doUnmock('@/lib/cms/auth');
  vi.clearAllMocks();
  await cleanupLoadedRoutes();
});

describe('GET /api/billing/entitlement', () => {
  it('is 401 when nobody is signed in', async () => {
    getDashboardUser.mockResolvedValue(null);
    expect((await GET(new Request('https://researchwith.me/api/billing/entitlement'))).status).toBe(401);
    expect(getEntitlement).not.toHaveBeenCalled();
  });

  it('returns the entitlement uncached for a signed-in reader', async () => {
    getDashboardUser.mockResolvedValue({ id: 'user-1', email: 'reader@example.org', name: 'Reader', isEditor: false });
    getEntitlement.mockResolvedValue({ plan: 'copilot', status: 'active', aiCredits: 0, currentPeriodEnd: null });

    const res = await GET(new Request('https://researchwith.me/api/billing/entitlement'));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(await res.json()).toEqual({
      entitlement: { plan: 'copilot', status: 'active', aiCredits: 0, currentPeriodEnd: null },
    });
    expect(getEntitlement).toHaveBeenCalledWith('user-1');
  });

  it('is 500 when the store cannot be read', async () => {
    getDashboardUser.mockResolvedValue({ id: 'user-1', email: 'reader@example.org', name: 'Reader', isEditor: false });
    getEntitlement.mockRejectedValue(new Error('connection reset'));
    expect((await GET(new Request('https://researchwith.me/api/billing/entitlement'))).status).toBe(500);
  });
});
