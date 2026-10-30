import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, GitBranch, GraduationCap } from 'lucide-react';
import { AUTHORS, Author } from '@/lib/blog-data';

function VerificationIcon({ author }: { author: Author }) {
  const shared = { className: 'h-3.5 w-3.5', 'aria-hidden': true as const };
  switch (author.verifiedVia) {
    case 'orcid':
      return <GraduationCap {...shared} />;
    case 'github':
      return <GitBranch {...shared} />;
    default:
      return <Building2 {...shared} />;
  }
}

export default function AuthorSpotlight() {
  const authors = Object.values(AUTHORS);

  return (
    <section aria-labelledby="contributors-title" className="border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="contributors-title" className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Who writes the reviews
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-700">
              Every contributor records a scholarly identity before publishing. Their profile shows what they study and what they have reviewed.
            </p>
          </div>
          <Link
            href="/authors"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-amber-900 underline underline-offset-4 hover:text-amber-950"
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
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 font-serif text-base font-bold text-stone-50 transition-colors group-hover:bg-amber-900"
                >
                  {author.avatar}
                </span>

                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-xl font-semibold text-stone-900 group-hover:text-amber-900">
                      {author.name}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Verified</span>
                    </span>
                  </span>
                  <span className="mt-1 block text-sm font-medium text-amber-900">{author.role}</span>
                  <span className="mt-1 block text-sm text-stone-600">
                    {author.institution ?? author.domain}
                  </span>
                  <span className="mt-3 block max-w-2xl text-sm leading-relaxed text-stone-700">
                    {author.bio}
                  </span>
                </span>

                <span className="flex shrink-0 flex-col gap-1 text-sm text-stone-600 sm:items-end">
                  <span className="inline-flex items-center gap-1.5 font-medium text-stone-800">
                    <VerificationIcon author={author} />
                    <span>{author.verifiedTitle}</span>
                  </span>
                  <span>
                    {author.articleCount} {author.articleCount === 1 ? 'review' : 'reviews'} · {author.totalReads ?? 'New'} reads
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
