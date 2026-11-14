/**
 * The paid offerings, as the product surface describes them.
 *
 * The price is the spec's, verbatim (`docs/superpowers/specs/
 * 2026-11-13-financial-integration-blueprint.md` Phase 2): $19 teardown.
 * Lemon Squeezy is the merchant of record, so it is also the
 * authority on what is actually charged; these labels exist so the page and
 * the tests agree with the spec, not so the application can price anything.
 *
 * Only digital goods belong here. Lemon Squeezy prohibits "services of any
 * kind", newsletter advertising, donations with no product behind them, and
 * job boards, and may suspend a store that sells them
 * (https://docs.lemonsqueezy.com/help/getting-started/prohibited-products).
 * Manuscript Editing was removed on 2026-11-14 for that reason. The Research
 * Co-Pilot membership was withdrawn the same day: its payment switched nothing
 * on, which is a subscription with no product behind it. Do not add a service,
 * a sponsorship, a "support us" product, or a membership that delivers nothing
 * automatically to this list.
 *
 * No co-pilot product was ever created in the store, so there are no
 * subscribers. The subscription handling in the webhook,
 * `lib/billing/status.ts` and the account page is unused and can be removed in
 * a later cleanup.
 *
 * Variant IDs live in the environment because they differ between a test store
 * and the live one. The server resolves them (see `lib/billing/checkout.ts`);
 * a client never sends one.
 *
 * No `server-only`: `/pricing` renders these labels, and the checkout button
 * needs the key type.
 */

export type BillingProductKey = 'teardown';

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
 * - Nothing here may promise what `docs/billing.md` does not deliver. The
 *   research assistant is free for everyone and is never described as part of
 *   a purchase.
 * - A product is sold for what the buyer receives, never as a way to support
 *   the site: a payment with no product is a donation, which the payment
 *   provider prohibits.
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
 * Whether this deployment can actually sell a product: the API key, the store
 * and the product's variant are all set. The store had no products when this
 * was written, so the honest default is "not yet": surfaces that sell show a
 * note in place of a buy button until this is true, and never offer a
 * checkout that would fail. Server-side only; it reads secrets' presence.
 */
export function isPurchasable(
  key: BillingProductKey,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const set = (name: string) => (env[name] ?? '').trim() !== '';
  return set('LEMONSQUEEZY_API_KEY') && set('LEMONSQUEEZY_STORE_ID') && variantIdFor(key, env) !== null;
}

export interface FreeDownload {
  key: string;
  name: string;
  outcome: string;
  summary: string;
  includes: readonly string[];
  /** What the reader must have to use it. Said before the link, not after. */
  needs: string;
  caveat: string;
  /** A static file under `public/downloads`, built by `products/build.py`. */
  href: string;
  fileNote: string;
}

/**
 * Downloads that cost nothing. They are static files served by this site; they
 * never pass through the payment provider, need no account, and ask for no
 * email address. The files are built by `python products/build.py`, which
 * copies the free zips into `public/downloads`.
 *
 * Copy rules: these are software and templates. Nothing here is called a
 * review, an edit, or a service, and nothing promises a result with a journal.
 * A fuller, paid edition is mentioned only as "not on sale yet" until it has a
 * product in the store.
 */
export const FREE_DOWNLOADS: readonly FreeDownload[] = [
  {
    key: 'manuscript-check-free',
    name: 'Manuscript Check, free edition',
    outcome: 'Catch the mechanical slips in a manuscript before a journal does.',
    summary:
      'Three small programs that run on your own computer. They apply fixed rules to a manuscript you wrote, look up your references in public indexes, and number the comments in a set of journal reports. They write nothing for you.',
    includes: [
      'Four checks on a manuscript of any length: sections and declarations, citations against the reference list, figures and tables, abbreviations',
      'The first 60 references in a run looked up in Crossref and OpenAlex, with retraction flags',
      'Every comment in the journal reports numbered, with a tracking sheet and an empty response letter',
      'A Word letter template, a tracking spreadsheet, and a finder for the official reporting checklists',
      'No limit on how often you run it',
    ],
    needs: 'Python 3.8 or later and a terminal. Only the reference lookup uses the internet.',
    caveat:
      'It is software applying fixed rules, not an assessment of your science, and some findings will be false alarms. A fuller edition with more checks is planned and is not on sale yet.',
    href: '/downloads/manuscript-check-free-1.0.0.zip',
    fileNote: 'Zip file, about 100 kB',
  },
  {
    key: 'research-toolkit-free',
    name: 'Research Toolkit',
    outcome: 'Shorten the chores around a manuscript: tables, formatting, choosing a journal.',
    summary:
      'A table program for your own data file, Word templates for a submission, and a workbook for comparing candidate journals on criteria you set.',
    includes: [
      'APA-style tables from a CSV file: descriptive statistics, correlation matrices, and t tests',
      'Four Word templates: APA 7 manuscript, general journal submission, title page, cover letter',
      'A formatting checklist to run before you upload',
      'A journal shortlist workbook, with a guide to building the list from open sources',
    ],
    needs: 'Word and Excel, or editors that open their files. The table program needs Python 3.8 or later and a terminal.',
    caveat:
      'The table program is a free edition: ANOVA, chi-square, and regression tables are in a fuller edition that is not on sale yet. The workbook holds no journal data and recommends no journal.',
    href: '/downloads/research-toolkit-free-1.0.0.zip',
    fileNote: 'Zip file, about 190 kB',
  },
];

/**
 * `Object.hasOwn`, not `in`: `in` walks the prototype chain, so `'toString'`,
 * `'constructor'` and `'__proto__'` all passed this guard and reached the
 * checkout path. They failed later (no variant id, so a 503) but a guard that
 * says yes to `__proto__` is a guard that cannot be reasoned about.
 */
export function isBillingProductKey(value: unknown): value is BillingProductKey {
  return typeof value === 'string' && Object.hasOwn(VARIANT_ENV, value);
}
