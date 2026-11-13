import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseBillingStore, isBillingConfigured } from '@/lib/billing/store';
import { orderCreated } from '@/test/fixtures/lemonsqueezy-webhooks';
import { normaliseBillingEvent } from '@/lib/billing/events';

const rpc = vi.fn();
vi.mock('server-only', () => ({}));

afterEach(() => vi.clearAllMocks());

const client = async () => ({ rpc }) as never;

describe('supabase billing store', () => {
  it('maps a duplicate RPC reply to duplicate without retrying', async () => {
    rpc.mockResolvedValue({ data: { applied: false, duplicate: true }, error: null });
    const store = createSupabaseBillingStore(client);
    const result = await store.applyEvent(normaliseBillingEvent(orderCreated({})));
    expect(result).toBe('duplicate');
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('throws so the route can answer 500 and let Lemon Squeezy retry when the RPC errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'connection reset' } });
    await expect(createSupabaseBillingStore(client).applyEvent(normaliseBillingEvent(orderCreated({})))).rejects.toThrow(/connection reset/);
  });

  it('reports an ignored event without calling the database', async () => {
    const store = createSupabaseBillingStore(client);
    const result = await store.applyEvent(normaliseBillingEvent({ meta: { event_name: 'license_key_created' } }));
    expect(result).toBe('ignored');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('keeps a one-time buyer purchase visible after a subscription expires', async () => {
    // A teardown purchase and a lapsed co-pilot subscription in the same account:
    // the plan must reflect the purchase that is still owned, not the lapse.
    const rows: Record<string, unknown> = {
      billing_subscriptions: { status: 'expired', ends_at: '2026-11-01T00:00:00Z', renews_at: null, occurred_at: '2026-11-01T00:00:00Z' },
      billing_orders: [{ ai_credits: 0, product_name: 'The Teardown System' }],
    };
    const query = (table: string) => {
      const builder: Record<string, unknown> = {};
      const self = () => builder;
      for (const method of ['select', 'eq', 'order', 'limit']) builder[method] = self;
      builder.maybeSingle = async () => ({ data: rows[table] ?? null, error: null });
      builder.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: Array.isArray(rows[table]) ? rows[table] : [], error: null }).then(resolve);
      return builder;
    };
    const store = createSupabaseBillingStore((async () => ({ from: query })) as never);

    const entitlement = await store.getEntitlement('10000000-0000-4000-8000-000000000001');
    expect(entitlement.status).toBe('expired');
    expect(entitlement.plan).toBe('purchases');
  });

  it('excludes test-mode rows from what a customer sees', async () => {
    const eqCalls: Array<[string, unknown]> = [];
    const query = () => {
      const builder: Record<string, unknown> = {};
      const self = () => builder;
      for (const method of ['select', 'order', 'limit']) builder[method] = self;
      builder.eq = (column: string, value: unknown) => {
        eqCalls.push([column, value]);
        return builder;
      };
      builder.maybeSingle = async () => ({ data: null, error: null });
      builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
      return builder;
    };
    const store = createSupabaseBillingStore((async () => ({ from: query })) as never);

    await store.getEntitlement('10000000-0000-4000-8000-000000000001');
    expect(eqCalls).toContainEqual(['test_mode', false]);
  });

  it('is 503-worthy until both secrets exist', () => {
    expect(isBillingConfigured({})).toBe(false);
    expect(isBillingConfigured({ LEMONSQUEEZY_WEBHOOK_SECRET: 'a' })).toBe(false);
  });
});
