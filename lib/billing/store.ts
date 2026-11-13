import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { NormalisedBillingEvent } from './events';
import { hasPremiumAccess, isSubscriptionStatus, type SubscriptionStatus } from './status';

/**
 * The one seam between billing logic and storage.
 *
 * Two directions, and they use different credentials on purpose:
 *
 *   write — `applyEvent` calls the security-definer bridge function with the
 *           publishable key. The function checks the bridge secret itself, so
 *           there is nothing here for RLS to scope to and nothing for a caller
 *           to escalate. See supabase/migrations/20261113000300_billing.sql.
 *
 *   read  — `getEntitlement` goes through the session client, so the
 *           `auth.uid() = user_id` policies decide what comes back. A wrong
 *           user id returns nothing, not somebody else's rows.
 *
 * Keeping both behind this interface is what lets the route tests run without a
 * database, and what keeps "no service-role key" true with one place to check.
 */

export type ApplyResult = 'applied' | 'duplicate' | 'ignored';

export interface Entitlement {
  /**
   * `copilot` is a live subscription. `purchases` is a one-time product with no
   * subscription behind it — a teardown or an edit. Those are owned forever, so a
   * lapsed subscription must not erase them; before this distinction existed a
   * reader who had bought the teardown saw "No plan" and "No purchases yet".
   */
  plan: 'none' | 'copilot' | 'purchases';
  status: SubscriptionStatus;
  aiCredits: number;
  /** ISO timestamp of the current period end, when a subscription exists. */
  currentPeriodEnd: string | null;
}

export interface BillingStore {
  applyEvent(event: NormalisedBillingEvent): Promise<ApplyResult>;
  getEntitlement(userId: string): Promise<Entitlement>;
}

export class BillingUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BillingUnavailableError';
  }
}

export const EMPTY_ENTITLEMENT: Entitlement = {
  plan: 'none',
  status: 'none',
  aiCredits: 0,
  currentPeriodEnd: null,
};

/**
 * True only when this deployment can both verify a webhook and write through the
 * bridge. Anything less is a 503 that names the missing configuration, rather
 * than a 500 that looks like a bug on Lemon Squeezy's side.
 */
export function isBillingConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const webhook = (env.LEMONSQUEEZY_WEBHOOK_SECRET ?? '').trim();
  const bridge = (env.BILLING_BRIDGE_SECRET ?? '').trim();
  const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const supabaseKey = (
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ''
  ).trim();
  return Boolean(webhook && bridge && supabaseUrl && supabaseKey);
}

interface SubscriptionRow {
  status: unknown;
  ends_at: string | null;
  renews_at: string | null;
  test_mode: boolean;
  occurred_at: string;
}

interface OrderRow {
  ai_credits: unknown;
  product_name?: unknown;
  status?: unknown;
  test_mode: boolean;
}

export function createSupabaseBillingStore(
  clientFactory: () => Promise<SupabaseClient>,
): BillingStore {
  return {
    async applyEvent(event) {
      // An event this platform does not act on must cost nothing. Recording it
      // is the database's job when the payload is attributable; when it is not,
      // the route answers 200 and Lemon Squeezy stops retrying.
      if (event.kind === 'ignored') return 'ignored';

      const client = await clientFactory();
      const { data, error } = await client.rpc('apply_billing_event', {
        p_bridge_secret: (process.env.BILLING_BRIDGE_SECRET ?? '').trim(),
        p_event_id: event.eventId,
        p_event_name: event.eventName,
        p_payload: { ...event.payload, userId: event.userId },
      });

      if (error) {
        // Nothing is swallowed here: the route turns this into a 500, and
        // Lemon Squeezy retries the delivery. The event id makes the retry safe.
        throw new BillingUnavailableError(error.message);
      }

      const result = data as { applied?: boolean; duplicate?: boolean; ignored?: boolean } | null;
      if (result?.duplicate) return 'duplicate';
      if (result?.ignored) return 'ignored';
      return 'applied';
    },

    async getEntitlement(userId) {
      const client = await clientFactory();

      const [subscription, orders] = await Promise.all([
        client
          .from('billing_subscriptions')
          .select('status, ends_at, renews_at, test_mode, occurred_at')
          .eq('user_id', userId)
          .eq('test_mode', false)
          .order('occurred_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        client
          .from('billing_orders')
          .select('ai_credits, product_name, status, test_mode')
          .eq('user_id', userId)
          .eq('test_mode', false),
      ]);

      if (subscription.error) throw new BillingUnavailableError(subscription.error.message);
      if (orders.error) throw new BillingUnavailableError(orders.error.message);

      const row = (subscription.data ?? null) as SubscriptionRow | null;
      const status = isSubscriptionStatus(row?.status) ? row.status : 'none';
      const orderRows = (orders.data ?? []) as OrderRow[];

      const aiCredits = orderRows.reduce((total, order) => {
        const value = Number(order.ai_credits);
        return total + (Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0);
      }, 0);

      // A refunded or fraudulent order did not buy anything.
      const paidOrders = orderRows.filter((order) => !/refund|fraud|fail/i.test(String(order.status ?? '')));
      const subscriptionGrantsAccess = status !== 'none' && hasPremiumAccess(status);
      const plan: Entitlement['plan'] = subscriptionGrantsAccess
        ? 'copilot'
        : paidOrders.length > 0
          ? 'purchases'
          : 'none';

      return {
        plan,
        status,
        aiCredits,
        currentPeriodEnd: subscriptionGrantsAccess ? (row?.ends_at ?? row?.renews_at ?? null) : null,
      };
    },
  };
}

let store: BillingStore | null = null;

/** Test hook: pin the store so route suites can exercise chosen outcomes. */
export function setBillingStoreForTesting(next: BillingStore | null) {
  store = next;
}

export async function getBillingStore(): Promise<BillingStore> {
  if (!store) store = createSupabaseBillingStore(createSupabaseServerClient);
  return store;
}
