import Link from 'next/link';
import type { Metadata } from 'next';
import ApiKeys from '@/components/account/ApiKeys';
import { getApiKeyStore, type ApiKeyRecord } from '@/lib/api/key-store';
import { getLedger, monthlyIncluded } from '@/lib/api/ledger';
import { getDashboardUser } from '@/lib/cms/auth';
import { pageMetadata } from '@/lib/seo';

/** Free API access and identity settings inside the shared dashboard shell. */
export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Your account',
    description: 'Manage your free API access and profile on ResearchWithMe.',
    path: '/dashboard/account',
    type: 'website',
  }),
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getDashboardUser();
  // Key and usage failures are independent; profile settings stay available.
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

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">Account</h1>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-secondary">
            Free API access and profile settings. Reading stays open to everyone.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-canvas px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Customize settings
        </Link>
      </header>

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

      <section aria-labelledby="profile-heading" id="profile" className="mt-4 card border border-line bg-surface p-5 sm:p-6">
        <h2 id="profile-heading" className="font-serif text-lg font-bold text-ink">
          Profile & identity
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          Your photo and byline details appear on the public writers directory and on every article you publish.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/dashboard/profile"
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-canvas px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Edit name, bio & links
          </Link>
          <Link
            href="/dashboard/access#profile"
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-canvas px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Photo & writer identity
          </Link>
          <Link
            href="/settings"
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-canvas px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Appearance & connected accounts
          </Link>
        </div>
      </section>

    </div>
  );
}
