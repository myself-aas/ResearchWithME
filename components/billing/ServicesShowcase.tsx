import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BILLING_PRODUCTS, FREE_FOR_EVERYONE } from '@/lib/billing/catalogue';
import { Text } from '@/components/primitives';

/**
 * The paid offerings, shown where a reader already is.
 *
 * Two variants, one source (`lib/billing/catalogue.ts`):
 *
 * - `band`    — the home page: a ruled row, under a heading.
 * - `compact` — reference pages (About): the same products as a definition list.
 *
 * It names prices and links to `/pricing`; it never starts a checkout. One
 * decision per surface: here the decision is "is any of this for me", and the
 * buying happens on the page built for it.
 *
 * What is free is stated in the same breath as what is sold. That is the
 * honest order (the archive came first and stays open) and it is also why the
 * offer reads as a way to go further rather than as a toll.
 *
 * No hooks, no client directive: it renders inside the client `HomeFeed` and
 * inside server pages alike, and it is in the HTML without JavaScript.
 */

interface ServicesShowcaseProps {
  variant?: 'band' | 'compact';
  /** Heading id, so two instances never collide on one page. */
  headingId?: string;
}

export default function ServicesShowcase({ variant = 'band', headingId = 'services-heading' }: ServicesShowcaseProps) {
  if (variant === 'compact') {
    return (
      <dl className="divide-y divide-line border-y border-line">
        {BILLING_PRODUCTS.map((product) => (
          <div key={product.key} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
            <dt className="font-serif text-lg font-semibold text-ink">
              <Link href={`/pricing#product-${product.key}`} className="underline-offset-4 hover:underline">
                {product.name}
              </Link>
            </dt>
            <dd className="font-mono text-sm font-semibold text-ink sm:text-right">{product.priceLabel}</dd>
            <dd className="text-sm text-ink-secondary sm:col-span-2">{product.outcome}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <section aria-labelledby={headingId} className="border-b border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-end lg:gap-16">
          <div>
            <h2 id={headingId} className="font-serif text-3xl font-bold tracking-tight text-ink">
              Products
            </h2>
            <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-ink-secondary">
              Reading costs nothing and needs no account. When you want the method behind a teardown, or the
              working notes behind the reviews, these two are what we sell.
            </p>
          </div>
          <p className="font-sans text-sm leading-relaxed text-ink-secondary">
            <span className="font-semibold text-ink">Free for everyone: </span>
            {FREE_FOR_EVERYONE.map((item, index) => (
              <span key={item.href}>
                <Link href={item.href} className="underline underline-offset-4 hover:text-ink">
                  {item.label.toLowerCase()}
                </Link>
                {index < FREE_FOR_EVERYONE.length - 1 ? ', ' : '.'}
              </span>
            ))}
          </p>
        </div>

        <ul className="mt-8 grid gap-px overflow-hidden rounded-sm border border-line bg-line md:grid-cols-2">
          {BILLING_PRODUCTS.map((product) => (
            <li key={product.key} className="flex flex-col bg-canvas p-6">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-serif text-xl font-semibold text-ink">{product.name}</h3>
                <p className="shrink-0 font-mono text-base font-semibold text-ink">{product.priceLabel}</p>
              </div>
              <p className="mt-3 font-serif text-lg leading-snug text-ink">{product.outcome}</p>
              <p className="mt-3 flex-1 font-sans text-sm leading-relaxed text-ink-secondary">
                <span className="font-semibold text-ink">For: </span>
                {product.bestFor}
              </p>
              <Link
                href={`/pricing#product-${product.key}`}
                className="mt-5 inline-flex min-h-11 items-center gap-1.5 self-start font-sans text-sm font-semibold text-brand underline-offset-4 hover:underline"
              >
                <span>
                  See what is included<span className="sr-only"> in {product.name}</span>
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>

        <Text as="p" variant="eyebrow" color="secondary" className="mt-5">
          Payment by Lemon Squeezy · Nothing in the archive is locked behind a purchase
        </Text>
      </div>
    </section>
  );
}
