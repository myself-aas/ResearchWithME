/**
 * Shared paper archive surface — used by the Next app (app/papers/page.tsx) and the
 * Pages target (cloudflare-pages/src/routes/papers.tsx).
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bookmark, FileText, GraduationCap, Quote, Search, Share2 } from 'lucide-react';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import * as m from 'motion/react-m';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { PUBLICATIONS_DATA, Publication } from '@/lib/research-data';
import { useHydratePreferences, usePreferencesStore } from '@/lib/stores/preferences-store';
import { MotionItem, MotionList } from './motion/MotionList';
import Pressable from './motion/Pressable';
import SuccessCheck from './motion/SuccessCheck';
import { EASING } from '@/lib/motion/tokens';

interface PapersArchiveProps {
  /** Bundled records server-side; the client refreshes from /api/papers on mount. */
  initialPapers?: Publication[];
}

const TOPICS = ['All', 'Open Infrastructure', 'AI & Systems', 'Climate & Policy', 'Data Commons', 'Scholarly Tech'] as const;

type SortKey = 'date' | 'citations' | 'title';

export default function PapersArchive({ initialPapers = PUBLICATIONS_DATA }: PapersArchiveProps) {
  const hydrated = useHydratePreferences();
  const savedPaperIds = usePreferencesStore((state) => state.savedPaperIds);
  const toggleSavedPaper = usePreferencesStore((state) => state.toggleSavedPaper);

  const [papers, setPapers] = useState<Publication[]>(initialPapers);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [copiedDoi, setCopiedDoi] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const savedIds = useMemo(
    () => (hydrated ? savedPaperIds : []),
    [hydrated, savedPaperIds],
  );

  useEffect(() => {
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
    toggleSavedPaper(paperId);
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
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
          <BlogHeader />

          <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
            <header className="border-b border-line pb-8">
              <p className="font-mono text-xs uppercase tracking-wider text-ink-secondary">
                Peer-Reviewed Archive · Diamond Open Access
              </p>
              <h1 className="mt-2 max-w-4xl font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl">
                Papers, methods, and reproducible artifacts
              </h1>
              <p className="mt-4 max-w-[65ch] font-sans text-base leading-relaxed text-ink-secondary">
                A structured archive of open-access papers. Each record lists its authors, DOI, license, methods, findings, and reproducibility material so the work can be checked rather than taken on trust.
              </p>
            </header>

            <section aria-labelledby="archive-filters" className="mt-8 border-b border-line pb-8">
              <h2 id="archive-filters" className="sr-only">
                Filter the paper archive
              </h2>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <label htmlFor="paper-search" className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-ink-secondary">
                    Search papers
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary" aria-hidden="true" />
                    <input
                      id="paper-search"
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Title, abstract, author, DOI, or keyword"
                      className="h-11 w-full rounded-sm border border-line bg-surface pl-9 pr-3 font-sans text-sm text-ink placeholder:text-ink-secondary"
                    />
                  </div>
                </div>

                <div className="sm:min-w-56">
                  <label htmlFor="paper-sort" className="mb-1.5 block font-mono text-xs uppercase tracking-wider text-ink-secondary">
                    Sort by
                  </label>
                  <select
                    id="paper-sort"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortKey)}
                    className="h-11 w-full rounded-sm border border-line bg-surface px-3 font-sans text-sm text-ink"
                  >
                    <option value="date">Most recent</option>
                    <option value="citations">Most cited</option>
                    <option value="title">Title A–Z</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <p id="topic-label" className="mb-2 font-mono text-xs uppercase tracking-wider text-ink-secondary">
                  Research topic
                </p>
                <LayoutGroup id="paper-topics">
                  <div role="group" aria-labelledby="topic-label" className="flex flex-wrap gap-1.5">
                    {TOPICS.map((topic) => {
                      const active = selectedTopic === topic;
                      return (
                        <Pressable
                          key={topic}
                          type="button"
                          onClick={() => setSelectedTopic(topic)}
                          aria-pressed={active}
                          className={`relative inline-flex min-h-10 items-center rounded-sm border px-3 py-1.5 font-sans text-xs font-medium transition-colors ${
                            active
                              ? 'border-brand text-on-primary'
                              : 'border-line bg-surface text-ink-secondary hover:bg-surface-subtle hover:text-ink'
                          }`}
                        >
                          {active && (
                            <m.span
                              layoutId="active-paper-topic-pill"
                              className="absolute inset-0 rounded-sm bg-brand"
                              transition={{ duration: 0.18, ease: [...EASING.standard] }}
                            />
                          )}
                          <span className="relative z-10">{topic === 'All' ? 'All topics' : topic}</span>
                        </Pressable>
                      );
                    })}
                  </div>
                </LayoutGroup>
              </div>
            </section>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-xs text-ink-secondary">
                {filteredPapers.length} {filteredPapers.length === 1 ? 'paper' : 'papers'}
                {selectedTopic !== 'All' ? ` in ${selectedTopic}` : ''}
                {searchQuery ? ` matching “${searchQuery}”` : ''}
              </p>
              {filtersActive && (
                <Pressable
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTopic('All');
                  }}
                  className="min-h-11 font-sans text-xs font-semibold uppercase tracking-wider text-brand underline underline-offset-4 hover:text-brand-pressed"
                >
                  Clear filters
                </Pressable>
              )}
            </div>

            {loadError && (
              <p role="status" className="mt-4 border-l-2 border-brand bg-surface px-4 py-3 font-sans text-sm text-ink-secondary">
                {loadError}
              </p>
            )}
            {copyError && (
              <p role="alert" className="mt-4 border-l-2 border-danger bg-surface px-4 py-3 font-sans text-sm text-danger">
                {copyError}
              </p>
            )}

            {filteredPapers.length === 0 ? (
              <div className="mt-8 rounded-sm border border-line bg-surface p-8 sm:p-12">
                <FileText className="h-7 w-7 text-ink-secondary" aria-hidden="true" />
                <h2 className="mt-4 font-serif text-2xl font-semibold text-ink">No papers match those filters</h2>
                <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink-secondary">
                  Try a broader search, or clear the topic filter to browse the full archive.
                </p>
                {filtersActive && (
                  <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs">
                    {selectedTopic !== 'All' && (
                      <span className="rounded-sm border border-brand bg-canvas px-2.5 py-1 text-ink">
                        Topic: {selectedTopic}
                      </span>
                    )}
                    {searchQuery && (
                      <span className="rounded-sm border border-brand bg-canvas px-2.5 py-1 text-ink">
                        Query: {searchQuery}
                      </span>
                    )}
                  </div>
                )}
                <Pressable
                  type="button"
                  feedback="lift"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTopic('All');
                  }}
                  className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-brand px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-brand-hover"
                >
                  Show all papers
                </Pressable>
              </div>
            ) : (
              <MotionList data-layout-grid="paper-results" className="mt-6 divide-y divide-line border-y border-line">
                {filteredPapers.map((paper) => {
                  const isSaved = savedIds.includes(paper.id);
                  const isCopied = copiedDoi === paper.id;

                  return (
                    <MotionItem key={paper.id} className="py-8">
                      <article aria-labelledby={`paper-${paper.id}-title`} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-secondary">
                            <span className="font-semibold text-brand">{paper.topic}</span>
                            <span aria-hidden="true">·</span>
                            <span>{paper.journal}</span>
                            <span aria-hidden="true">·</span>
                            <time dateTime={paper.publishedDate}>{paper.publishedDate}</time>
                            <span aria-hidden="true">·</span>
                            <span>{paper.readTime}</span>
                          </p>

                          <h2 id={`paper-${paper.id}-title`} className="mt-2 font-serif text-2xl font-semibold leading-snug text-ink sm:text-3xl">
                            <Link href={`/paper/${paper.slug}`} className="transition-colors hover:text-brand">
                              {paper.title}
                            </Link>
                          </h2>

                          {paper.subtitle && (
                            <p className="mt-2 max-w-3xl font-sans text-base leading-relaxed text-ink-secondary">
                              {paper.subtitle}
                            </p>
                          )}

                          <p className="mt-4 max-w-[65ch] font-sans text-sm leading-relaxed text-ink-secondary">
                            {paper.abstract}
                          </p>

                          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs text-ink-secondary">
                            <span className="font-semibold text-ink">Authors:</span>
                            {paper.authors.map((author, index) => (
                              <span key={`${author.name}-${index}`} className="inline-flex items-center gap-1">
                                <span>{author.name}</span>
                                {author.orcid && (
                                  <>
                                    <GraduationCap className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                                    <span className="sr-only">ORCID {author.orcid}</span>
                                  </>
                                )}
                                {index < paper.authors.length - 1 && <span aria-hidden="true">,</span>}
                              </span>
                            ))}
                          </p>
                        </div>

                        <div className="flex flex-col gap-4 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                          <dl className="grid grid-cols-2 gap-3 font-mono text-xs lg:grid-cols-1">
                            <div>
                              <dt className="uppercase tracking-wider text-ink-secondary">DOI</dt>
                              <dd className="mt-0.5 break-all text-ink">{paper.doi}</dd>
                            </div>
                            <div>
                              <dt className="uppercase tracking-wider text-ink-secondary">Citations</dt>
                              <dd className="mt-0.5 font-semibold text-ink">{paper.citationCount}</dd>
                            </div>
                            <div>
                              <dt className="uppercase tracking-wider text-ink-secondary">License</dt>
                              <dd className="mt-0.5 text-ink">{paper.license}</dd>
                            </div>
                          </dl>

                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/paper/${paper.slug}`}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-ink px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90"
                            >
                              <span>Read the paper</span>
                              <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            <Pressable
                              type="button"
                              onClick={() => handleToggleSave(paper.id)}
                              aria-pressed={isSaved}
                              className={`inline-flex h-11 w-11 items-center justify-center rounded-sm border transition-colors ${
                                isSaved
                                  ? 'border-brand bg-brand text-on-primary'
                                  : 'border-line bg-surface text-ink-secondary hover:bg-surface-subtle hover:text-ink'
                              }`}
                            >
                              <AnimatePresence initial={false} mode="wait">
                                <m.span
                                  key={isSaved ? 'saved' : 'unsaved'}
                                  initial={{ scale: 0.7, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.7, opacity: 0 }}
                                  transition={{ duration: 0.16, ease: [...EASING.enter] }}
                                  className="inline-flex"
                                >
                                  {isSaved ? (
                                    <SuccessCheck size={16} quiet />
                                  ) : (
                                    <Bookmark className="h-4 w-4" aria-hidden="true" />
                                  )}
                                </m.span>
                              </AnimatePresence>
                              <span className="sr-only">
                                {isSaved ? 'Remove from reading list' : 'Save to reading list'}
                              </span>
                            </Pressable>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 font-sans text-xs">
                            <Pressable
                              type="button"
                              onClick={() => handleCopyDoi(paper.doi, paper.id)}
                              className="inline-flex min-h-10 items-center gap-1.5 font-medium text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
                            >
                              <AnimatePresence initial={false} mode="wait">
                                <m.span
                                  key={isCopied ? 'copied' : 'copy'}
                                  initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
                                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                  exit={{ scale: 0.7, opacity: 0, rotate: 10 }}
                                  transition={{ duration: 0.16, ease: [...EASING.emphasize] }}
                                  className="inline-flex text-brand"
                                >
                                  {isCopied ? (
                                    <SuccessCheck size={14} />
                                  ) : (
                                    <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                </m.span>
                              </AnimatePresence>
                              <span aria-live="polite">{isCopied ? 'DOI copied' : 'Copy DOI link'}</span>
                            </Pressable>
                            <Link
                              href={`/cite?article=${encodeURIComponent(paper.slug)}`}
                              className="inline-flex min-h-10 items-center gap-1.5 font-medium text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
                            >
                              <Quote className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Cite</span>
                            </Link>
                          </div>
                        </div>
                      </article>
                    </MotionItem>
                  );
                })}
              </MotionList>
            )}

            <section aria-labelledby="papers-methodology-heading" className="mt-14 border-t border-line pt-8">
              <h2 id="papers-methodology-heading" className="font-serif text-xl font-semibold text-ink">
                Indexing criteria and open bibliographic metadata
              </h2>
              <p className="mt-2 max-w-3xl font-sans text-sm leading-relaxed text-ink-secondary">
                Every entry in the ResearchWithMe paper archive carries persistent DOI linkage, ORCID-verified author
                attribution, and open licensing under Creative Commons Attribution 4.0 International. Papers indexed
                here are paired with independent technical reviews by our{' '}
                <Link href="/authors" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                  verified domain specialists
                </Link>{' '}
                and compiled into{' '}
                <Link href="/editions" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                  printable quarterly PDF compendiums
                </Link>
                . You can generate formatted BibTeX, RIS, APA, MLA, or Chicago references in the{' '}
                <Link href="/cite" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                  citation builder
                </Link>
                , synthesize findings across venues with the{' '}
                <Link href="/assistant" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                  research assistant
                </Link>
                , or review our indexing charter on the{' '}
                <Link href="/about" className="font-medium text-brand underline underline-offset-4 hover:text-brand-pressed">
                  About page
                </Link>
                .
              </p>
            </section>
          </main>

      <BlogFooter />
    </div>
  );
}
