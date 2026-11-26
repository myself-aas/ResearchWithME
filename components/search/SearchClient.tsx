'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search, X } from 'lucide-react';
import type { SearchDoc, SearchDocLite } from '@/lib/content/types';
import { formatDateShort, readingTimeLabel } from '@/lib/content/format';
import { searchDocs } from '@/lib/search';
import { SITE } from '@/lib/site';

interface SiteDestination {
  href: string;
  label: string;
  description: string;
  keywords: string;
  external?: boolean;
}

const SITE_DESTINATIONS: readonly SiteDestination[] = [
  {
    href: '/blog',
    label: 'Writing',
    description: 'Essays and repository teardowns',
    keywords: 'writing blog archive essays posts',
  },
  {
    href: '/tags',
    label: 'Topics',
    description: 'Browse the archive by topic',
    keywords: 'topics tags categories',
  },
  {
    href: '/lab',
    label: 'Lab',
    description: 'Interactive figures, live with their data',
    keywords: 'lab figures interactive library',
  },
  {
    href: '/assistant',
    label: 'Assistant',
    description: 'Ask the archive, get quoted answers',
    keywords: 'assistant chat ask qa retrieval',
  },
  {
    href: '/about',
    label: 'About',
    description: 'The person behind the site',
    keywords: 'about author bio',
  },
  {
    href: SITE.feedPath,
    label: 'RSS',
    description: 'Subscribe to the RSS 2.0 feed',
    keywords: 'rss feed xml subscribe syndication',
    external: true,
  },
];

/**
 * Search over a build-time index, paired with quick site destinations so
 * secondary routes (`Assistant`, `About`, `RSS`) removed from the top header
 * remain directly reachable in command search.
 *
 * The page arrives with titles, descriptions, and tags inlined, so the first
 * paint already has results and typing filters instantly. Each post's body
 * lives in `/search-index.json` and is fetched on intent (focus, first
 * keystroke); until it lands, matches cover titles and topics. No query is
 * sent anywhere — the index comes to the reader.
 */
export default function SearchClient({
  docs,
  initialQuery = '',
  initialResults = [],
}: {
  docs: SearchDocLite[];
  initialQuery?: string;
  initialResults?: SearchDocLite[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [fullDocs, setFullDocs] = useState<SearchDoc[] | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestedFull = useRef(false);

  const loadFullIndex = useCallback(() => {
    if (requestedFull.current || fullDocs) return;
    requestedFull.current = true;
    setLoadingFull(true);

    fetch('/search-index.json', { headers: { accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`Search index returned ${response.status}`);
        return response.json() as Promise<{ docs: SearchDoc[] }>;
      })
      .then((payload) => setFullDocs(payload.docs))
      .catch(() => {
        // The lite index keeps search working; the next intent retries.
        requestedFull.current = false;
      })
      .finally(() => setLoadingFull(false));
  }, [fullDocs]);

  // Mirror the query into the URL so a search is shareable and reloadable.
  useEffect(() => {
    const trimmed = query.trim();
    const url = new URL(window.location.href);
    if (trimmed) url.searchParams.set('q', trimmed);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, [query]);

  const trimmed = query.trim();
  const corpus = fullDocs ?? docs;
  const total = fullDocs?.length ?? docs.length;

  const matchedDestinations = useMemo(() => {
    if (!trimmed) return SITE_DESTINATIONS;
    const needle = trimmed.toLowerCase();
    return SITE_DESTINATIONS.filter((dest) =>
      `${dest.label} ${dest.description} ${dest.keywords}`.toLowerCase().includes(needle),
    );
  }, [trimmed]);

  const results = useMemo(() => {
    // Keep the server-rendered results identical until the reader changes the
    // query, so hydration cannot reorder the first paint.
    if (trimmed && trimmed === initialQuery && initialResults.length > 0) return initialResults;
    return searchDocs(corpus, trimmed);
  }, [corpus, initialQuery, initialResults, trimmed]);

  return (
    <div>
      <form role="search" action="/search" method="get">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-secondary"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            name="q"
            value={query}
            onFocus={loadFullIndex}
            onChange={(event) => {
              setQuery(event.target.value);
              loadFullIndex();
            }}
            placeholder="Search essays, topics, or site destinations…"
            aria-label="Search posts"
            autoComplete="off"
            className="h-14 w-full rounded-full border border-line bg-surface pl-12 pr-14 font-sans text-base text-ink placeholder:text-ink-secondary focus:border-brand focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 inline-flex h-11 min-h-11 w-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-secondary transition-colors duration-200 ease-standard hover:bg-surface-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </form>

      {matchedDestinations.length > 0 && (
        <nav aria-label="Site destinations" className="mt-4 flex flex-wrap gap-2">
          {matchedDestinations.map((dest) => (
            <Link
              key={dest.href}
              href={dest.href}
              {...(dest.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-4 font-sans text-xs font-medium text-ink-secondary transition-colors duration-200 ease-standard hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
            >
              <span className="font-semibold text-ink">{dest.label}</span>
              <span aria-hidden="true">·</span>
              <span>{dest.description}</span>
              {dest.external && <ArrowUpRight className="h-3.5 w-3.5 text-brand" aria-hidden="true" />}
            </Link>
          ))}
        </nav>
      )}

      <p className="mt-4 font-mono text-xs text-ink-secondary" aria-live="polite">
        {trimmed
          ? `${results.length} ${results.length === 1 ? 'essay' : 'essays'} matching “${trimmed}”`
          : `${total} ${total === 1 ? 'essay' : 'essays'} · newest first`}
        {trimmed && loadingFull && <span className="ml-2">· full text loading…</span>}
      </p>

      {results.length === 0 && matchedDestinations.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="font-serif text-xl font-semibold text-ink">Nothing matched that search.</p>
          <p className="mt-2 font-sans text-sm text-ink-secondary">
            Try a shorter phrase, a topic like “replication”, or browse the{' '}
            <Link href="/blog" className="text-brand underline underline-offset-4">
              archive
            </Link>
            .
          </p>
        </div>
      ) : (
        results.length > 0 && (
          <ul className="mt-6 divide-y divide-line border-t border-line">
            {results.map((doc) => (
              <li key={doc.slug}>
                <Link
                  href={doc.href}
                  className="group grid gap-1 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-6"
                >
                  <span className="font-mono text-xs text-ink-secondary">
                    {formatDateShort(doc.date)}
                    <span className="ml-2 sm:ml-0 sm:mt-1 sm:block">
                      {readingTimeLabel(doc.readingTimeMinutes)}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-serif text-xl font-semibold leading-snug text-ink group-hover:text-brand">
                      {doc.title}
                    </span>
                    <span className="mt-1 block font-sans text-sm leading-relaxed text-ink-secondary">
                      {doc.description}
                    </span>
                    {doc.tags.length > 0 && (
                      <span className="mt-2 block font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
                        {doc.tags.slice(0, 4).map((tag) => `#${tag}`).join('  ')}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
