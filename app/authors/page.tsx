'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, GitBranch, GraduationCap, Search, Users } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { AUTHORS, Author } from '@/lib/blog-data';

type CredentialFilter = 'All' | Author['verifiedVia'];

const FILTERS: Array<{ value: CredentialFilter; label: string; icon: typeof Users }> = [
  { value: 'All', label: 'All contributors', icon: Users },
  { value: 'orcid', label: 'ORCID', icon: GraduationCap },
  { value: 'github', label: 'GitHub', icon: GitBranch },
  { value: 'institution', label: 'Institution', icon: Building2 },
];

function credentialIcon(author: Author) {
  switch (author.verifiedVia) {
    case 'orcid':
      return <GraduationCap className="h-4 w-4" aria-hidden="true" />;
    case 'github':
      return <GitBranch className="h-4 w-4" aria-hidden="true" />;
    default:
      return <Building2 className="h-4 w-4" aria-hidden="true" />;
  }
}

export default function AuthorsDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [credentialFilter, setCredentialFilter] = useState<CredentialFilter>('All');
  const authors = Object.values(AUTHORS);

  const filteredAuthors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return authors.filter((author) => {
      if (credentialFilter !== 'All' && author.verifiedVia !== credentialFilter) return false;
      if (!query) return true;
      return [
        author.name,
        author.role,
        author.domain,
        author.institution ?? '',
        author.bio,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [authors, credentialFilter, searchQuery]);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <header className="border-b border-stone-200 pb-8">
          <h1 className="max-w-4xl font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Reviewers and their records
          </h1>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-stone-700">
            Each contributor publishes under a recorded scholarly identity. A profile lists their credentials, research area, and everything they have reviewed.
          </p>
        </header>

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
              <p id="credential-label" className="mb-1.5 text-sm font-medium text-stone-800">
                Credential
              </p>
              <div role="group" aria-labelledby="credential-label" className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setCredentialFilter(filter.value)}
                    aria-pressed={credentialFilter === filter.value}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      credentialFilter === filter.value
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
            {filteredAuthors.length} {filteredAuthors.length === 1 ? 'contributor' : 'contributors'}
            {searchQuery ? ` for “${searchQuery}”` : ''}
          </p>
        </section>

        {filteredAuthors.length === 0 ? (
          <div className="mt-8 border border-stone-200 bg-white p-8 sm:p-12">
            <h2 className="font-serif text-2xl font-semibold text-stone-900">No contributors match</h2>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-stone-700">
              Try another name, or clear the credential filter to see everyone.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCredentialFilter('All');
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
                        {author.articleCount} {author.articleCount === 1 ? 'review' : 'reviews'}
                      </span>
                    </div>

                    <h2 className="mt-4 font-serif text-xl font-semibold text-stone-900">
                      <Link href={`/author/${author.id}`} className="hover:text-amber-900">
                        {author.name}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm font-medium text-amber-900">{author.role}</p>
                    {author.institution && (
                      <p className="mt-1 flex items-start gap-1.5 text-sm text-stone-600">
                        <Building2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{author.institution}</span>
                      </p>
                    )}

                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-stone-700">{author.bio}</p>
                  </div>

                  <div className="mt-5 border-t border-stone-200 pt-4">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-900">
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      <span>{author.verifiedTitle}</span>
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
                      {credentialIcon(author)}
                      <span className="break-all font-mono">{author.verifiedIdentifier}</span>
                    </p>
                    <Link
                      href={`/author/${author.id}`}
                      className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-amber-900 underline-offset-4 hover:underline"
                    >
                      <span>View profile</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>

      <BlogFooter />
    </div>
  );
}
