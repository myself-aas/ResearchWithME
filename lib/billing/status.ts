/**
 * Subscription state, and which states still entitle the customer.
 *
 * The eight values are Lemon Squeezy's own (`subscriptions.attributes.status`),
 * plus `none` for "no subscription on this account". Nothing here invent an
 * intermediate state: the store keeps the vendor's vocabulary so a support
 * conversation can point at a dashboard value.
 *
 * Access rules (the plan's Decision D2):
 *   on_trial, active  — paid for or inside a trial: yes
 *   past_due          — a renewal failed and dunning is still retrying: yes
 *   cancelled         — access runs to `ends_at`: yes
 *   paused            — already paid for the current period: yes
 *   unpaid, expired   — dunning exhausted, or the period ended: no
 *   none              — never subscribed: no
 *
 * `hasPremiumAccess` is exhaustive: adding a status without deciding its rule
 * is a type error, not a silent `false`.
 */

export type SubscriptionStatus =
  | 'none'
  | 'on_trial'
  | 'active'
  | 'paused'
  | 'past_due'
  | 'unpaid'
  | 'cancelled'
  | 'expired';

const STATUSES: readonly SubscriptionStatus[] = [
  'none',
  'on_trial',
  'active',
  'paused',
  'past_due',
  'unpaid',
  'cancelled',
  'expired',
];

export function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

export function hasPremiumAccess(status: SubscriptionStatus): boolean {
  switch (status) {
    case 'on_trial':
    case 'active':
    case 'past_due':
    case 'cancelled':
    case 'paused':
      return true;
    case 'unpaid':
    case 'expired':
    case 'none':
      return false;
  }
}

/** The one-line explanation an account page shows beside each state. */
export function subscriptionStatusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case 'on_trial':
      return 'On trial';
    case 'active':
      return 'Active';
    case 'paused':
      return 'Paused, still active';
    case 'past_due':
      return 'Payment failed, still active while we retry';
    case 'cancelled':
      return 'Cancelled, access until the period ends';
    case 'unpaid':
      return 'Payment could not be collected';
    case 'expired':
      return 'Ended';
    case 'none':
      return 'No subscription';
  }
}
