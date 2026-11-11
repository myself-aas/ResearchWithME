/**
 * Shared paper archive surface — used by the Next app (app/papers/page.tsx) and the
 * Pages target (cloudflare-pages/src/routes/papers.tsx). Extracting the body
 * keeps one source of truth for the markup and behavior in both runtimes
 * until Task 16 retires the Next app.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bookmark, Check, FileText, GraduationCap, Quote, Search, Share2 } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { PUBLICATIONS_DATA, Publication } from '@/lib/research-data';
import { readStringArray, writeLocal } from '@/lib/storage';

interface PapersArchiveProps {
  /** Bundled records server-side; the client refreshes from /api/papers on mount. */
  initialPapers?: Publication[];
}

const SAVED_KEY = 'rwm_saved_papers';
const TOPICS = ['All', 'Open Infrastructure', 'AI & Systems', 'Climate & Policy', 'Data Commons', 'Scholarly Tech'] as const;

type SortKey = 'date' | 'citations' | 'title';

export default function PapersArchive({ initialPapers = PUBLICATIONS_DATA }: PapersArchiveProps) {
  const [papers, setPapers] = useState<Publication[]>(initialPapers);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [copiedDoi, setCopiedDoi] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    setSavedIds(readStringArray(SAVED_KEY));
    let active = true;
    async function loadPapers() {
      try {
        const res = await fetch('/api/papers', { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error(`Archive responded with ${res.status}`);
        const data: { papers?: Publication[] } = await res.json();
        if (active && Array.isArray(data.papers) && data.papers.length > 0) {
          setPapers(data.papers);
          setLoadError(null);
        }
      } catch {
        if (active) {
          setLoadError('The live archive could not be reached, so the bundled paper records are shown.');
        }
      }
    }
    loadPapers();
    return () => {
      active = false;
    };
  }, []);

  async function handleCopyDoi(doi: string, id: string) {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(`https://doi.org/${doi}`);
      setCopiedDoi(id);
      window.setTimeout(() => setCopiedDoi(null), 2200);
    } catch {
      setCopyError('Clipboard access was blocked. The DOI is printed on the record below.');
    }
  }

  function handleToggleSave(paperId: string) {
    setSavedIds((previous) => {
      const next = previous.includes(paperId)
        ? previous.filter((id) => id !== paperId)
        : [...previous, paperId];
      writeLocal(SAVED_KEY, next);
      return next;
    });
  }

  const filteredPapers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return papers
      .filter((paper) => {
        if (selectedTopic !== 'All' && paper.topic !== selectedTopic) return false;
        if (!query) return true;
        return [
          paper.title,
          paper.abstract,
          paper.doi,
          paper.volume,
          ...paper.keywords,
          ...paper.authors.flatMap((author) => [author.name, author.affiliation]),
        ].some((value) => value.toLowerCase().includes(query));
      })
      .sort((a, b) => {
        if (sortBy === 'citations') return b.citationCount - a.citationCount;
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      });
  }, [papers, searchQuery, selectedTopic, sortBy]);

  const filtersActive = selectedTopic !== 'All' || Boolean(searchQuery);

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader />

      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <header className="border-b border-stone-200 pb-8">
          <h1 className="max-w-4xl font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Papers, methods, and reproducible artifacts
          </h1>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-stone-700">
            A structured archive of open-access papers. Each record lists its authors, DOI, license, methods, findings, and reproducibility material so the work can be checked rather than taken on trust.
          </p>
        </header>

        <section aria-labelledby="archive-filters" className="mt-8 border-b border-stone-200 pb-8">
          <h2 id="archive-filters" className="sr-only">
            Filter the paper archive
          </h2>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <label htmlFor="paper-search" className="mb-1.5 block text-sm font-medium text-stone-800">
                Search papers
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-600" aria-hidden="true" />
                <input
                  id="paper-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Title, abstract, author, DOI, or keyword"
                  className="h-11 w-full rounded-md border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-600"
                />
              </div>
            </div>

            <div className="sm:min-w-56">
              <label htmlFor="paper-sort" className="mb-1.5 block text-sm font-medium text-stone-800">
                Sort by
              </label>
              <select
                id="paper-sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortKey)}
                className="h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900"
              >
                <option value="date">Most recent</option>
                <option value="citations">Most cited</option>
                <option value="title">Title A–Z</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <p id="topic-label" className="mb-2 text-sm font-medium text-stone-800">
              Research topic
            </p>
            <div role="group" aria-labelledby="topic-label" className="flex flex-wrap gap-2">
              {TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSelectedTopic(topic)}
                  aria-pressed={selectedTopic === topic}
                  className={`min-h-10 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    selectedTopic === topic
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
                  }`}
                >
                  {topic === 'All' ? 'All topics' : topic}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-600">
            {filteredPapers.length} {filteredPapers.length === 1 ? 'paper' : 'papers'}
            {selectedTopic !== 'All' ? ` in ${selectedTopic}` : ''}
            {searchQuery ? ` matching “${searchQuery}”` : ''}
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedTopic('All');
              }}
              className="min-h-11 text-sm font-medium text-brand underline underline-offset-4 hover:text-brand-pressed"
            >
              Clear filters
            </button>
          )}
        </div>

        {loadError && (
          <p role="status" className="mt-4 border-l-2 border-brand-hover bg-indigo-50 px-4 py-3 text-sm text-brand-pressed">
            {loadError}
          </p>
        )}
        {copyError && (
          <p role="alert" className="mt-4 border-l-2 border-red-800 bg-red-50 px-4 py-3 text-sm text-red-900">
            {copyError}
          </p>
        )}

        {filteredPapers.length === 0 ? (
          <div className="mt-8 border border-stone-200 bg-white p-8 sm:p-12">
            <FileText className="h-8 w-8 text-stone-500" aria-hidden="true" />
            <h2 className="mt-4 font-serif text-2xl font-semibold text-stone-900">No papers match those filters</h2>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-stone-700">
              Try a broader search, or clear the topic filter to browse the full archive.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedTopic('All');
              }}
              className="mt-6 inline-flex min-h-11 items-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Show all papers
            </button>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
            {filteredPapers.map((paper) => {
              const isSaved = savedIds.includes(paper.id);
              const isCopied = copiedDoi === paper.id;

              return (
                <li key={paper.id} className="py-8">
                  <article aria-labelledby={`paper-${paper.id}-title`} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600">
                        <span className="font-medium text-brand">{paper.topic}</span>
                        <span aria-hidden="true">·</span>
                        <span>{paper.journal}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={paper.publishedDate}>{paper.publishedDate}</time>
                        <span aria-hidden="true">·</span>
                        <span>{paper.readTime}</span>
                      </p>

                      <h2 id={`paper-${paper.id}-title`} className="mt-2 font-serif text-2xl font-semibold leading-snug text-stone-900 sm:text-3xl">
                        <Link href={`/paper/${paper.slug}`} className="hover:text-brand">
                          {paper.title}
                        </Link>
                      </h2>

                      {paper.subtitle && (
                        <p className="mt-2 max-w-3xl text-base leading-relaxed text-stone-700">{paper.subtitle}</p>
                      )}

                      <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-stone-700">{paper.abstract}</p>

                      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600">
                        <span className="font-medium text-stone-800">Authors:</span>
                        {paper.authors.map((author, index) => (
                          <span key={`${author.name}-${index}`} className="inline-flex items-center gap-1">
                            <span>{author.name}</span>
                            {author.orcid && (
                              <>
                                <GraduationCap className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                                <span className="sr-only">ORCID {author.orcid}</span>
                              </>
                            )}
                            {index < paper.authors.length - 1 && <span aria-hidden="true">,</span>}
                          </span>
                        ))}
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-stone-200 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                      <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-1">
                        <div>
                          <dt className="text-stone-600">DOI</dt>
                          <dd className="break-all font-mono text-stone-900">{paper.doi}</dd>
                        </div>
                        <div>
                          <dt className="text-stone-600">Citations</dt>
                          <dd className="font-semibold text-stone-900">{paper.citationCount}</dd>
                        </div>
                        <div>
                          <dt className="text-stone-600">License</dt>
                          <dd className="text-stone-900">{paper.license}</dd>
                        </div>
                      </dl>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/paper/${paper.slug}`}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                        >
                          <span>Read the paper</span>
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggleSave(paper.id)}
                          aria-pressed={isSaved}
                          className={`inline-flex h-11 w-11 items-center justify-center rounded-md border transition-colors ${
                            isSaved
                              ? 'border-indigo-300 bg-indigo-50 text-brand'
                              : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
                          }`}
                        >
                          <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
                          <span className="sr-only">
                            {isSaved ? 'Remove from reading list' : 'Save to reading list'}
                          </span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <button
                          type="button"
                          onClick={() => handleCopyDoi(paper.doi, paper.id)}
                          className="inline-flex min-h-10 items-center gap-1.5 font-medium text-stone-700 underline-offset-4 hover:text-stone-900 hover:underline"
                        >
                          {isCopied ? (
                            <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                          ) : (
                            <Share2 className="h-4 w-4" aria-hidden="true" />
                          )}
                          <span>{isCopied ? 'DOI copied' : 'Copy DOI link'}</span>
                        </button>
                        <Link
                          href={`/cite?article=${encodeURIComponent(paper.slug)}`}
                          className="inline-flex min-h-10 items-center gap-1.5 font-medium text-stone-700 underline-offset-4 hover:text-stone-900 hover:underline"
                        >
                          <Quote className="h-4 w-4" aria-hidden="true" />
                          <span>Cite</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <BlogFooter />
    </div>
  );
}
