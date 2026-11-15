import Link from 'next/link';
import type { ReactElement } from 'react';
import type { BlogPost } from '@/lib/blog-data';
import { summarizeAuthorWork } from '@/lib/author-work-summary';
import { Text } from '@/components/primitives';

export default function AuthorWorkSummary({
  articles,
}: {
  articles: readonly BlogPost[];
}): ReactElement | null {
  if (articles.length === 0) return null;

  const summary = summarizeAuthorWork(articles);

  return (
    <aside aria-labelledby="author-work-summary-heading" className="rounded-2xl border border-line bg-surface-raised p-5">
      <h2 id="author-work-summary-heading" className="font-serif text-xl font-bold text-ink">
        Work at a glance
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-b border-line pb-4 font-sans text-sm">
        <div>
          <dt className="text-ink-secondary">Published works</dt>
          <dd className="mt-1 text-2xl font-semibold text-ink">{summary.totalWorks}</dd>
        </div>
        <div>
          <dt className="text-ink-secondary">Reviewed artifacts</dt>
          <dd className="mt-1 text-2xl font-semibold text-ink">{summary.reviewedArtifactCount}</dd>
        </div>
      </dl>

      <section aria-labelledby="author-work-categories-heading" className="mt-4">
        <Text id="author-work-categories-heading" as="h3" variant="eyebrow" color="secondary" weight="semibold">
          By category
        </Text>
        <ul className="mt-2 space-y-1.5 font-sans text-sm">
          {summary.byCategory.map(({ category, count }) => (
            <li key={category} className="flex items-start justify-between gap-3 text-ink">
              <span>{category}</span>
              <span className="font-mono tabular-nums text-ink">{count}</span>
            </li>
          ))}
        </ul>
      </section>

      {summary.latestWorks.length > 0 && (
        <section aria-labelledby="author-latest-works-heading" className="mt-5 border-t border-line pt-4">
          <Text id="author-latest-works-heading" as="h3" variant="eyebrow" color="secondary" weight="semibold">
            Latest works
          </Text>
          <ol className="mt-2 space-y-2 font-sans text-sm">
            {summary.latestWorks.map((work) => (
              <li key={work.slug}>
                <Link
                  href={`/post/${work.slug}`}
                  className="rounded-sm font-medium text-brand underline decoration-border-strong underline-offset-4 hover:text-brand-pressed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {work.title}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </aside>
  );
}
