import Link from 'next/link';
import type { Metadata } from 'next';
import ApiKeys from '@/components/account/ApiKeys';
import CheckoutButton from '@/components/billing/CheckoutButton';
import LemonSqueezyScript from '@/components/billing/LemonSqueezyScript';
import { getApiKeyStore, type ApiKeyRecord } from '@/lib/api/key-store';
import { getLedger, monthlyIncluded } from '@/lib/api/ledger';
import { BILLING_PRODUCTS, isPurchasable } from '@/lib/billing/catalogue';
import { getBillingStore, type Entitlement } from '@/lib/billing/store';
import { hasPremiumAccess, subscriptionStatusLabel, type SubscriptionStatus } from '@/lib/billing/status';
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
    description: 'Your plan and purchases on ResearchWithMe.',
    path: '/dashboard/account',
    type: 'website',
  }),
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

/**
 * The page contributes only what the shared label cannot: a sentence about what
 * happens next, and whether that sentence deserves `role="alert"`. The status
 * *wording* comes from `subscriptionStatusLabel` in `lib/billing/status.ts`, so
 * there is one vocabulary for a state rather than two that drift.
 */
const STATUS_NOTE: Partial<Record<SubscriptionStatus, { note: string; alert: boolean }>> = {
  on_trial: { note: 'Your trial is running.', alert: false },
  past_due: {
    note: 'Your last payment did not go through. Your access is still on while Lemon Squeezy retries the card.',
    alert: true,
  },
  paused: { note: 'Access resumes when the subscription is resumed.', alert: false },
  cancelled: { note: 'You keep access until the period you paid for runs out.', alert: false },
  unpaid: {
    note: 'Access has stopped: Lemon Squeezy stopped retrying your last payment. Updating the card in your receipt email restarts the plan.',
    alert: true,
  },
  expired: { note: 'Your subscription has ended.', alert: false },
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
  let entitlementAvailable = true;
  try {
    if (user) entitlement = await (await getBillingStore()).getEntitlement(user.id);
  } catch (error) {
    entitlementAvailable = false;
    console.error('Could not read the account entitlement:', error);
  }

  // Keys and usage fail independently of billing: a missing migration or an
  // unreachable ledger leaves the rest of the page intact.
  const included = monthlyIncluded();
  let apiKeys: ApiKeyRecord[] = [];
  let apiKeysAvailable = true;
  let used: number | null = null;
  if (user) {
    try {
      apiKeys = await getApiKeyStore().list(user.id);
    } catch (error) {
      apiKeysAvailable = false;
      console.error('Could not read API keys:', error instanceof Error ? error.message : error);
    }
    try {
      used = (await getLedger().usage(user.id, included)).requestsUsed;
    } catch (error) {
      console.error('Could not read API usage:', error instanceof Error ? error.message : error);
    }
  }

  const status = STATUS_NOTE[entitlement.status] ?? { note: '', alert: false };
  const statusLabel = subscriptionStatusLabel(entitlement.status);
  const active = hasPremiumAccess(entitlement.status);
  const hasOneTimePurchase = entitlement.plan === 'purchases';
  const hasPurchases = entitlement.plan !== 'none' || entitlement.status !== 'none';
  // "Plan" and "Status" would both read "None" for someone who bought a
  // teardown, so that row describes ownership instead.
  const planLabel =
    entitlement.plan === 'copilot'
      ? 'Research Co-Pilot'
      : hasOneTimePurchase
        ? 'Purchased'
        : 'None';
  const shownStatus = hasOneTimePurchase && !active ? 'One-time purchase' : statusLabel;
  const periodEnd = formatDate(entitlement.currentPeriodEnd);
  // The co-pilot is no longer sold, so nothing on sale can already be owned as
  // a subscription. Existing members still see their plan in the facts above.
  // Only what this deployment can actually sell; see `isPurchasable`.
  const onSale = BILLING_PRODUCTS.filter((product) => isPurchasable(product.key));

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">Account</h1>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-secondary">
            Plan, purchases, and API access. Reading stays free either way.
          </p>
        </div>
        <Link
          href="/pricing"
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-canvas px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          See products
        </Link>
      </header>

      {!entitlementAvailable && (
        <p role="alert" className="mt-6 border-l-2 border-destructive bg-surface px-4 py-3 text-sm text-destructive">
          We could not load your plan or purchases. Reload this page and check your receipt before buying again.{' '}
          <Link href="/pricing" className="underline">See product information</Link>.
        </p>
      )}

      {entitlementAvailable && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="plan-heading" className="card border border-line bg-surface p-5 sm:p-6">
            <h2 id="plan-heading" className="font-serif text-lg font-bold text-ink">
              Plan
            </h2>

            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">Status</dt>
                <dd className="mt-1 font-serif text-base text-ink">{shownStatus}</dd>
              </div>
              <div>
                <dt className="font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">Plan</dt>
                <dd className="mt-1 font-serif text-base text-ink">{planLabel}</dd>
              </div>
              <div>
                <dt className="font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
                  Co-pilot credits
                </dt>
                <dd className="mt-1 font-serif text-base text-ink">{entitlement.aiCredits}</dd>
              </div>
            </dl>

            {status.note && !hasOneTimePurchase ? (
              <p
                role={status.alert ? 'alert' : undefined}
                className={`mt-4 text-sm leading-relaxed ${status.alert ? 'text-destructive' : 'text-ink-secondary'}`}
              >
                {status.note}
              </p>
            ) : null}

            {periodEnd ? (
              <p className="mt-3 text-sm text-ink-secondary">
                {active ? 'Renews' : 'Access until'} {periodEnd}.
              </p>
            ) : null}
          </section>

          <section aria-labelledby="purchases-heading" className="card border border-line bg-surface p-5 sm:p-6">
            <h2 id="purchases-heading" className="font-serif text-lg font-bold text-ink">
              Purchases
            </h2>
            {hasPurchases ? (
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                Receipts are emailed by Lemon Squeezy, the merchant of record. If a receipt is missing, check the
                address you paid with — it is not necessarily the address on this account.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">No purchases yet.</p>
            )}
          </section>
        </div>
      )}

      <section aria-labelledby="api-keys-heading" className="mt-4 card border border-line bg-surface p-5 sm:p-6">
        <h2 id="api-keys-heading" className="font-serif text-lg font-bold text-ink">
          API keys
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          A key lets a script or an agent ask the Assistant, which answers only from published reviews. Use is free
          up to the monthly allowance.{' '}
          <Link href="/api-docs#assistant-api" className="underline">
            Read the API reference
          </Link>
          .
        </p>
        {!user ? (
          <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
            Keys belong to an account, and this deployment has no sign-in configured, so none can be created here.
          </p>
        ) : apiKeysAvailable ? (
          <div className="mt-4">
            <ApiKeys initialKeys={apiKeys} monthlyIncluded={included} used={used} />
          </div>
        ) : (
          <p role="alert" className="mt-4 text-sm leading-relaxed text-destructive">
            API keys could not be loaded. Reload the page; if this continues, the keys feature may not be set up on
            this deployment yet.
          </p>
        )}
      </section>

      {entitlementAvailable && (
        <section aria-labelledby="buy-heading" className="mt-4 card border border-line bg-surface p-5 sm:p-6">
          <h2 id="buy-heading" className="font-serif text-lg font-bold text-ink">
            {hasPurchases ? 'Also available' : 'Available'}
          </h2>
          {onSale.length === 0 ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
              Nothing is on sale yet. The checkout is being set up.
            </p>
          ) : null}
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {onSale.map((product) => (
              <li key={product.key} className="rounded-xl border border-line bg-canvas p-4">
                <p className="font-serif text-base font-bold text-ink">{product.name}</p>
                <p className="mt-1 font-sans text-xs uppercase tracking-wider text-ink-secondary">{product.priceLabel}</p>
                <div className="mt-3">
                  <CheckoutButton
                    product={product.key}
                    label={product.mode === 'subscription' ? 'Subscribe' : 'Buy'}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
            Reading stays free whether or not anything appears on this page.{' '}
            <Link href="/pricing" className="underline">
              See all products
            </Link>
            .
          </p>
        </section>
      )}

      <section aria-labelledby="profile-heading" id="profile" className="mt-4 card border border-line bg-surface p-5 sm:p-6">
        <h2 id="profile-heading" className="font-serif text-lg font-bold text-ink">
          Profile & identity
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Your photo and byline details appear on the public writers directory and on every article you publish.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/dashboard/access#profile"
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-canvas px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle"
          >
            Photo & writer identity
          </Link>
          <Link
            href="/settings"
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-canvas px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle"
          >
            Appearance & connected accounts
          </Link>
        </div>
      </section>

      <LemonSqueezyScript />
    </div>
  );
}
