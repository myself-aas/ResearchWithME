import type { Metadata } from 'next';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { ResponsiveDataTable } from '@/components/v34/ResponsiveDataTable';
import { pageMetadata } from '@/lib/seo';
import { listSources, listEvidence, listSourceVersions } from '@/lib/v34/store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Canonical Sources',
  description:
    'Immutable, versioned scholarly sources with DOI/arXiv/GitHub normalization and explicit integrity provenance.',
  path: '/sources',
  type: 'website',
});

const INTEGRITY_BADGE: Record<string, string> = {
  active: 'border-line bg-surface-raised text-ink',
  corrected: 'border-brand/40 bg-brand/5 text-brand',
  'expression-of-concern': 'border-brand/50 bg-brand/10 text-ink',
  retracted: 'border-destructive/50 bg-destructive/10 text-destructive',
  withdrawn: 'border-destructive/50 bg-destructive/10 text-destructive',
};

export default async function SourcesDirectoryPage() {
  const sources = await listSources();
  const allEvidence = listEvidence();

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
              Canonical Sources
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
              Every evidence unit and claim binds to an immutable source version rather than a
              mutable link. Integrity events propagate across linked claims and contributions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/evidence"
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-brand"
            >
              Browse Evidence
            </Link>
            <Link
              href="/contribute"
              className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
            >
              Resolve &amp; Cite Source
            </Link>
          </div>
        </div>

        <section aria-label="Canonical source records" className="mt-8 grid gap-4 md:grid-cols-2">
          {sources.map((src) => {
            const versions = listSourceVersions(src.id) ?? [];
            const evCount = allEvidence.filter((e) => e.sourceId === src.id).length;
            const badgeStyle = INTEGRITY_BADGE[src.integrityStatus] ?? INTEGRITY_BADGE.active;

            return (
              <article
                key={src.id}
                className="flex flex-col justify-between rounded-xl border border-line bg-surface p-5"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-xs text-ink-secondary">
                      {src.sourceType}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeStyle}`}
                    >
                      Integrity: {src.integrityStatus}
                    </span>
                  </div>
                  <h2 className="font-serif text-lg font-semibold text-ink">
                    <Link href={`/source/${src.id}`} className="hover:text-brand hover:underline">
                      {src.title}
                    </Link>
                  </h2>
                  <p className="text-xs text-ink-secondary">
                    {src.authors.join(', ')}
                    {src.venue ? ` · ${src.venue}` : ''}
                    {src.publishedDate ? ` · ${src.publishedDate}` : ''}
                  </p>
                  <p className="text-xs text-ink-secondary">
                    Access: {src.accessState} · Language: {src.language}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-secondary">
                  <div className="flex flex-wrap gap-3 font-mono">
                    {src.identifierScheme && src.identifierValue && (
                      <span dir="ltr">
                        {src.identifierScheme.toUpperCase()}: {src.identifierValue}
                      </span>
                    )}
                    <span>{versions.length} version(s)</span>
                    <span>{evCount} evidence unit(s)</span>
                  </div>
                  <Link
                    href={`/source/${src.id}`}
                    className="font-sans font-medium text-brand hover:underline"
                  >
                    Inspect source →
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <section aria-label="Canonical source comparison table" className="mt-10 space-y-3">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">
              Structured Source Integrity Matrix
            </h2>
            <p className="text-xs text-ink-secondary">
              Desktop tabular comparison collapsing automatically into stacked record cards on
              mobile with explicit missing-value labels (Part III §27).
            </p>
          </div>
          <ResponsiveDataTable
            caption="Canonical scholarly sources and integrity metadata"
            rows={sources}
            rowKey={(src) => src.id}
            columns={[
              {
                key: 'title',
                header: 'Source',
                render: (src) => (
                  <Link href={`/source/${src.id}`} className="font-medium text-brand hover:underline">
                    {src.title}
                  </Link>
                ),
              },
              {
                key: 'identifier',
                header: 'Identifier',
                monoLtr: true,
                missingLabel: 'No persistent ID',
                render: (src) =>
                  src.identifierScheme && src.identifierValue
                    ? `${src.identifierScheme.toUpperCase()}:${src.identifierValue}`
                    : null,
              },
              {
                key: 'venue',
                header: 'Venue',
                missingLabel: 'Not reported',
                render: (src) => src.venue || null,
              },
              {
                key: 'published',
                header: 'Published',
                monoLtr: true,
                missingLabel: 'Undated',
                render: (src) => src.publishedDate || null,
              },
              {
                key: 'integrity',
                header: 'Integrity',
                monoLtr: true,
                render: (src) => src.integrityStatus,
              },
            ]}
          />
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}
