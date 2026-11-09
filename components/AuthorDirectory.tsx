'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, ExternalLink, GitBranch, GraduationCap, Search, Users } from 'lucide-react';
import type { Author } from '@/lib/blog-data';

type IdentifierFilter = 'All' | 'orcid' | 'github';

const FILTERS: Array<{ value: IdentifierFilter; label: string; icon: typeof Users }> = [
  { value: 'All', label: 'All contributors', icon: Users },
  { value: 'orcid', label: 'Has an ORCID', icon: GraduationCap },
  { value: 'github', label: 'Has a GitHub', icon: GitBranch },
];

function orcidHref(author: Author) {
  return author.orcid
    ? `https://orcid.org/${author.orcid.replace(/^https?:\/\/orcid\.org\//, '')}`
    : undefined;
}

/**
 * The searchable half of the directory. app/authors/page.tsx is a server
 * component that reads public.profiles; this owns only the browser state.
 */
export default function AuthorDirectory({ authors }: { authors: Author[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [identifierFilter, setIdentifierFilter] = useState<IdentifierFilter>('All');

  const filteredAuthors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return authors.filter((author) => {
      if (identifierFilter === 'orcid' && !author.orcid) return false;
      if (identifierFilter === 'github' && !author.github) return false;
      if (!query) return true;
      return [author.name, author.role, author.domain, author.institution ?? '', author.bio].some(
        (value) => value.toLowerCase().includes(query),
      );
    });
  }, [authors, identifierFilter, searchQuery]);

  return (
    <>
      <section aria-labelledby="author-filters" className="border-b border-stone-200 py-8">
        <h2 id="author-filters" className="sr-only">
          Search and filter contributors
        </h2>
        <div className="grid gap-4 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] md:items-end">
          <div>
            <label htmlFor="author-search" className="mb-1.5 block text-sm font-medium text-stone-800">
              Search contributors
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-600" aria-hidden="true" />
              <input
                id="author-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Name, institution, or domain"
                className="h-11 w-full rounded-md border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-600"
              />
            </div>
          </div>

          <div>
            <p id="identifier-label" className="mb-1.5 text-sm font-medium text-stone-800">
              Linked identifier
            </p>
            <div role="group" aria-labelledby="identifier-label" className="flex flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setIdentifierFilter(filter.value)}
                  aria-pressed={identifierFilter === filter.value}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    identifierFilter === filter.value
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
                  }`}
                >
                  <filter.icon className="h-4 w-4" aria-hidden="true" />
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-stone-600">
          {filteredAuthors.length} {filteredAuthors.length === 1 ? 'contributor' : 'contributors'}{' '}
          shown
          {searchQuery ? ` for “${searchQuery}”` : ''}
        </p>
      </section>

      {authors.length === 0 ? (
        <div className="mt-8 border border-stone-200 bg-white p-8 sm:p-12">
          <Users className="h-8 w-8 text-stone-500" aria-hidden="true" />
          <h2 className="mt-3 font-serif text-2xl font-semibold text-stone-900">
            No published contributors yet
          </h2>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-stone-700">
            Contributor profiles appear here once their authors publish them. Until then the archive
            is still open for reading.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
          >
            Browse the platform
          </Link>
        </div>
      ) : filteredAuthors.length === 0 ? (
        <div className="mt-8 border border-stone-200 bg-white p-8 sm:p-12">
          <h2 className="font-serif text-2xl font-semibold text-stone-900">
            No contributors match those filters
          </h2>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-stone-700">
            Try a different name or clear the identifier filter to see the full directory.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setIdentifierFilter('All');
            }}
            className="mt-6 inline-flex min-h-11 items-center rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAuthors.map((author) => (
            <li key={author.id} className="flex">
              <article className="flex w-full flex-col justify-between rounded-lg border border-stone-200 bg-white p-6">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-14 w-14 items-center justify-center rounded-lg bg-stone-900 font-serif text-lg font-bold text-stone-50"
                    >
                      {author.avatar}
                    </span>
                    <span className="rounded border border-stone-300 bg-stone-100 px-2 py-1 text-sm text-stone-700">
                      {author.articleCount} {author.articleCount === 1 ? 'article' : 'articles'}
                    </span>
                  </div>

                  <h2 className="mt-4 font-serif text-xl font-semibold text-stone-900">
                    <Link href={`/author/${author.id}`} className="hover:text-amber-900">
                      {author.name}
                    </Link>
                  </h2>
                  {author.role && <p className="mt-1 text-sm font-medium text-amber-900">{author.role}</p>}
                  {author.institution && (
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-stone-600">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{author.institution}</span>
                    </p>
                  )}

                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone-700">{author.bio}</p>
                </div>

                <div className="mt-5 border-t border-stone-200 pt-4">
                  {/* Self-declared identifiers are shown as links, never as a
                      verification badge. The authoritative record lives in
                      auth.users.identities and is not readable here. */}
                  <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                    {author.orcid && (
                      <li>
                        <a
                          href={orcidHref(author)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex min-h-9 items-center gap-1 text-stone-700 underline-offset-4 hover:text-stone-900 hover:underline"
                        >
                          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>ORCID</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </li>
                    )}
                    {author.github && (
                      <li>
                        <a
                          href={author.github}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex min-h-9 items-center gap-1 text-stone-700 underline-offset-4 hover:text-stone-900 hover:underline"
                        >
                          <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>GitHub</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </li>
                    )}
                    {!author.orcid && !author.github && (
                      <li className="text-stone-500">No linked identifier on file</li>
                    )}
                  </ul>

                  <Link
                    href={`/author/${author.id}`}
                    className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-amber-900 underline-offset-4 hover:underline"
                  >
                    <span>View profile and archive</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
