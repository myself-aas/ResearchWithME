import { describe, expect, it } from 'vitest';
import { billingEventIgnoredReason, normaliseBillingEvent } from '@/lib/billing/events';
import { notALemonPayload, orderCreated, subscriptionCreated } from '@/test/fixtures/lemonsqueezy-webhooks';

const UUID = '10000000-0000-4000-8000-000000000001';

describe('normaliseBillingEvent', () => {
  it('normalises an order into a credits payload', () => {
    const event = normaliseBillingEvent(orderCreated({ userId: UUID, variantId: '111', total: 1900 }));
    expect(event.kind).toBe('order');
    expect(event.userId).toBe(UUID);
    expect(event.payload).toMatchObject({ kind: 'order', lemonOrderId: '5001', total: 1900, currency: 'USD', aiCredits: 0 });
  });

  it('normalises a subscription and keeps its status verbatim', () => {
    const event = normaliseBillingEvent(subscriptionCreated({ userId: UUID, status: 'active' }));
    expect(event.kind).toBe('subscription');
    expect(event.payload).toMatchObject({ kind: 'subscription', lemonSubscriptionId: '9001', status: 'active' });
  });

  it('marks a non-UUID user id as unusable instead of throwing', () => {
    const event = normaliseBillingEvent(orderCreated({ userId: 'user_12345' }));
    expect(event.userId).toBeNull();
    expect(billingEventIgnoredReason(event)).toBe('missing_user_id');
  });

  it('marks an unknown event name as ignored', () => {
    const event = normaliseBillingEvent({ meta: { event_name: 'license_key_created', custom_data: { user_id: UUID } }, data: { id: '1', type: 'license-keys', attributes: {} } });
    expect(event.kind).toBe('ignored');
    expect(billingEventIgnoredReason(event)).toBe('unhandled_event');
  });

  it('does not throw on a body that is not a Lemon Squeezy payload', () => {
    const event = normaliseBillingEvent(notALemonPayload());
    expect(event.kind).toBe('ignored');
    expect(event.userId).toBeNull();
  });
});
