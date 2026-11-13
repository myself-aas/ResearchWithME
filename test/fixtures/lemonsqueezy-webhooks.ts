/**
 * Lemon Squeezy webhook payloads, as documented.
 *
 * Shaped from https://docs.lemonsqueezy.com/api/orders/the-order-object and
 * /api/subscriptions/the-subscription-object: a JSON:API resource under `data`,
 * the event name and checkout custom data under `meta`, and every money value
 * an integer in cents.
 *
 * Ids are fixed so assertions can name them: order 5001, subscription 9001,
 * customer 7001.
 */

const DEFAULT_USER = '10000000-0000-4000-8000-000000000001';

export interface OrderOverrides {
  userId?: string;
  variantId?: string;
  total?: number;
  status?: string;
  testMode?: boolean;
}

export function orderCreated({
  userId = DEFAULT_USER,
  variantId = '111',
  total = 1900,
  status = 'paid',
  testMode = true,
}: OrderOverrides = {}) {
  return {
    meta: {
      event_name: 'order_created',
      test_mode: testMode,
      custom_data: { user_id: userId },
    },
    data: {
      type: 'orders',
      id: '5001',
      attributes: {
        store_id: 77,
        customer_id: 7001,
        identifier: '104e18a2-d755-4d4b-80c4-a6c1dcbe1c10',
        order_number: 1,
        user_name: 'Reader Test',
        user_email: 'reader@example.org',
        currency: 'USD',
        status,
        total,
        subtotal: total,
        tax: 0,
        refunded: false,
        first_order_item: {
          id: 1,
          order_id: 5001,
          product_id: 11,
          variant_id: Number(variantId),
          product_name: 'The Teardown System',
          variant_name: 'Default',
          price: total,
          test_mode: testMode,
        },
        test_mode: testMode,
        created_at: '2026-11-13T10:00:00.000000Z',
        updated_at: '2026-11-13T10:00:00.000000Z',
      },
    },
  };
}

export interface SubscriptionOverrides {
  userId?: string;
  status?: string;
  variantId?: string;
  testMode?: boolean;
  eventName?: string;
}

export function subscriptionCreated({
  userId = DEFAULT_USER,
  status = 'active',
  variantId = '222',
  testMode = true,
  eventName = 'subscription_created',
}: SubscriptionOverrides = {}) {
  return {
    meta: {
      event_name: eventName,
      test_mode: testMode,
      custom_data: { user_id: userId },
    },
    data: {
      type: 'subscriptions',
      id: '9001',
      attributes: {
        store_id: 77,
        customer_id: 7001,
        order_id: 5001,
        order_item_id: 1,
        product_id: 22,
        variant_id: Number(variantId),
        product_name: 'Research Co-Pilot',
        variant_name: 'Monthly',
        user_name: 'Reader Test',
        user_email: 'reader@example.org',
        status,
        cancelled: status === 'cancelled',
        renews_at: '2026-12-13T10:00:00.000000Z',
        ends_at: status === 'cancelled' ? '2026-12-13T10:00:00.000000Z' : null,
        trial_ends_at: null,
        test_mode: testMode,
        created_at: '2026-11-13T10:00:00.000000Z',
        updated_at: '2026-11-13T10:00:00.000000Z',
      },
    },
  };
}

export function subscriptionUpdated(overrides: SubscriptionOverrides = {}) {
  return subscriptionCreated({ eventName: 'subscription_updated', ...overrides });
}

/** A 200 from something that is not Lemon Squeezy: a scanner, a bad proxy. */
export function notALemonPayload() {
  return { hello: 'world', items: [1, 2, 3] };
}

export const TEST_USER_ID = DEFAULT_USER;
