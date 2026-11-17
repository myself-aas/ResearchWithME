import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { pageMetadata } from '@/lib/seo';
import { getContributionById } from '@/lib/v34/store';
import { getFormalReview } from '@/lib/v34/wave2-store';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const review = getFormalReview(id);
  return pageMetadata({
    title: review ? `Formal Review · ${review.status}` : 'Formal Peer Review',
    description: review?.scope ?? 'Version-locked formal peer review record.',
    path: `/review/${id}`,
    type: 'article',
  });
}

export default async function FormalReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const review = getFormalReview(id);
  if (!review) notFound();

  const contrib = getContributionById(review.contributionId);
  const safeReviewer = review.anonymous ? 'Anonymous reviewer' : review.reviewerName;

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:pb-12"
      >
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-secondary">
          <Link href="/reviews" className="hover:text-brand hover:underline">
            Formal Peer Reviews
          </Link>{' '}
          / <span className="font-mono text-ink">{review.id}</span>
        </nav>

        <header className="rounded-xl border border-line bg-surface p-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-brand/40 bg-brand/5 px-2.5 py-0.5 font-mono font-medium text-brand">
              {review.status}
            </span>
            <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-ink-secondary">
              {review.anonymous ? 'Anonymous review' : 'Open review'}
            </span>
            <span className="rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-ink-secondary">
              Contribution v{review.contributionVersion}
            </span>
          </div>

          <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">
            Formal Review: {contrib?.title ?? review.contributionId}
          </h1>
          <p className="text-sm text-ink-secondary">{review.scope}</p>
          <p className="text-xs text-ink-secondary">
            Assigned evaluator: <strong className="text-ink">{safeReviewer}</strong>
            {contrib && (
              <>
                {' · '}
                <Link
                  href={`/contribution/${contrib.slug}`}
                  className="font-medium text-brand hover:underline"
                >
                  Open contribution →
                </Link>
              </>
            )}
          </p>
        </header>

        <section aria-labelledby="review-items-heading" className="mt-8 space-y-3">
          <h2 id="review-items-heading" className="font-serif text-xl font-bold text-ink">
            Structured Review Items ({review.items.length})
          </h2>
          <ul className="space-y-3">
            {review.items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-line bg-surface p-4 space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold text-ink">
                    {item.itemType}
                  </span>
                  <span className="rounded-full border border-line bg-canvas px-2 py-0.5 font-mono text-ink-secondary">
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-ink">{item.body}</p>
                {item.scope && (
                  <p className="font-mono text-xs text-ink-secondary">Scope: {item.scope}</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="rebuttals-heading" className="mt-8 space-y-3">
          <h2 id="rebuttals-heading" className="font-serif text-xl font-bold text-ink">
            Author Rebuttals ({review.rebuttals.length})
          </h2>
          {review.rebuttals.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-4 text-sm text-ink-secondary">
              No author rebuttals submitted for this review cycle yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {review.rebuttals.map((reb) => (
                <li
                  key={reb.id}
                  className="rounded-xl border border-line bg-surface p-4 text-sm space-y-1"
                >
                  <p className="text-xs font-medium text-ink-secondary">{reb.authorName}</p>
                  <p className="text-ink">{reb.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}
