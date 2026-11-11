'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, ExternalLink, GitBranch, GraduationCap, Search, Users } from 'lucide-react';
import type { Author } from '@/lib/blog-data';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';

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
      <section aria-labelledby="author-filters" className="border-b border-line py-8">
        <h2 id="author-filters" className="sr-only">
          Search and filter contributors
        </h2>
        <div className="grid gap-4 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] md:items-end">
          <div>
            <label htmlFor="author-search" className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-ink-secondary">
              Search contributors
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary" aria-hidden="true" />
              <input
                id="author-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Name, institution, or domain"
                className="h-11 w-full rounded-sm border border-line bg-surface pl-9 pr-3 font-sans text-sm text-ink placeholder:text-ink-secondary"
              />
            </div>
          </div>

          <div>
            <p id="identifier-label" className="mb-1.5 font-mono text-xs uppercase tracking-wider text-ink-secondary">
              Linked identifier
            </p>
            <div role="group" aria-labelledby="identifier-label" className="flex flex-wrap gap-1.5">
              {FILTERS.map((filter) => {
                const active = identifierFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setIdentifierFilter(filter.value)}
                    aria-pressed={active}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-sm border px-3 py-2 font-sans text-xs font-medium transition-colors ${
                      active
                        ? 'border-brand bg-brand text-on-primary'
                        : 'border-line bg-surface text-ink-secondary hover:bg-surface-subtle hover:text-ink'
                    }`}
                  >
                    <filter.icon className="h-4 w-4" aria-hidden="true" />
                    <span>{filter.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-4 font-mono text-xs text-ink-secondary">
          {filteredAuthors.length} {filteredAuthors.length === 1 ? 'contributor' : 'contributors'} shown
          {searchQuery ? ` for “${searchQuery}”` : ''}
        </p>
      </section>

      {authors.length === 0 ? (
        <div className="mt-8 rounded-sm border border-line bg-surface p-8 sm:p-12">
          <Users className="h-7 w-7 text-ink-secondary" aria-hidden="true" />
          <h2 className="mt-3 font-serif text-2xl font-semibold text-ink">
            No published contributors yet
          </h2>
          <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink-secondary">
            Contributor profiles appear here once their authors publish them. Until then the archive is still open for reading.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-ink px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90"
          >
            Browse the platform
          </Link>
        </div>
      ) : filteredAuthors.length === 0 ? (
        <div className="mt-8 rounded-sm border border-line bg-surface p-8 sm:p-12">
          <h2 className="font-serif text-2xl font-semibold text-ink">
            No contributors match those filters
          </h2>
          <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink-secondary">
            Try a different name or clear the identifier filter to see the full directory.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setIdentifierFilter('All');
            }}
            className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-brand px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-brand-hover"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <Stagger
          as="ul"
          data-layout-grid="author-cards"
          className="mt-8 grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        >
          {filteredAuthors.map((author) => (
            <StaggerItem as="li" key={author.id} className="flex">
              <article className="flex w-full flex-col justify-between rounded-sm border border-line bg-surface p-6 transition-colors hover:border-brand">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 items-center justify-center rounded-sm border border-line bg-canvas font-mono text-sm font-semibold text-ink"
                    >
                      {author.avatar}
                    </span>
                    <span className="rounded-sm border border-line bg-canvas px-2 py-1 font-mono text-xs text-ink-secondary">
                      {author.articleCount} {author.articleCount === 1 ? 'article' : 'articles'}
                    </span>
                  </div>

                  <h2 className="mt-4 font-serif text-xl font-semibold text-ink">
                    <Link href={`/author/${author.id}`} className="transition-colors hover:text-brand">
                      {author.name}
                    </Link>
                  </h2>
                  {author.role && <p className="mt-1 font-mono text-xs font-medium text-brand">{author.role}</p>}
                  {author.institution && (
                    <p className="mt-1 flex items-start gap-1.5 font-sans text-xs text-ink-secondary">
                      <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{author.institution}</span>
                    </p>
                  )}

                  <p className="mt-3 font-sans text-sm leading-relaxed text-ink-secondary">
                    {author.bio.length > 180 ? `${author.bio.slice(0, 177)}…` : author.bio}
                  </p>
                </div>

                <div className="mt-5 border-t border-line pt-4">
                  <ul className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs">
                    {author.orcid && (
                      <li>
                        <a
                          href={orcidHref(author)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex min-h-9 items-center gap-1 text-ink-secondary underline-offset-4 hover:text-brand hover:underline"
                        >
                          <GraduationCap className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
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
                          className="inline-flex min-h-9 items-center gap-1 text-ink-secondary underline-offset-4 hover:text-brand hover:underline"
                        >
                          <GitBranch className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                          <span>GitHub</span>
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </li>
                    )}
                    {!author.orcid && !author.github && (
                      <li className="text-ink-secondary">No linked identifier on file</li>
                    )}
                  </ul>

                  <Link
                    href={`/author/${author.id}`}
                    className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-wider text-brand underline-offset-4 hover:underline"
                  >
                    <span>View profile and archive</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}
