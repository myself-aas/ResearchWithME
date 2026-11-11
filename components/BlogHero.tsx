'use client';

import { Search, X } from 'lucide-react';
import { LayoutGroup } from 'motion/react';
import * as m from 'motion/react-m';
import { ArticleFormat, CATEGORIES } from '@/lib/blog-data';
import Pressable from './motion/Pressable';
import { EASING } from '@/lib/motion/tokens';

interface BlogHeroProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedFormat: string;
  setSelectedFormat: (f: string) => void;
  selectedCategory?: string;
  setSelectedCategory?: (c: string) => void;
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

const columns: string[] = ['All', ...CATEGORIES];

export default function BlogHero({
  searchQuery,
  setSearchQuery,
  selectedFormat,
  setSelectedFormat,
  selectedCategory = 'All',
  setSelectedCategory,
  totalArticles,
}: BlogHeroProps) {
  return (
    <section className="border-b border-line bg-canvas" aria-labelledby="platform-title">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16">
              <div>
                <p
                  data-enter="rise"
                  style={{ '--enter-delay': '0ms' } as React.CSSProperties}
                  className="font-mono text-xs uppercase tracking-wider text-ink-secondary"
                >
                  ISSN 2994-0821 · Diamond Open Access · Verified Specialist Monograph
                </p>
                <h1
                  id="platform-title"
                  data-enter="rise"
                  style={{ '--enter-delay': '60ms' } as React.CSSProperties}
                  className="mt-3 max-w-3xl font-serif text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl"
                >
                  Research you can read, check, and reuse.
                </h1>
                <p
                  data-enter="rise"
                  style={{ '--enter-delay': '120ms' } as React.CSSProperties}
                  className="mt-5 max-w-2xl font-sans text-base leading-relaxed text-ink-secondary sm:text-lg"
                >
                  Long-form teardowns of published papers and open-source repositories, written by ORCID and GitHub attested domain specialists. Every claim carries a verifiable citation and nothing sits behind a paywall.
                </p>

                <div
                  data-enter="rise"
                  style={{ '--enter-delay': '180ms' } as React.CSSProperties}
                  className="mt-8 max-w-2xl"
                >
                  <label htmlFor="catalog-search" className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink-secondary">
                    Filter catalog by keyword, DOI, or repository
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Search
                        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary"
                        aria-hidden="true"
                      />
                      <input
                        id="catalog-search"
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Title, specialist, 10.5555/rwm…, or org/repo"
                        className="h-11 w-full rounded-sm border border-line bg-surface pl-10 pr-10 font-sans text-sm text-ink placeholder:text-ink-secondary focus:bg-canvas"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm text-ink-secondary transition-colors hover:bg-surface-subtle hover:text-ink"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Clear search</span>
                        </button>
                      )}
                    </div>
                    <Pressable
                      type="button"
                      feedback="lift"
                      onClick={() =>
                        document.getElementById('articles-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-sm bg-ink px-5 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90"
                    >
                      Browse index
                    </Pressable>
                  </div>
                </div>

                {setSelectedCategory && (
                  <div
                    className="mt-6"
                    data-enter="rise"
                    style={{ '--enter-delay': '240ms' } as React.CSSProperties}
                  >
                    <p id="column-label" className="mb-2 font-mono text-xs uppercase tracking-wider text-ink-secondary">
                      Editorial Column
                    </p>
                    <LayoutGroup id="hero-columns">
                      <div role="group" aria-labelledby="column-label" className="flex flex-wrap gap-1.5">
                        {columns.map((column) => {
                          const active = selectedCategory === column;
                          return (
                            <button
                              key={column}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setSelectedCategory(column)}
                              className={`relative inline-flex min-h-10 items-center rounded-sm border px-3 py-1.5 font-sans text-xs font-medium transition-colors ${
                                active
                                  ? 'border-brand text-on-primary'
                                  : 'border-line bg-surface text-ink-secondary hover:bg-surface-subtle hover:text-ink'
                              }`}
                            >
                              {active && (
                                <m.span
                                  layoutId="active-column-pill"
                                  className="absolute inset-0 rounded-sm bg-brand"
                                  transition={{ duration: 0.18, ease: [...EASING.standard] }}
                                />
                              )}
                              <span className="relative z-10">{column === 'All' ? 'All columns' : column}</span>
                            </button>
                          );
                        })}
                      </div>
                    </LayoutGroup>
                  </div>
                )}

                <div className="mt-5">
                  <p id="format-label" className="mb-2 font-mono text-xs uppercase tracking-wider text-ink-secondary">
                    Manuscript Format
                  </p>
                  <LayoutGroup id="hero-formats">
                    <div role="group" aria-labelledby="format-label" className="flex flex-wrap gap-1.5">
                      {formats.map((format) => {
                        const active = selectedFormat === format;
                        return (
                          <button
                            key={format}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setSelectedFormat(format)}
                            className={`relative inline-flex min-h-10 items-center rounded-sm border px-3 py-1.5 font-sans text-xs font-medium transition-colors ${
                              active
                                ? 'border-brand text-on-primary'
                                : 'border-line bg-surface text-ink-secondary hover:bg-surface-subtle hover:text-ink'
                            }`}
                          >
                            {active && (
                              <m.span
                                layoutId="active-format-pill"
                                className="absolute inset-0 rounded-sm bg-brand"
                                transition={{ duration: 0.18, ease: [...EASING.standard] }}
                              />
                            )}
                            <span className="relative z-10">{format === 'All' ? 'All formats' : format}</span>
                          </button>
                        );
                      })}
                    </div>
                  </LayoutGroup>
                </div>
              </div>

              <aside
                aria-label="Platform summary"
                className="border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
              >
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5 divide-y-0 lg:grid-cols-1 lg:divide-y lg:divide-line">
                  <div className="lg:pb-4">
                    <dt className="font-mono text-xs uppercase tracking-wider text-ink-secondary">Published reviews</dt>
                    <dd className="mt-1 font-mono text-2xl font-semibold text-ink">{totalArticles}</dd>
                  </div>
                  <div className="lg:py-4">
                    <dt className="font-mono text-xs uppercase tracking-wider text-ink-secondary">Verified specialists</dt>
                    <dd className="mt-1 font-mono text-2xl font-semibold text-ink">6</dd>
                  </div>
                  <div className="lg:py-4">
                    <dt className="font-mono text-xs uppercase tracking-wider text-ink-secondary">Access model</dt>
                    <dd className="mt-1 font-sans text-sm font-semibold text-ink">Diamond open access</dd>
                  </div>
                  <div className="lg:pt-4">
                    <dt className="font-mono text-xs uppercase tracking-wider text-ink-secondary">License</dt>
                    <dd className="mt-1 font-mono text-sm font-semibold text-ink">CC BY 4.0</dd>
                  </div>
                </dl>
                <p className="mt-6 max-w-xs font-sans text-xs leading-relaxed text-ink-secondary">
                  Zero paywalls, behavioural ad trackers, or reading-flow pop-ups. Primary artifacts first.
                </p>
              </aside>
            </div>
          </div>
    </section>
  );
}
