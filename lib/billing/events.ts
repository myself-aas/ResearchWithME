/**
 * Turn a Lemon Squeezy webhook body into one normalised event.
 *
 * This module is pure and total: it takes `unknown` and never throws. The route
 * verifies the signature first, then parses the JSON, then calls this. Anything
 * that is not an event this platform acts on comes back as `kind: 'ignored'`,
 * because Lemon Squeezy retries a non-2xx response up to three times — an
 * unhandled event name should cost one row in `billing_events`, not a retry
 * storm, and a body that is not Lemon Squeezy's at all (a scanner, a mistaken
 * proxy) should cost nothing but a 200.
 *
 * The one input worth naming: `meta.custom_data.user_id`. It is set when the
 * checkout is created (see `lib/billing/checkout.ts`) and echoed back on every
 * event for that purchase. Missing, empty, or not a UUID means the purchase
 * cannot be attributed to an account — that is `missing_user_id`, recorded and
 * acknowledged, never a 500.
 */

/** The event names this platform acts on, and nothing else. */
export const HANDLED_EVENTS = [
  'order_created',
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_expired',
  'subscription_payment_failed',
  'subscription_payment_success',
  'subscription_payment_recovered',
] as const;

export type HandledEventName = (typeof HANDLED_EVENTS)[number];

const ORDER_EVENTS = new Set<string>(['order_created']);
const SUBSCRIPTION_EVENTS = new Set<string>(HANDLED_EVENTS.filter((name) => name.startsWith('subscription_')));

/** Postgres `uuid`, as it accepts it: case-insensitive hex, no version constraint. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface NormalisedBillingEvent {
  /** Lemon Squeezy's event id. The idempotency key. */
  eventId: string;
  eventName: string;
  kind: 'order' | 'subscription' | 'ignored';
  userId: string | null;
  /** The RPC payload. Keys are consumed by `public.apply_billing_event`. */
  payload: Record<string, unknown>;
}

export type IgnoredReason = 'unhandled_event' | 'missing_user_id' | 'malformed_payload';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function asInteger(value: unknown): number {
  const number = typeof value === 'number' ? value : Number.parseInt(asString(value), 10);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : 0;
}

function asUuid(value: unknown): string | null {
  const text = asString(value);
  return UUID_RE.test(text) ? text.toLowerCase() : null;
}

/**
 * The event id. Lemon Squeezy sends `meta.event_id`; the data id plus the event
 * name is a stable fallback for payloads that omit it, so two deliveries of one
 * event collapse onto one row either way.
 */
function eventIdFor(meta: Record<string, unknown>, data: Record<string, unknown>, eventName: string): string {
  const explicit = asString(meta.event_id);
  if (explicit) return explicit;
  const dataId = asString(data.id);
  return dataId ? `${eventName}:${dataId}` : `unknown:${eventName}`;
}

export function normaliseBillingEvent(body: unknown): NormalisedBillingEvent {
  const root = asRecord(body);
  const meta = asRecord(root?.meta);
  const data = asRecord(root?.data);
  const attributes = asRecord(data?.attributes);
  const custom = asRecord(meta?.custom_data);

  const eventName = asString(meta?.event_name);
  const eventId = eventIdFor(meta ?? {}, data ?? {}, eventName || 'unknown');
  const userId = asUuid(custom?.user_id);

  const isOrder = ORDER_EVENTS.has(eventName);
  const isSubscription = SUBSCRIPTION_EVENTS.has(eventName);

  if (!isOrder && !isSubscription) {
    return { eventId, eventName, kind: 'ignored', userId, payload: {} };
  }

  if (!data || !attributes) {
    return { eventId, eventName, kind: 'ignored', userId, payload: {} };
  }

  const common = {
    lemonCustomerId: asString(attributes.customer_id),
    variantId: asString(attributes.variant_id ?? asRecord(attributes.first_order_item)?.variant_id),
    productName: asString(attributes.product_name ?? asRecord(attributes.first_order_item)?.product_name),
    status: asString(attributes.status),
    testMode: attributes.test_mode === true || meta?.test_mode === true,
    // Null, not the epoch: the RPC coalesces to now() so an untimestamped event
    // is recorded when it arrived rather than being backdated to 1970.
    occurredAt: asString(attributes.created_at) || null,
  };

  if (isOrder) {
    return {
      eventId,
      eventName,
      kind: 'order',
      userId,
      payload: {
        kind: 'order',
        ...common,
        lemonOrderId: asString(data.id),
        total: asInteger(attributes.total),
        currency: asString(attributes.currency) || 'USD',
        // No product in this plan grants credits; the column exists so the
        // follow-on entitlement spec does not need a second migration.
        aiCredits: 0,
      },
    };
  }

  return {
    eventId,
    eventName,
    kind: 'subscription',
    userId,
    payload: {
      kind: 'subscription',
      ...common,
      lemonSubscriptionId: asString(data.id),
      renewsAt: asString(attributes.renews_at) || null,
      endsAt: asString(attributes.ends_at) || null,
    },
  };
}

/**
 * Why this event will not change an entitlement, or null when it will. The
 * order matters: an unknown event name is unhandled whatever its payload says.
 */
export function billingEventIgnoredReason(event: NormalisedBillingEvent): IgnoredReason | null {
  if (event.kind === 'ignored') {
    return event.payload && Object.keys(event.payload).length > 0 ? 'malformed_payload' : 'unhandled_event';
  }
  if (!event.userId) return 'missing_user_id';
  return null;
}
