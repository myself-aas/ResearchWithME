import Link from 'next/link';
import { ArrowRight, GitBranch, GraduationCap } from 'lucide-react';
import type { Author } from '@/lib/blog-data';

/**
 * Homepage contributor spotlight.
 *
 * Presentational: it has no state and no handlers, so it is not a client
 * component. It renders inside HomeFeed (which is), and receives its rows as
 * props from app/page.tsx, which reads public.profiles on the server.
 *
 * It used to render an unconditional green "Verified" badge and a
 * `verifiedTitle` for every contributor. Both claimed a verification that the
 * self-declared profile columns do not establish -- the authoritative record is
 * auth.users.identities, which is not readable here -- so the badge is replaced
 * by plain links to whatever identifier the contributor supplied.
 */
function IdentifierLinks({ author }: { author: Author }) {
  const shared = { className: 'h-3.5 w-3.5', 'aria-hidden': true as const };

  if (!author.orcid && !author.github) return null;

  return (
    <span className="inline-flex items-center gap-2 font-medium text-stone-800">
      {author.orcid && <GraduationCap {...shared} />}
      {author.github && <GitBranch {...shared} />}
      <span>{[author.orcid && 'ORCID', author.github && 'GitHub'].filter(Boolean).join(' · ')}</span>
    </span>
  );
}

export default function AuthorSpotlight({ authors }: { authors: Author[] }) {
  // Nothing published yet: drop the section rather than render an empty heading.
  if (authors.length === 0) return null;

  return (
    <section aria-labelledby="contributors-title" className="border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="contributors-title"
              className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl"
            >
              The people behind the reviews
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-700">
              Each profile records what a contributor studies and everything they have reviewed
              here.
            </p>
          </div>
          <Link
            href="/authors"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed"
          >
            <span>All authors</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <ul className="divide-y divide-stone-200">
          {authors.map((author) => (
            <li key={author.id}>
              <Link
                href={`/author/${author.id}`}
                className="group grid gap-4 py-6 transition-colors hover:bg-stone-50 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-6"
              >
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 font-serif text-base font-bold text-stone-50 transition-colors group-hover:bg-brand"
                >
                  {author.avatar}
                </span>

                <span className="min-w-0">
                  <span className="font-serif text-xl font-semibold text-stone-900 group-hover:text-brand">
                    {author.name}
                  </span>
                  {author.role && (
                    <span className="mt-1 block text-sm font-medium text-brand">{author.role}</span>
                  )}
                  {(author.institution || author.domain) && (
                    <span className="mt-1 block text-sm text-stone-600">
                      {author.institution ?? author.domain}
                    </span>
                  )}
                  <span className="mt-3 block max-w-2xl text-sm leading-relaxed text-stone-700">
                    {author.bio}
                  </span>
                </span>

                <span className="flex shrink-0 flex-col gap-1 text-sm text-stone-600 sm:items-end">
                  <IdentifierLinks author={author} />
                  <span>
                    {author.articleCount} {author.articleCount === 1 ? 'article' : 'articles'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
