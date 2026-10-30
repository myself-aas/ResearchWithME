'use client';

import { Search, X } from 'lucide-react';
import { ArticleFormat } from '@/lib/blog-data';

interface BlogHeroProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedFormat: string;
  setSelectedFormat: (f: string) => void;
  totalArticles: number;
}

const formats: Array<'All' | ArticleFormat> = [
  'All',
  'Paper Review',
  'Repo Teardown',
  'Deep-Dive Essay',
  'Field Notes',
  'Case Study',
];

export default function BlogHero({
  searchQuery,
  setSearchQuery,
  selectedFormat,
  setSelectedFormat,
  totalArticles,
}: BlogHeroProps) {
  return (
    <section className="border-b border-stone-200 bg-stone-50" aria-labelledby="journal-title">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
          <div>
            <h1
              id="journal-title"
              className="max-w-3xl font-serif text-4xl font-bold leading-[1.08] tracking-tight text-stone-900 sm:text-5xl lg:text-6xl"
            >
              Research you can read, check, and reuse.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-700">
              Long-form reviews of published papers and open repositories, written by specialists whose credentials you can check. Each review cites the artifact it examined, and every one is free to read.
            </p>

            <div className="mt-8 max-w-2xl">
              <label htmlFor="catalog-search" className="mb-2 block text-sm font-medium text-stone-800">
                Search the catalog
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-600"
                    aria-hidden="true"
                  />
                  <input
                    id="catalog-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Title, author, DOI, or repository"
                    className="h-12 w-full rounded-lg border border-stone-300 bg-white pl-11 pr-10 text-base text-stone-900 placeholder:text-stone-600"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Clear search</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => document.getElementById('articles-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-stone-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
                >
                  Search
                </button>
              </div>
            </div>

            <div className="mt-6">
              <p id="format-label" className="mb-2 text-sm font-medium text-stone-800">
                Format
              </p>
              <div role="group" aria-labelledby="format-label" className="flex flex-wrap gap-2">
                {formats.map((format) => (
                  <button
                    key={format}
                    type="button"
                    aria-pressed={selectedFormat === format}
                    onClick={() => setSelectedFormat(format)}
                    className={`min-h-10 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedFormat === format
                        ? 'border-amber-900 bg-amber-900 text-white'
                        : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400 hover:text-stone-900'
                    }`}
                  >
                    {format === 'All' ? 'All formats' : format}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside aria-label="Publication summary" className="border-t border-stone-300 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-1">
              <div>
                <dt className="text-sm text-stone-600">Reviews published</dt>
                <dd className="font-serif text-3xl font-semibold text-stone-900">{totalArticles}</dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Verified specialists</dt>
                <dd className="font-serif text-3xl font-semibold text-stone-900">6</dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">Access</dt>
                <dd className="text-base font-semibold text-stone-900">Diamond open access</dd>
              </div>
              <div>
                <dt className="text-sm text-stone-600">License</dt>
                <dd className="text-base font-semibold text-stone-900">CC BY 4.0</dd>
              </div>
            </dl>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-stone-600">
              No paywalls, no ad trackers, and no pop-ups interrupting the reading.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
