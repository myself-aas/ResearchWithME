import Link from 'next/link';
import type { Metadata } from 'next';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import CheckoutButton from '@/components/billing/CheckoutButton';
import LemonSqueezyScript from '@/components/billing/LemonSqueezyScript';
import { BILLING_PRODUCTS } from '@/lib/billing/catalogue';
import { getBillingStore, type Entitlement } from '@/lib/billing/store';
import { hasPremiumAccess, type SubscriptionStatus } from '@/lib/billing/status';
import { getDashboardUser } from '@/lib/cms/auth';
import { pageMetadata } from '@/lib/seo';

/**
 * What the reader bought, in their own words.
 *
 * Outside the `(studio)` group on purpose: `app/dashboard/layout.tsx` gates the
 * studio on an editor role, and a customer is not an editor (same reason
 * `app/dashboard/access` sits here).
 *
 * The entitlement is read through the billing store rather than queried here, so
 * the page cannot accidentally run with different credentials than the webhook.
 * If billing is unconfigured the store falls back to an empty entitlement and the
 * page reads as "no purchases yet" — not an error, because for most readers that
 * is the truth.
 */
export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Your account',
    description: 'Your plan, purchases, and remaining co-pilot credits on ResearchWithMe.',
    path: '/dashboard/account',
    type: 'website',
  }),
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

const STATUS_COPY: Record<SubscriptionStatus, { label: string; note: string; alert: boolean }> = {
  none: { label: 'No plan', note: '', alert: false },
  on_trial: { label: 'Active', note: 'Your trial is running.', alert: false },
  active: { label: 'Active', note: '', alert: false },
  past_due: {
    label: 'Past due',
    note: 'Your last payment did not go through. Your access is still on while Lemon Squeezy retries the card.',
    alert: true,
  },
  unpaid: {
    label: 'Unpaid',
    note: 'Access has stopped: Lemon Squeezy stopped retrying your last payment. Updating the card in your receipt email restarts the plan.',
    alert: true,
  },
  paused: { label: 'Paused', note: 'Your subscription is paused. Access resumes when it is resumed.', alert: false },
  cancelled: {
    label: 'Ended',
    note: 'Your subscription has ended. You keep access until the period you paid for runs out.',
    alert: false,
  },
  expired: { label: 'Ended', note: 'Your subscription has ended.', alert: false },
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default async function AccountPage() {
  const user = await getDashboardUser();
  let entitlement: Entitlement = { plan: 'none', status: 'none', aiCredits: 0, currentPeriodEnd: null };
  try {
    if (user) entitlement = await (await getBillingStore()).getEntitlement(user.id);
  } catch (error) {
    console.error('Could not read the account entitlement:', error);
  }

  const status = STATUS_COPY[entitlement.status] ?? STATUS_COPY.none;
  const active = hasPremiumAccess(entitlement.status);
  const hasPurchases = entitlement.plan !== 'none' || entitlement.status !== 'none';
  const periodEnd = formatDate(entitlement.currentPeriodEnd);
  const ownedKeys = new Set(entitlement.plan === 'copilot' ? ['copilot'] : []);
  const onSale = BILLING_PRODUCTS.filter((product) => !(ownedKeys.has(product.key) && active));

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="border-b border-line pb-6">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">Your account</h1>
          <p className="mt-2 font-serif text-ink-secondary">
            Purchases appear here as soon as Lemon Squeezy confirms them, usually within a minute.
          </p>
        </header>

        <section aria-labelledby="plan-heading" className="mt-8 rounded-sm border border-line bg-surface p-6">
          <h2 id="plan-heading" className="font-serif text-xl font-bold text-ink">
            Plan
          </h2>

          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-secondary">Status</dt>
              <dd className="mt-1 font-serif text-lg text-ink">{status.label}</dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-secondary">Plan</dt>
              <dd className="mt-1 font-serif text-lg text-ink">
                {entitlement.plan === 'copilot' ? 'Research Co-Pilot' : 'None'}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                Co-pilot credits
              </dt>
              <dd className="mt-1 font-serif text-lg text-ink">{entitlement.aiCredits}</dd>
            </div>
          </dl>

          {status.note ? (
            <p
              role={status.alert ? 'alert' : undefined}
              className={`mt-4 font-serif leading-relaxed ${status.alert ? 'text-destructive' : 'text-ink-secondary'}`}
            >
              {status.note}
            </p>
          ) : null}

          {periodEnd ? (
            <p className="mt-3 font-serif text-ink-secondary">
              {active ? 'Renews' : 'Access until'} {periodEnd}.
            </p>
          ) : null}
        </section>

        <section aria-labelledby="purchases-heading" className="mt-8">
          <h2 id="purchases-heading" className="font-serif text-xl font-bold text-ink">
            Purchases
          </h2>
          {hasPurchases ? (
            <p className="mt-2 font-serif leading-relaxed text-ink-secondary">
              Receipts are emailed by Lemon Squeezy, the merchant of record. If a receipt is missing, check the
              address you paid with — it is not necessarily the address on this account.
            </p>
          ) : (
            <p className="mt-2 font-serif leading-relaxed text-ink-secondary">No purchases yet.</p>
          )}
        </section>

        <section aria-labelledby="buy-heading" className="mt-8">
          <h2 id="buy-heading" className="font-serif text-xl font-bold text-ink">
            {onSale.length === BILLING_PRODUCTS.length ? 'Available' : 'Also available'}
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {onSale.map((product) => (
              <li key={product.key} className="rounded-sm border border-line bg-surface p-5">
                <p className="font-serif text-lg font-bold text-ink">{product.name}</p>
                <p className="mt-1 font-sans text-sm uppercase tracking-wider text-ink-secondary">{product.priceLabel}</p>
                <div className="mt-4">
                  <CheckoutButton
                    product={product.key}
                    label={product.mode === 'subscription' ? 'Subscribe' : 'Buy'}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-serif leading-relaxed text-ink-secondary">
            Reading stays free whether or not anything appears on this page.{' '}
            <Link href="/pricing" className="underline">
              See all three products
            </Link>
            .
          </p>
        </section>

        <LemonSqueezyScript />
      </main>
      <BlogFooter />
    </div>
  );
}
