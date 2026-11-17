import type { Metadata } from 'next';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { pageMetadata } from '@/lib/seo';
import { getClaimEvidenceLinks, getSourceById, listEvidence } from '@/lib/v34/store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Canonical Evidence Units',
  description:
    'Source-version-bound scholarly evidence units with structured locators, extraction methods, and explicit limitations.',
  path: '/evidence',
  type: 'website',
});

export default function EvidenceDirectoryPage() {
  const evidenceItems = listEvidence();
  const links = getClaimEvidenceLinks();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:pb-12"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink sm:text-4xl">
              Evidence Registry
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
              Canonical observations bound to immutable source versions and structured locators.
              Contributions reference evidence without owning or deleting it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/claims"
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-brand"
            >
              View Claims
            </Link>
            <Link
              href="/sources"
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-brand"
            >
              View Sources
            </Link>
          </div>
        </div>

        <section aria-label="Canonical evidence list" className="mt-8 space-y-4">
          {evidenceItems.map((ev) => {
            const source = getSourceById(ev.sourceId);
            const linkedClaims = links.filter((l) => l.evidenceId === ev.id);

            return (
              <article
                key={ev.id}
                className="rounded-xl border border-line bg-surface p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-ink-secondary">
                      {ev.extractionType}
                    </span>
                    <span className="rounded-full border border-line bg-surface-raised px-2.5 py-0.5 font-mono text-ink">
                      {ev.locator.kind}: {ev.locator.value}
                    </span>
                  </div>
                  <span className="font-mono text-ink-secondary">v{ev.objectVersion}</span>
                </div>

                <h2 className="font-serif text-lg font-semibold text-ink">
                  <Link href={`/evidence/${ev.id}`} className="hover:text-brand hover:underline">
                    {ev.statement}
                  </Link>
                </h2>

                {ev.quote && (
                  <blockquote className="border-l-2 border-brand/40 pl-3 text-sm italic text-ink-secondary">
                    “{ev.quote}”
                  </blockquote>
                )}

                {ev.limitation && (
                  <p className="rounded-lg bg-surface-subtle/60 px-3 py-2 text-xs text-ink-secondary">
                    <strong className="text-ink">Limitation:</strong> {ev.limitation}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-secondary">
                  <div className="flex flex-wrap gap-3">
                    <span>
                      Source:{' '}
                      <Link href={`/source/${ev.sourceId}`} className="text-brand hover:underline">
                        {source?.title ?? ev.sourceId}
                      </Link>
                    </span>
                    <span>Linked claims: {linkedClaims.length}</span>
                  </div>
                  <Link
                    href={`/evidence/${ev.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    Inspect evidence &amp; assessments →
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}
