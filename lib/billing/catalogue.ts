/**
 * The paid offerings, as the product surface describes them.
 *
 * Prices are the spec's, verbatim (`docs/superpowers/specs/
 * 2026-11-13-financial-integration-blueprint.md` Phase 2): $19 teardown and
 * $9/month co-pilot. Lemon Squeezy is the merchant of record, so it is also the
 * authority on what is actually charged; these labels exist so the page and
 * the tests agree with the spec, not so the application can price anything.
 *
 * Only digital goods belong here. Lemon Squeezy prohibits "services of any
 * kind", newsletter advertising, donations with no product behind them, and
 * job boards, and may suspend a store that sells them
 * (https://docs.lemonsqueezy.com/help/getting-started/prohibited-products).
 * Manuscript Editing was removed on 2026-11-14 for that reason; do not add a
 * service, a sponsorship, or a "support us" product to this list.
 *
 * Variant IDs live in the environment because they differ between a test store
 * and the live one. The server resolves them (see `lib/billing/checkout.ts`);
 * a client never sends one.
 *
 * No `server-only`: `/pricing` renders these labels, and the checkout button
 * needs the key type.
 */

export type BillingProductKey = 'teardown' | 'copilot';

export interface BillingProduct {
  key: BillingProductKey;
  name: string;
  /** What the buyer walks away able to do. Leads every card: people hire a product for a job. */
  outcome: string;
  summary: string;
  /** Rendered verbatim. Not a computed price: Lemon Squeezy charges. */
  priceLabel: string;
  /** How the price is charged, in a few words, so nobody has to infer it. */
  priceNote: string;
  /** What the money buys, as short claims the deployment can stand behind. */
  includes: readonly string[];
  /** Who it is for. One sentence, so a reader can rule a product in or out. */
  bestFor: string;
  /** How and when it reaches the buyer. */
  delivery: string;
  /** The honest limit of the product, said before the buyer finds it. */
  caveat: string;
  /** Verb phrase for the checkout button. */
  actionLabel: string;
  mode: 'payment' | 'subscription';
}

/**
 * Copy rules for this list, because every surface that sells reads it:
 *
 * - Nothing here may promise what `docs/billing.md` does not deliver. In
 *   particular the co-pilot grants no usage allowance today, and the research
 *   assistant is free for everyone, so membership is never described as
 *   unlocking it.
 * - A membership is sold for what the member receives, never as a way to
 *   support the site: a subscription with no product is a donation, which the
 *   payment provider prohibits.
 * - No invented numbers: no turnaround times, page counts, customer counts, or
 *   discounts. Add them here when they are real.
 */
export const BILLING_PRODUCTS: readonly BillingProduct[] = [
  {
    key: 'teardown',
    name: 'The Teardown System',
    outcome: 'Take a repository apart the way our reviewers do.',
    summary:
      'The worked method behind a repository teardown: how the artifact is read, what gets reproduced, and how the record is written.',
    priceLabel: '$19',
    priceNote: 'One payment',
    includes: [
      'How the artifact is read before anything is run',
      'What gets reproduced from it',
      'How the record is written so a reader can verify it',
      'A download you keep; there is no renewal',
    ],
    bestFor: 'Engineers and graduate researchers who have to judge code they did not write.',
    delivery: 'A file download from Lemon Squeezy, available once the payment clears.',
    caveat: 'It is a method, not software. It will not run a teardown for you.',
    actionLabel: 'Buy the system',
    mode: 'payment',
  },
  {
    key: 'copilot',
    name: 'Research Co-Pilot',
    outcome: 'Follow the work while it is still being written.',
    summary: 'The monthly membership for readers who want the assistant and the working notes as they are released.',
    priceLabel: '$9 / month',
    priceNote: 'Billed monthly, about 30 cents a day',
    includes: [
      'The working notes behind the reviews, as they are released',
      'If you stop, access runs to the end of the month you paid for',
    ],
    bestFor: 'Regular readers who want the reasoning behind a review, not only the finished piece.',
    delivery: 'The editor sets up your access by email after the first payment.',
    caveat:
      'The assistant is open to every reader with or without a membership, and notes arrive when they are written, not on a timetable.',
    actionLabel: 'Subscribe',
    mode: 'subscription',
  },
];

/**
 * What stays free. Listed beside the products on every surface that sells, so
 * the offer is always read against what the reader already has.
 */
export const FREE_FOR_EVERYONE: readonly { label: string; href: string }[] = [
  { label: 'Every review and teardown', href: '/' },
  { label: 'The research assistant', href: '/assistant' },
  { label: 'The citation builder', href: '/cite' },
  { label: 'Your reading list', href: '/bookmarks' },
];

const VARIANT_ENV: Record<BillingProductKey, string> = {
  teardown: 'LEMONSQUEEZY_VARIANT_TEARDOWN',
  copilot: 'LEMONSQUEEZY_VARIANT_COPILOT',
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
