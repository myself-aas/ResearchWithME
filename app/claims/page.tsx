import type { Metadata } from 'next';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { pageMetadata } from '@/lib/seo';
import { getClaimEvidenceLinks, listClaims } from '@/lib/v34/store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Structured Scholarly Claims',
  description:
    'Typed scholarly propositions evaluated through explicit SUPPORTS, CONTRADICTS, and QUALIFIES evidence links.',
  path: '/claims',
  type: 'website',
});

export default function ClaimsDirectoryPage() {
  const claims = listClaims();
  const allLinks = getClaimEvidenceLinks();

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
              Claims Directory
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
              Typed propositions evaluated via normalized SUPPORTS, CONTRADICTS, and QUALIFIES links
              against versioned evidence units.
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
              href="/graph"
              className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
            >
              Inspect Provenance Graph
            </Link>
          </div>
        </div>

        <section aria-label="Canonical scholarly claims" className="mt-8 space-y-4">
          {claims.map((claim) => {
            const links = allLinks.filter((l) => l.claimId === claim.id);
            const supports = links.filter((l) => l.relationship === 'SUPPORTS').length;
            const contradicts = links.filter((l) => l.relationship === 'CONTRADICTS').length;
            const qualifies = links.filter((l) => l.relationship === 'QUALIFIES').length;

            return (
              <article
                key={claim.id}
                className="rounded-xl border border-line bg-surface p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-ink-secondary">
                      {claim.claimType}
                    </span>
                    <span className="rounded-full border border-line bg-surface-raised px-2.5 py-0.5 font-mono text-ink">
                      {claim.lifecycle}
                    </span>
                  </div>
                  <span className="font-mono text-ink-secondary">v{claim.objectVersion}</span>
                </div>

                <h2 className="font-serif text-lg font-semibold text-ink">
                  <Link href={`/claim/${claim.id}`} className="hover:text-brand hover:underline">
                    {claim.statement}
                  </Link>
                </h2>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-xs text-ink-secondary">
                  <div className="flex flex-wrap gap-3 font-mono">
                    <span className="text-ink">Supports: {supports}</span>
                    <span>Qualifies: {qualifies}</span>
                    <span className={contradicts > 0 ? 'text-destructive font-semibold' : ''}>
                      Contradicts: {contradicts}
                    </span>
                  </div>
                  <Link href={`/claim/${claim.id}`} className="font-sans font-medium text-brand hover:underline">
                    Inspect claim &amp; evidence →
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
