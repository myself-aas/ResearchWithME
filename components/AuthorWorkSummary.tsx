import Link from 'next/link';
import type { ReactElement } from 'react';
import type { BlogPost } from '@/lib/blog-data';
import { summarizeAuthorWork } from '@/lib/author-work-summary';

export default function AuthorWorkSummary({
  articles,
}: {
  articles: readonly BlogPost[];
}): ReactElement | null {
  if (articles.length === 0) return null;

  const summary = summarizeAuthorWork(articles);

  return (
    <aside aria-labelledby="author-work-summary-heading" className="rounded-md border border-stone-200 bg-white p-5">
      <h2 id="author-work-summary-heading" className="font-serif text-xl font-bold text-stone-900">
        Work at a glance
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-b border-stone-200 pb-4 font-sans text-sm">
        <div>
          <dt className="text-stone-600">Published works</dt>
          <dd className="mt-1 text-2xl font-semibold text-stone-900">{summary.totalWorks}</dd>
        </div>
        <div>
          <dt className="text-stone-600">Reviewed artifacts</dt>
          <dd className="mt-1 text-2xl font-semibold text-stone-900">{summary.reviewedArtifactCount}</dd>
        </div>
      </dl>

      <section aria-labelledby="author-work-categories-heading" className="mt-4">
        <h3 id="author-work-categories-heading" className="font-mono text-xs font-semibold uppercase tracking-wider text-stone-600">
          By category
        </h3>
        <ul className="mt-2 space-y-1.5 font-sans text-sm">
          {summary.byCategory.map(({ category, count }) => (
            <li key={category} className="flex items-start justify-between gap-3 text-stone-700">
              <span>{category}</span>
              <span className="font-mono tabular-nums text-stone-900">{count}</span>
            </li>
          ))}
        </ul>
      </section>

      {summary.latestWorks.length > 0 && (
        <section aria-labelledby="author-latest-works-heading" className="mt-5 border-t border-stone-200 pt-4">
          <h3 id="author-latest-works-heading" className="font-mono text-xs font-semibold uppercase tracking-wider text-stone-600">
            Latest works
          </h3>
          <ol className="mt-2 space-y-2 font-sans text-sm">
            {summary.latestWorks.map((work) => (
              <li key={work.slug}>
                <Link
                  href={`/post/${work.slug}`}
                  className="rounded-sm font-medium text-brand underline decoration-stone-300 underline-offset-4 hover:text-brand-pressed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
