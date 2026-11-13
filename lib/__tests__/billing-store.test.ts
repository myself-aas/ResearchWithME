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

  it('is 503-worthy until both secrets exist', () => {
    expect(isBillingConfigured({})).toBe(false);
    expect(isBillingConfigured({ LEMONSQUEEZY_WEBHOOK_SECRET: 'a' })).toBe(false);
  });
});
