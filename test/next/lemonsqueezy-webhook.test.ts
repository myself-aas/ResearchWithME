import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { orderCreated } from '@/test/fixtures/lemonsqueezy-webhooks';

const SECRET = 'whsec_test_0123456789abcdef';
const BODY = orderCreated({ userId: '10000000-0000-4000-8000-000000000001' });
const raw = JSON.stringify(BODY);
const sign = (body: string) => createHmac('sha256', SECRET).update(body).digest('hex');

let POST: (request: Request) => Promise<Response>;
const applyEvent = vi.fn();

function post({ body = raw, signature = sign(raw), headers = {} }: { body?: string; signature?: string | null; headers?: Record<string, string> } = {}) {
  return POST(new Request('https://researchwith.me/api/webhooks/lemonsqueezy', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-event-name': 'order_created', ...(signature === null ? {} : { 'x-signature': signature }), ...headers },
    body,
  }));
}

beforeEach(async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fake.supabase.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  vi.stubEnv('LEMONSQUEEZY_WEBHOOK_SECRET', SECRET);
  vi.stubEnv('BILLING_BRIDGE_SECRET', 'bridge_test_secret');
  vi.resetModules();
  ({ POST } = await import('@/app/api/webhooks/lemonsqueezy/route'));
  const store = await import('@/lib/billing/store');
  store.setBillingStoreForTesting({ applyEvent, getEntitlement: vi.fn() });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('POST /api/webhooks/lemonsqueezy', () => {
  it('accepts a correctly signed order', async () => {
    applyEvent.mockResolvedValue('applied');
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, outcome: 'applied' });
  });
  it('rejects a missing and a wrong signature with 401', async () => {
    expect((await post({ signature: null })).status).toBe(401);
    expect((await post({ signature: sign('other body') })).status).toBe(401);
  });
  it('is 503, not 500, when the deployment has no billing secrets', async () => {
    vi.stubEnv('LEMONSQUEEZY_WEBHOOK_SECRET', '');
    vi.resetModules();
    ({ POST } = await import('@/app/api/webhooks/lemonsqueezy/route'));
    expect((await post()).status).toBe(503);
  });
  it('acknowledges an unhandled event with 200 so Lemon Squeezy stops retrying', async () => {
    const other = JSON.stringify({ meta: { event_name: 'license_key_created' }, data: { id: '1', type: 'license-keys', attributes: {} } });
    expect((await post({ body: other, signature: sign(other) })).status).toBe(200);
  });
  it('says in the log why an event changed nothing', async () => {
    // Review Focus item 2: a checkout made outside the app has no
    // meta.custom_data.user_id. It is acknowledged (200) but nothing is written,
    // and the owner's only trail is this log line — "ignored" alone does not say
    // which of the three reasons applied.
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // The real store reaches the RPC and the RPC reports `ignored`; stand in for
    // that reply so this test is about the route's logging, not the database.
    applyEvent.mockResolvedValue('ignored');
    const noUser = JSON.stringify({ meta: { event_name: 'order_created' }, data: { id: '5', type: 'orders', attributes: { status: 'paid' } } });

    const res = await post({ body: noUser, signature: sign(noUser) });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, outcome: 'ignored' });
    const logged = spy.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(logged).toContain('missing_user_id');
    spy.mockRestore();
  });

  it('rejects an unreadable JSON body with 400', async () => {
    expect((await post({ body: 'not json', signature: sign('not json') })).status).toBe(400);
  });
  it('rejects an oversized body with 413 before hashing it', async () => {
    const huge = 'x'.repeat(1_048_577);
    expect((await post({ body: huge, signature: sign(huge) })).status).toBe(413);
  });
});
