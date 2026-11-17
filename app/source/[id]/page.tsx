import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, FileText, PlusCircle } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import IntegrityNotice from '@/components/scholarly/IntegrityNotice';
import SaveToLibraryButton from '@/components/v34/SaveToLibraryButton';
import { CONTRIBUTION_CATALOG } from '@/lib/v34/contracts';
import { getSourceWithDetails } from '@/lib/v34/store';
import { toScholarlyIntegrityEvent } from '@/lib/v34/scholarly-adapter';
import { formatDate } from '@/lib/formatting/locale';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const details = await getSourceWithDetails(id);
  if (!details) return { title: 'Source not found' };
  return {
    title: details.source.title,
    description: `Canonical source record, version history, extracted evidence, and scholarly reviews for ${details.source.title}.`,
  };
}

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const details = await getSourceWithDetails(id);
  if (!details) notFound();

  const { source, versions, integrityEvents, evidence, contributions } = details;
  const latestEvent = integrityEvents[0] ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-16">
        <div className="mb-4">
          <Link
            href="/feed"
            className="inline-flex min-h-11 items-center gap-1.5 font-sans text-sm text-ink-secondary hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to research feed</span>
          </Link>
        </div>

        {/* §25 Integrity banner renders BEFORE ordinary source metadata */}
        {latestEvent ? (
          <div className="mb-6">
            <IntegrityNotice
              event={toScholarlyIntegrityEvent(
                latestEvent,
                contributions.map((c) => c.id),
              )}
              affectedCount={contributions.length + evidence.length}
              publicationBlocked={latestEvent.disposition === 'publication-blocked'}
            />
          </div>
        ) : null}

        <header className="rounded-xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-ink-secondary">
            <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-semibold uppercase text-brand">
              {source.sourceType}
            </span>
            {source.identifierScheme && source.identifierValue ? (
              <span>
                {source.identifierScheme.toUpperCase()}: {source.identifierValue}
              </span>
            ) : null}
            <span>·</span>
            <span>Access: {source.accessState}</span>
            <span>·</span>
            <span>Integrity: {source.integrityStatus}</span>
          </div>

          <h1 className="mt-3 font-serif text-2xl font-semibold leading-tight text-ink sm:text-3xl">
            {source.title}
          </h1>

          <p className="mt-2 font-sans text-sm text-ink-secondary">
            {source.authors.join(', ')}
            {source.venue ? ` · ${source.venue}` : ''}
            {source.publishedDate ? ` · ${formatDate(source.publishedDate)}` : ''}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              href={`/contribute?source=${encodeURIComponent(source.id)}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 py-2 font-sans text-sm font-semibold text-on-primary hover:opacity-90"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>Review this source</span>
            </Link>
            {source.canonicalUrl ? (
              <a
                href={source.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-canvas px-4 py-2 font-sans text-sm font-medium text-ink hover:bg-surface-subtle"
              >
                <span>Open canonical source</span>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
            <SaveToLibraryButton
              itemType="source"
              itemId={source.id}
              title={source.title}
              url={`/source/${source.id}`}
            />
          </div>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-8">
            <section aria-labelledby="source-evidence-heading">
              <h2 id="source-evidence-heading" className="font-serif text-xl font-semibold text-ink">
                Extracted Evidence Units ({evidence.length})
              </h2>
              {evidence.length === 0 ? (
                <p className="mt-2 font-sans text-sm text-ink-secondary">
                  No structured evidence units extracted from this source yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {evidence.map((ev) => (
                    <li key={ev.id} className="rounded-lg border border-line bg-surface p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-brand">
                        <span className="uppercase font-semibold">{ev.extractionType}</span>
                        <span>
                          {ev.locator.kind}: {ev.locator.value}
                        </span>
                      </div>
                      <p className="mt-2 font-sans text-sm leading-relaxed text-ink">{ev.statement}</p>
                      {ev.quote ? (
                        <blockquote className="mt-2 border-l-2 border-line pl-3 font-serif text-sm italic text-ink-secondary">
                          “{ev.quote}”
                        </blockquote>
                      ) : null}
                      {ev.limitation ? (
                        <p className="mt-2 font-sans text-xs text-ink-secondary">
                          <strong>Limitation:</strong> {ev.limitation}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="source-contribs-heading">
              <h2 id="source-contribs-heading" className="font-serif text-xl font-semibold text-ink">
                Contributions Reviewing This Source ({contributions.length})
              </h2>
              {contributions.length === 0 ? (
                <p className="mt-2 font-sans text-sm text-ink-secondary">
                  Be the first to publish a paper review, replication, or critique grounded in this source.
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {contributions.map((contrib) => (
                    <li key={contrib.id} className="rounded-lg border border-line bg-surface p-4">
                      <span className="font-mono text-xs font-semibold uppercase text-brand">
                        {CONTRIBUTION_CATALOG[contrib.contributionType].label}
                      </span>
                      <h3 className="mt-1 font-serif text-lg font-semibold text-ink">
                        <Link href={`/contribution/${contrib.slug}`} className="hover:text-brand hover:underline">
                          {contrib.title}
                        </Link>
                      </h3>
                      <p className="mt-1 font-sans text-sm text-ink-secondary">{contrib.summary}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="min-w-0 space-y-4">
            <section className="rounded-lg border border-line bg-surface p-4">
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-ink-secondary">
                <FileText className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                <span>Preserved source versions</span>
              </div>
              <ul className="mt-3 space-y-2">
                {versions.map((v) => (
                  <li key={v.id} className="rounded-md border border-line bg-canvas p-2.5 font-mono text-xs">
                    <p className="font-semibold text-ink">{v.versionLabel}</p>
                    <p className="mt-0.5 text-ink-secondary">Retrieved {formatDate(v.retrievedAt)}</p>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </main>
      <BlogFooter />
    </div>
  );
}
