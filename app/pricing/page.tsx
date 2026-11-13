import Link from 'next/link';
import type { Metadata } from 'next';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import CheckoutButton from '@/components/billing/CheckoutButton';
import LemonSqueezyScript from '@/components/billing/LemonSqueezyScript';
import { BILLING_PRODUCTS } from '@/lib/billing/catalogue';
import { getDashboardUser } from '@/lib/cms/auth';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Pricing',
  description:
    'Three paid products: the teardown method, the monthly research co-pilot, and manuscript editing. Reading ResearchWithMe stays free and needs no account.',
  path: '/pricing',
});

/**
 * The only page that sells anything.
 *
 * The copy has one job beyond listing prices: make it unambiguous that the
 * archive is not behind this. Every article, the citation builder, and the
 * research assistant stay free, and nothing here gates them (the plan's
 * Decision D3). Lemon Squeezy is the merchant of record, so it — not this page —
 * is what actually charges a card.
 */
export default async function PricingPage() {
  const user = await getDashboardUser();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="max-w-3xl border-b border-line pb-8">
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-brand">Support the work</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Buy a method, a membership, or an edit
          </h1>
          <p className="mt-4 font-serif text-lg leading-relaxed text-ink-secondary">
            Reading every review, using the citation builder, and asking the research assistant stay free and
            need no account. These three are the things that cost us time to make.
          </p>
        </header>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BILLING_PRODUCTS.map((product) => (
            <section
              key={product.key}
              aria-labelledby={`product-${product.key}`}
              className="flex flex-col rounded-sm border border-line bg-surface p-6"
            >
              <h2 id={`product-${product.key}`} className="font-serif text-2xl font-bold text-ink">
                {product.name}
              </h2>
              <p className="mt-2 font-sans text-sm uppercase tracking-wider text-ink-secondary">
                {product.priceLabel}
              </p>
              <p className="mt-4 flex-1 font-serif leading-relaxed text-ink-secondary">{product.summary}</p>

              <div className="mt-6">
                {user ? (
                  <CheckoutButton
                    product={product.key}
                    label={product.mode === 'subscription' ? 'Subscribe' : 'Buy'}
                  />
                ) : (
                  <Link
                    href="/login?next=/pricing"
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-sm border border-action-primary bg-action-primary px-4 font-sans text-sm font-semibold uppercase tracking-wider text-on-primary"
                  >
                    Sign in to buy
                  </Link>
                )}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-12 max-w-3xl rounded-sm border border-line bg-surface-subtle p-6">
          <h2 className="font-serif text-xl font-bold text-ink">How this works</h2>
          <ul className="mt-3 space-y-2 font-serif leading-relaxed text-ink-secondary">
            <li>Lemon Squeezy handles the payment and is the merchant of record. Your card statement names them.</li>
            <li>
              Purchases appear on your <Link href="/dashboard/account" className="underline">account page</Link> as
              soon as their webhook arrives.
            </li>
            <li>
              The teardown system is delivered by Lemon Squeezy as a download. Editing and co-pilot access are
              arranged by the editor after the purchase.
            </li>
            <li>
              Questions about a purchase go to the <Link href="/contact" className="underline">contact address</Link>
              , not to a support bot.
            </li>
          </ul>
          <p className="mt-4 font-serif leading-relaxed text-ink-secondary">
            Read more about <Link href="/about" className="underline">why the archive is open</Link>.
          </p>
        </section>

        <LemonSqueezyScript />
      </main>
      <BlogFooter />
    </div>
  );
}
