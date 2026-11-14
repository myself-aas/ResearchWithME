/**
 * The paid offerings, as the product surface describes them.
 *
 * Prices are the spec's, verbatim (`docs/superpowers/specs/
 * 2026-11-13-financial-integration-blueprint.md` Phase 2): $19 teardown,
 * $9/month co-pilot, $150 minimum for manuscript editing. Lemon Squeezy is the
 * merchant of record, so it is also the authority on what is actually charged;
 * these labels exist so the page and the tests agree with the spec, not so the
 * application can price anything.
 *
 * Variant IDs live in the environment because they differ between a test store
 * and the live one. The server resolves them (see `lib/billing/checkout.ts`);
 * a client never sends one.
 *
 * No `server-only`: `/pricing` renders these labels, and the checkout button
 * needs the key type.
 */

export type BillingProductKey = 'teardown' | 'copilot' | 'editing';

export interface BillingProduct {
  key: BillingProductKey;
  name: string;
  summary: string;
  /** Rendered verbatim. Not a computed price: Lemon Squeezy charges. */
  priceLabel: string;
  mode: 'payment' | 'subscription';
  /** Pay-what-you-want floor, in cents. Only the editing service has one. */
  minPriceCents?: number;
}

export const BILLING_PRODUCTS: readonly BillingProduct[] = [
  {
    key: 'teardown',
    name: 'The Teardown System',
    summary:
      'The worked method behind a repository teardown: how the artifact is read, what gets reproduced, and how the record is written.',
    priceLabel: '$19',
    mode: 'payment',
  },
  {
    key: 'copilot',
    name: 'Research Co-Pilot',
    summary: 'The monthly membership for readers who want the assistant and the working notes as they are released.',
    priceLabel: '$9 / month',
    mode: 'subscription',
  },
  {
    key: 'editing',
    name: 'Manuscript Editing',
    summary: 'Pay what you want above the floor. A line edit and a methods read of one manuscript.',
    priceLabel: 'from $150',
    mode: 'payment',
    minPriceCents: 15000,
  },
];

const VARIANT_ENV: Record<BillingProductKey, string> = {
  teardown: 'LEMONSQUEEZY_VARIANT_TEARDOWN',
  copilot: 'LEMONSQUEEZY_VARIANT_COPILOT',
  editing: 'LEMONSQUEEZY_VARIANT_EDITING',
};

/**
 * The configured variant ID for a product, or null when the deployment has not
 * set one. Null is a first-class answer: the checkout route turns it into a 503
 * naming the missing configuration rather than forwarding a request Lemon
 * Squeezy would reject.
 */
export function variantIdFor(
  key: BillingProductKey,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const name = VARIANT_ENV[key];
  if (!name) return null;
  const value = (env[name] ?? '').trim();
  return value || null;
}

/**
 * `Object.hasOwn`, not `in`: `in` walks the prototype chain, so `'toString'`,
 * `'constructor'` and `'__proto__'` all passed this guard and reached the
 * checkout path. They failed later (no variant id, so a 503) but a guard that
 * says yes to `__proto__` is a guard that cannot be reasoned about.
 */
export function isBillingProductKey(value: unknown): value is BillingProductKey {
  return typeof value === 'string' && Object.hasOwn(VARIANT_ENV, value);
}
