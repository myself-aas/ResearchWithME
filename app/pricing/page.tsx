import Link from 'next/link';
import type { Metadata } from 'next';
import { Check, Plus } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import CheckoutButton from '@/components/billing/CheckoutButton';
import LemonSqueezyScript from '@/components/billing/LemonSqueezyScript';
import { BILLING_PRODUCTS, FREE_FOR_EVERYONE } from '@/lib/billing/catalogue';
import { getDashboardUser } from '@/lib/cms/auth';
import { absoluteUrl, pageMetadata } from '@/lib/seo';
import { jsonLdScript } from '@/lib/seo/jsonld';

export const metadata: Metadata = pageMetadata({
  title: 'Services and pricing',
  description:
    'The Teardown System ($19), the Research Co-Pilot membership ($9 a month), and manuscript editing (from $150). Reading ResearchWithMe stays free and needs no account.',
  path: '/pricing',
});

/**
 * Questions a careful buyer asks before paying a site they mostly know as a
 * place to read. Each answer is something `docs/billing.md` already commits
 * to; none of them is a promise invented for this page.
 */
const QUESTIONS: readonly { question: string; answer: React.ReactNode }[] = [
  {
    question: 'Will anything I read today be locked if I do not buy?',
    answer:
      'No. Every review, the research assistant, the citation builder, and your reading list stay free and need no account. Nothing on this page changes that.',
  },
  {
    question: 'Who takes the payment?',
    answer:
      'Lemon Squeezy. They are the merchant of record: they charge the card, handle sales tax and VAT, email the receipt, and their name is what appears on your statement. This site never sees your card.',
  },
  {
    question: 'Why do I need an account to buy?',
    answer:
      'So the purchase is attached to you and shows on your account page. Reading never needs one; buying does, because otherwise there is nothing to tie a download or a membership to.',
  },
  {
    question: 'What happens if I stop the membership?',
    answer:
      'You keep access until the period you already paid for runs out, and you are not charged again. The receipt email from Lemon Squeezy carries the link to manage the subscription.',
  },
  {
    question: 'How do refunds work?',
    answer: (
      <>
        Refunds are processed by Lemon Squeezy, since they took the payment. Write to{' '}
        <a href="mailto:editor@researchwith.me" className="underline underline-offset-4">
          editor@researchwith.me
        </a>{' '}
        with your order email and a person, not a bot, will reply.
      </>
    ),
  },
  {
    question: 'How much should I pay for editing?',
    answer:
      'The floor is $150 for one manuscript and Lemon Squeezy will not accept less. Above that it is your call: pay what the edit is worth to you.',
  },
];

const STEPS: readonly { title: string; body: string }[] = [
  {
    title: 'Choose one',
    body: 'Sign in, then pick a product. The checkout opens on this page; you do not leave the site.',
  },
  {
    title: 'Pay through Lemon Squeezy',
    body: 'They charge the card and send the receipt. The price you see here is the price they charge, before any tax they are required to add.',
  },
  {
    title: 'Receive it',
    body: 'The Teardown System arrives as a download. For the co-pilot and for editing, the editor writes to you to set things up.',
  },
];

function offerCatalogueJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'ResearchWithMe services and products',
    url: absoluteUrl('/pricing'),
    itemListElement: BILLING_PRODUCTS.map((product) => ({
      '@type': 'Offer',
      name: product.name,
      description: product.summary,
      url: absoluteUrl(`/pricing#product-${product.key}`),
      priceCurrency: 'USD',
      ...(product.key === 'teardown' ? { price: '19.00' } : {}),
      ...(product.key === 'copilot'
        ? {
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: '9.00',
              priceCurrency: 'USD',
              unitCode: 'MON',
            },
          }
        : {}),
      ...(product.minPriceCents
        ? {
            priceSpecification: {
              '@type': 'PriceSpecification',
              minPrice: (product.minPriceCents / 100).toFixed(2),
              priceCurrency: 'USD',
            },
          }
        : {}),
    })),
  };
}

/**
 * The only page that sells anything.
 *
 * The copy has one job beyond listing prices: make it unambiguous that the
 * archive is not behind this. Every article, the citation builder, and the
 * research assistant stay free, and nothing here gates them (the plan's
 * Decision D3). Lemon Squeezy is the merchant of record, so it — not this page —
 * is what actually charges a card.
 *
 * The order of the page follows the order of a buyer's doubts, not the order
 * of our catalogue: what do I already have for nothing, what would I get, is
 * it for someone like me, what is the catch, who am I paying, and what happens
 * afterwards. Persuasion here is limited to things that are true — there is no
 * countdown, no "most popular" label, no struck-through price, and no number
 * of customers, because none of those would be.
 */
export default async function PricingPage() {
  const user = await getDashboardUser();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(offerCatalogueJsonLd()) }}
        />

        <header className="max-w-3xl">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            The archive is free. Three things go further.
          </h1>
          <p className="mt-4 font-serif text-lg leading-relaxed text-ink-secondary">
            A method you can apply to your own code review, a membership that follows the work as it is written,
            and an editor for your manuscript. Each is priced once, plainly, and bought separately.
          </p>
        </header>

        <section
          aria-labelledby="free-heading"
          className="mt-8 grid gap-4 border-y border-line py-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8"
        >
          <h2 id="free-heading" className="font-sans text-sm font-semibold uppercase tracking-wider text-ink">
            Already yours, free
          </h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 font-sans text-sm text-ink-secondary">
            {FREE_FOR_EVERYONE.map((item) => (
              <li key={item.href} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden="true" />
                <Link href={item.href} className="underline underline-offset-4 hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="text-ink-secondary">No account needed for any of it.</li>
          </ul>
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {BILLING_PRODUCTS.map((product) => (
            <section
              key={product.key}
              aria-labelledby={`product-${product.key}`}
              className="flex flex-col rounded-sm border border-line bg-surface p-6"
            >
              <h2
                id={`product-${product.key}`}
                className="scroll-mt-28 font-sans text-sm font-semibold uppercase tracking-wider text-ink-secondary"
              >
                {product.name}
              </h2>
              <p className="mt-3 font-serif text-2xl font-bold leading-snug text-ink">{product.outcome}</p>

              <p className="mt-5 font-serif text-4xl font-bold tracking-tight text-ink">{product.priceLabel}</p>
              <p className="mt-1 font-sans text-sm text-ink-secondary">{product.priceNote}</p>

              <p className="mt-5 font-serif leading-relaxed text-ink-secondary">{product.summary}</p>

              <ul className="mt-5 space-y-2 font-sans text-sm leading-relaxed text-ink">
                {product.includes.map((line) => (
                  <li key={line} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ink-secondary" aria-hidden="true" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <dl className="mt-6 flex-1 space-y-3 border-t border-line pt-5 font-sans text-sm leading-relaxed">
                <div>
                  <dt className="font-semibold text-ink">Who it is for</dt>
                  <dd className="text-ink-secondary">{product.bestFor}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">How you get it</dt>
                  <dd className="text-ink-secondary">{product.delivery}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Worth knowing first</dt>
                  <dd className="text-ink-secondary">{product.caveat}</dd>
                </div>
              </dl>

              <div className="mt-6">
                {user ? (
                  <CheckoutButton product={product.key} label={`${product.actionLabel} · ${product.priceLabel}`} />
                ) : (
                  <>
                    <Link
                      href="/login?next=/pricing"
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-sm border border-action-primary bg-action-primary px-4 font-sans text-sm font-semibold uppercase tracking-wider text-on-primary"
                    >
                      Sign in to buy
                    </Link>
                    <p className="mt-2 text-center font-sans text-xs text-ink-secondary">
                      The account costs nothing. It is where the purchase is kept.
                    </p>
                  </>
                )}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-6 max-w-3xl font-sans text-sm leading-relaxed text-ink-secondary">
          Not sure which, or whether any? Read a{' '}
          <Link href="/" className="underline underline-offset-4 hover:text-ink">
            published teardown
          </Link>{' '}
          or ask the{' '}
          <Link href="/assistant" className="underline underline-offset-4 hover:text-ink">
            research assistant
          </Link>{' '}
          first. Both show the standard of the work before you spend anything.
        </p>

        <section aria-labelledby="how-heading" className="mt-14 border-t border-line pt-10">
          <h2 id="how-heading" className="font-serif text-2xl font-bold text-ink">
            How buying works
          </h2>
          <ol className="mt-6 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <p className="font-mono text-sm font-semibold text-ink-secondary">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 font-serif text-xl font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 font-serif leading-relaxed text-ink-secondary">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 font-serif leading-relaxed text-ink-secondary">
            Purchases appear on your{' '}
            <Link href="/dashboard/account" className="underline underline-offset-4">
              account page
            </Link>{' '}
            as soon as Lemon Squeezy confirms them.
          </p>
        </section>

        <section aria-labelledby="questions-heading" className="mt-14 border-t border-line pt-10">
          <h2 id="questions-heading" className="font-serif text-2xl font-bold text-ink">
            Questions before you pay
          </h2>
          <div className="mt-4 max-w-3xl divide-y divide-line border-y border-line">
            {QUESTIONS.map((item) => (
              <details key={item.question} className="group py-1">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 font-serif text-lg font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <Plus
                    className="h-4 w-4 shrink-0 text-ink-secondary transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  />
                </summary>
                <p className="pb-4 font-serif leading-relaxed text-ink-secondary">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="why-heading" className="mt-14 max-w-3xl rounded-sm border border-line bg-surface-subtle p-6">
          <h2 id="why-heading" className="font-serif text-xl font-bold text-ink">
            Why we sell anything at all
          </h2>
          <p className="mt-3 font-serif leading-relaxed text-ink-secondary">
            There are no adverts, no trackers, and no article charges here. These three are the things that cost
            us time to make, and selling them helps keep the reading free for everyone else. Read more about{' '}
            <Link href="/about" className="underline underline-offset-4">
              why the archive is open
            </Link>
            , or{' '}
            <Link href="/contact" className="underline underline-offset-4">
              write to us
            </Link>{' '}
            with a question about a purchase.
          </p>
        </section>

        <LemonSqueezyScript />
      </main>
      <BlogFooter />
    </div>
  );
}
