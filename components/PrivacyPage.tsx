import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import SectionNavigation from '@/components/layout/SectionNavigation';

const privacySections = [
  { id: 'principles-heading', label: 'Zero-tracking open-access reading' },
  { id: 'local-storage-heading', label: 'Browser-local preferences and reading lists' },
  { id: 'accounts-heading', label: 'Optional digest subscriptions, comments, and contributor accounts' },
  { id: 'rights-heading', label: 'Data retention, open licensing, and contact' },
] as const;

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="border-b border-line pb-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">
            Reader Trust &amp; Data Governance
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-xl leading-relaxed text-ink-secondary">
            Effective November 2026 · ResearchWithMe operates without behavioural advertising, third-party tracking
            pixels, or cross-site reader profiling.
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="order-1 self-start lg:sticky lg:top-24 lg:col-start-2 lg:order-2">
            <SectionNavigation items={privacySections} ariaLabel="Privacy policy sections" />
          </div>
          <div data-layout-content="reading" className="order-2 min-w-0 max-w-[48rem] space-y-10 lg:order-1 font-sans text-base leading-relaxed text-ink">
            <section aria-labelledby="principles-heading" className="space-y-4">
              <h2 id="principles-heading" className="font-serif text-2xl font-semibold text-ink">
                1. Zero-tracking open-access reading
              </h2>
              <p className="text-ink-secondary">
                You can read every article, inspect{' '}
                <Link href="/papers" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                  archived research papers
                </Link>
                , download{' '}
                <Link href="/editions" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                  quarterly PDF editions
                </Link>
                , and export citations from the{' '}
                <Link href="/cite" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                  citation builder
                </Link>{' '}
                without registering an account. We do not load third-party ad networks, session-replay scripts, or
                fingerprinting beacons on any page of the journal.
              </p>
            </section>

            <section aria-labelledby="local-storage-heading" className="space-y-4 border-t border-line pt-8">
              <h2 id="local-storage-heading" className="font-serif text-2xl font-semibold text-ink">
                2. Browser-local preferences and reading lists
              </h2>
              <p className="text-ink-secondary">
                Reader convenience features—including your{' '}
                <Link href="/bookmarks" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                  saved reading list
                </Link>
                , light or dark archival paper theme selection, and interface language preference (English or বাংলা)—are
                stored locally in your browser via first-party <code className="font-mono text-sm">localStorage</code>{' '}
                keys and a strictly functional locale cookie (<code className="font-mono text-sm">rwm_locale</code>).
                You can clear these items at any time from your browser settings or directly inside the reading list tool.
              </p>
            </section>

            <section aria-labelledby="accounts-heading" className="space-y-4 border-t border-line pt-8">
              <h2 id="accounts-heading" className="font-serif text-2xl font-semibold text-ink">
                3. Optional digest subscriptions, comments, and contributor accounts
              </h2>
              <p className="text-ink-secondary">
                When you voluntarily subscribe to the weekly editorial digest, post a public discussion comment, or sign
                in as a contributor, we process only the minimum information required to fulfill that action:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-ink-secondary">
                <li>
                  <strong>Editorial digest:</strong> Your email address and selected column preferences, used solely to
                  deliver the digest and removable in one click.
                </li>
                <li>
                  <strong>Contributor verification:</strong> Public scholarly identifiers (ORCID iD, GitHub handle, and
                  institutional affiliation) displayed on{' '}
                  <Link href="/authors" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                    contributor and domain reviewer profiles
                  </Link>{' '}
                  to substantiate review provenance.
                </li>
                <li>
                  <strong>Abuse prevention:</strong> Short-lived, server-side rate-limit counters derived from request
                  metadata to protect public APIs and discussion threads without intrusive third-party CAPTCHA scripts.
                </li>
              </ul>
            </section>

            <section aria-labelledby="rights-heading" className="space-y-4 border-t border-line pt-8">
              <h2 id="rights-heading" className="font-serif text-2xl font-semibold text-ink">
                4. Data retention, open licensing, and contact
              </h2>
              <p className="text-ink-secondary">
                Published scholarly reviews and bibliographic metadata remain part of the permanent open-access scholarly
                record under CC BY 4.0, as detailed{' '}
                <Link href="/about" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                  about ResearchWithMe
                </Link>
                . Account holders and digest subscribers may request access, correction, or deletion of private account
                records at any time through our{' '}
                <Link href="/contact" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                  editorial contact office
                </Link>{' '}
                at{' '}
                <a href="mailto:privacy@researchwith.me" className="font-medium text-brand underline underline-offset-4">
                  privacy@researchwith.me
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
