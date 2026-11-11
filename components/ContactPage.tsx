import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="border-b border-line pb-8">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">
            Editorial Correspondence
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Contact the Editorial Office
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-xl leading-relaxed text-ink-secondary">
            Direct channels for manuscript pitches, replication errata, institutional library indexing, and coordinated
            security disclosure.
          </p>
        </header>

        <div className="mt-10 space-y-10 font-sans text-base leading-relaxed text-ink">
          <section aria-labelledby="desks-heading" className="grid gap-6 sm:grid-cols-2">
            <h2 id="desks-heading" className="sr-only">
              Editorial desks
            </h2>

            <div className="rounded-sm border border-line bg-surface p-6">
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">
                Submissions &amp; Peer Review
              </p>
              <h3 className="mt-2 font-serif text-xl font-semibold text-ink">Editorial Desk</h3>
              <p className="mt-2 text-sm text-ink-secondary">
                Pitch technical paper reviews, benchmark replications, or repository teardowns. Include the target DOI
                or repository commit hash and your domain credentials.
              </p>
              <p className="mt-4 font-mono text-sm text-ink">
                <a href="mailto:editorial@researchwith.me" className="text-brand underline underline-offset-4">
                  editorial@researchwith.me
                </a>
              </p>
            </div>

            <div className="rounded-sm border border-line bg-surface p-6">
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">
                Errata &amp; Replications
              </p>
              <h3 className="mt-2 font-serif text-xl font-semibold text-ink">Corrections Committee</h3>
              <p className="mt-2 text-sm text-ink-secondary">
                Report factual inaccuracies, broken artifact links, citation metadata discrepancies, or conflicting
                experimental reproductions in any published review.
              </p>
              <p className="mt-4 font-mono text-sm text-ink">
                <a href="mailto:corrections@researchwith.me" className="text-brand underline underline-offset-4">
                  corrections@researchwith.me
                </a>
              </p>
            </div>

            <div className="rounded-sm border border-line bg-surface p-6">
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">
                Libraries &amp; Open Metadata
              </p>
              <h3 className="mt-2 font-serif text-xl font-semibold text-ink">Archival Indexing</h3>
              <p className="mt-2 text-sm text-ink-secondary">
                Questions regarding ISSN 2994-0821 harvesting, OpenAPI 3.1 catalog feeds, BibTeX/RIS bulk exports, or
                quarterly print-ready compendiums.
              </p>
              <p className="mt-4 font-mono text-sm text-ink">
                <a href="mailto:archive@researchwith.me" className="text-brand underline underline-offset-4">
                  archive@researchwith.me
                </a>
              </p>
            </div>

            <div className="rounded-sm border border-line bg-surface p-6">
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">
                RFC 9116 Disclosure
              </p>
              <h3 className="mt-2 font-serif text-xl font-semibold text-ink">Security &amp; Abuse</h3>
              <p className="mt-2 text-sm text-ink-secondary">
                Report platform vulnerabilities or credential-verification issues under coordinated disclosure. See our
                machine-readable{' '}
                <a href="/.well-known/security.txt" className="text-brand underline underline-offset-4">
                  security.txt policy
                </a>
                .
              </p>
              <p className="mt-4 font-mono text-sm text-ink">
                <a href="mailto:security@researchwith.me" className="text-brand underline underline-offset-4">
                  security@researchwith.me
                </a>
              </p>
            </div>
          </section>

          <section aria-labelledby="process-heading" className="space-y-4 border-t border-line pt-8">
            <h2 id="process-heading" className="font-serif text-2xl font-semibold text-ink">
              Response timelines and contributor onboarding
            </h2>
            <p className="text-ink-secondary">
              The editorial collective reviews incoming correspondence Monday through Friday (UTC). Errata affecting
              published empirical figures or bibliography records in the{' '}
              <Link href="/papers" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                paper archive
              </Link>{' '}
              are triaged within 48 hours and logged alongside our{' '}
              <Link href="/editorial-board" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                editorial board governance standards
              </Link>
              .
            </p>
            <p className="text-ink-secondary">
              Researchers and open-source maintainers who wish to join our{' '}
              <Link href="/authors" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                verified contributor roster
              </Link>{' '}
              can read more{' '}
              <Link href="/about" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                about ResearchWithMe
              </Link>{' '}
              and review how contributor records are handled in our{' '}
              <Link href="/privacy" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                privacy policy
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
