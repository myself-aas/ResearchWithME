import type { Metadata } from 'next';
import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { pageMetadata } from '@/lib/seo';
import { getContributionById } from '@/lib/v34/store';
import { listFormalReviews } from '@/lib/v34/wave2-store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageMetadata({
  title: 'Formal Peer Reviews',
  description:
    'Assigned, version-bound formal peer reviews kept strictly separate from informal scholarly discussions with enforced reviewer anonymity.',
  path: '/reviews',
  type: 'website',
});

export default function ReviewsDirectoryPage() {
  const reviews = listFormalReviews();

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
            <p className="font-mono text-xs uppercase tracking-wider text-brand">
              Formal Evaluation Ledger · ADR-032-03
            </p>
            <h1 className="mt-1 font-serif text-3xl font-bold text-ink sm:text-4xl">
              Formal Peer Reviews
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-secondary">
              Version-locked peer evaluations with structured review items, linked author rebuttals,
              and auditable editorial decisions. Anonymous reviewer identities are redacted across
              all views, APIs, and logs.
            </p>
          </div>
          <Link
            href="/feed"
            className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-brand"
          >
            Browse Contributions
          </Link>
        </div>

        <section aria-label="Formal peer review records" className="mt-8 space-y-4">
          {reviews.map((review) => {
            const contrib = getContributionById(review.contributionId);
            const displayReviewer = review.anonymous ? 'Anonymous reviewer' : review.reviewerName;

            return (
              <article
                key={review.id}
                className="rounded-xl border border-line bg-surface p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-brand/40 bg-brand/5 px-2.5 py-0.5 font-mono font-medium text-brand">
                      {review.status}
                    </span>
                    <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-ink-secondary">
                      {review.anonymous ? 'Anonymous review' : 'Open review'}
                    </span>
                    <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-ink-secondary">
                      Version {review.contributionVersion}
                    </span>
                  </div>
                  <span className="text-ink-secondary">Reviewer: {displayReviewer}</span>
                </div>

                <h2 className="font-serif text-lg font-semibold text-ink">
                  <Link href={`/review/${review.id}`} className="hover:text-brand hover:underline">
                    Review of {contrib?.title ?? review.contributionId}
                  </Link>
                </h2>

                <p className="text-sm text-ink-secondary">{review.scope}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-secondary">
                  <div className="flex flex-wrap gap-3 font-mono">
                    <span>Items: {review.items.length}</span>
                    <span>Rebuttals: {review.rebuttals.length}</span>
                    <span>
                      Decision: {review.decisions.at(-1)?.outcome ?? review.recommendation ?? 'Pending'}
                    </span>
                  </div>
                  <Link href={`/review/${review.id}`} className="font-sans font-medium text-brand hover:underline">
                    Inspect formal review →
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
