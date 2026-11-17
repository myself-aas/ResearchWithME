'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BookOpen,
  FileCheck2,
  Link2,
  PlusCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import { CONTRIBUTION_CATALOG, CONTRIBUTION_TYPES, type ContributionType } from '@/lib/v34/contracts';
import type { FeedItem } from '@/lib/v34/feed';
import { formatDate } from '@/lib/formatting/locale';
import ResponsivePaneLayout from '@/components/layout/ResponsivePaneLayout';
import SaveToLibraryButton from './SaveToLibraryButton';

interface ResearchFeedClientProps {
  initialItems: FeedItem[];
  availableTopics: string[];
  sourceCount: number;
}

type TypeFilter = 'all' | 'editorial-article' | ContributionType;

export default function ResearchFeedClient({
  initialItems,
  availableTopics,
  sourceCount,
}: ResearchFeedClientProps) {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<TypeFilter>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialItems.filter((item) => {
      if (selectedType !== 'all' && item.contributionType !== selectedType) return false;
      if (
        selectedTopic !== 'all' &&
        !item.topics.some((t) => t.toLowerCase() === selectedTopic.toLowerCase())
      ) {
        return false;
      }
      if (q) {
        const hay = `${item.title} ${item.summary} ${item.authorName} ${item.topics.join(' ')} ${item.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [initialItems, query, selectedTopic, selectedType]);

  const leftRail = (
    <div className="space-y-5 rounded-lg border border-line bg-surface p-4">
      <div>
        <label htmlFor="feed-search" className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          Search network
        </label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary" aria-hidden="true" />
          <input
            id="feed-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, claim, topic, author…"
            className="h-11 w-full rounded-md border border-line bg-canvas pl-9 pr-3 font-sans text-sm text-ink placeholder:text-ink-secondary focus-visible:outline-2 focus-visible:outline-brand"
          />
        </div>
      </div>

      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          Contribution type
        </p>
        <div className="mt-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            aria-pressed={selectedType === 'all'}
            className={`flex min-h-11 items-center justify-between rounded-md px-3 py-2 text-left font-sans text-sm transition-colors ${
              selectedType === 'all'
                ? 'bg-brand/10 font-semibold text-brand'
                : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'
            }`}
          >
            <span>All contributions</span>
            <span className="font-mono text-xs">{initialItems.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('editorial-article')}
            aria-pressed={selectedType === 'editorial-article'}
            className={`flex min-h-11 items-center justify-between rounded-md px-3 py-2 text-left font-sans text-sm transition-colors ${
              selectedType === 'editorial-article'
                ? 'bg-brand/10 font-semibold text-brand'
                : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'
            }`}
          >
            <span>Editorial Reviews</span>
            <span className="font-mono text-xs">
              {initialItems.filter((i) => i.contributionType === 'editorial-article').length}
            </span>
          </button>
          {CONTRIBUTION_TYPES.map((type) => {
            const count = initialItems.filter((i) => i.contributionType === type).length;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                aria-pressed={selectedType === type}
                className={`flex min-h-11 items-center justify-between rounded-md px-3 py-2 text-left font-sans text-sm transition-colors ${
                  selectedType === type
                    ? 'bg-brand/10 font-semibold text-brand'
                    : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink'
                }`}
              >
                <span className="truncate">{CONTRIBUTION_CATALOG[type].label}</span>
                <span className="font-mono text-xs">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {availableTopics.length > 0 ? (
        <div>
          <label htmlFor="feed-topic" className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary">
            Topic
          </label>
          <select
            id="feed-topic"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-line bg-canvas px-3 font-sans text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand"
          >
            <option value="all">All topics</option>
            {availableTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );

  const rightRail = (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="font-sans text-sm font-semibold text-ink">Publish a contribution</h2>
        <p className="mt-1 font-sans text-xs leading-relaxed text-ink-secondary">
          Contribute paper reviews, tool benchmarks, evidence notes, replications, or method teardowns with verifiable source locators.
        </p>
        <Link
          href="/contribute"
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand px-4 py-2 font-sans text-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          <span>Start contribution</span>
        </Link>
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          Research network snapshot
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-md border border-line bg-canvas p-3">
            <dt className="font-sans text-xs text-ink-secondary">Published items</dt>
            <dd className="mt-1 font-mono text-lg font-semibold text-ink">{initialItems.length}</dd>
          </div>
          <div className="rounded-md border border-line bg-canvas p-3">
            <dt className="font-sans text-xs text-ink-secondary">Canonical sources</dt>
            <dd className="mt-1 font-mono text-lg font-semibold text-ink">{sourceCount}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
          <Link href="/library" className="inline-flex min-h-10 items-center gap-2 font-sans text-xs font-medium text-brand hover:underline">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Open Personal Research Library</span>
          </Link>
          <Link href="/assistant" className="inline-flex min-h-10 items-center gap-2 font-sans text-xs font-medium text-brand hover:underline">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Ask the Research Assistant</span>
          </Link>
        </div>
      </section>
    </div>
  );

  const mainStream = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <p className="font-sans text-sm text-ink-secondary" aria-live="polite">
          Showing <span className="font-semibold text-ink">{filteredItems.length}</span> research{' '}
          {filteredItems.length === 1 ? 'contribution' : 'contributions'}
        </p>
        {(selectedType !== 'all' || selectedTopic !== 'all' || query.trim()) && (
          <button
            type="button"
            onClick={() => {
              setSelectedType('all');
              setSelectedTopic('all');
              setQuery('');
            }}
            className="inline-flex min-h-11 items-center rounded-full px-3 font-sans text-xs font-medium text-brand hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface p-8 text-center">
          <p className="font-sans text-base font-semibold text-ink">No matching contributions yet</p>
          <p className="mt-1 font-sans text-sm text-ink-secondary">
            Try clearing a filter or start the first structured contribution on this topic.
          </p>
          <Link
            href="/contribute"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 py-2 font-sans text-sm font-medium text-canvas hover:opacity-90"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>Contribute now</span>
          </Link>
        </div>
      ) : (
        <ol className="space-y-4">
          {filteredItems.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-line bg-surface p-4 transition-colors hover:border-brand/50 sm:p-5"
            >
              {item.sourceIntegrity !== 'active' ? (
                <div
                  role="alert"
                  className="mb-3 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-sans text-xs font-medium text-destructive"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    Source integrity alert: linked source marked as{' '}
                    <strong className="uppercase">{item.sourceIntegrity}</strong>.
                  </span>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-ink-secondary">
                <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-semibold text-brand">
                  {item.typeLabel}
                </span>
                <span>·</span>
                <Link
                  href={`/profile/${encodeURIComponent(item.authorHandle)}`}
                  className="font-sans font-medium text-ink hover:text-brand hover:underline"
                >
                  {item.authorName}
                </Link>
                <span>·</span>
                <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
              </div>

              <h2 className="mt-2 font-serif text-lg font-semibold leading-snug text-ink sm:text-xl">
                <Link href={item.href} className="hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">
                  {item.title}
                </Link>
              </h2>

              <p className="mt-2 font-sans text-sm leading-relaxed text-ink-secondary">
                {item.summary}
              </p>

              {item.sourceTitle ? (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 font-sans text-xs text-ink-secondary">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  <span className="shrink-0 font-semibold text-ink">Source:</span>
                  {item.sourceHref?.startsWith('/') ? (
                    <Link href={item.sourceHref} className="truncate text-brand hover:underline">
                      {item.sourceTitle}
                    </Link>
                  ) : item.sourceHref ? (
                    <a
                      href={item.sourceHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-brand hover:underline"
                    >
                      {item.sourceTitle}
                    </a>
                  ) : (
                    <span className="truncate">{item.sourceTitle}</span>
                  )}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-ink-secondary">
                  <span className="inline-flex items-center gap-1">
                    <FileCheck2 className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                    {item.evidenceCount} evidence
                  </span>
                  {item.kind === 'contribution' ? (
                    <>
                      <span>{item.recognition.helpfulReviews} helpful</span>
                      <span>{item.recognition.referenced} referenced</span>
                      <span>{item.recognition.saved} saved</span>
                    </>
                  ) : null}
                  {item.topics.slice(0, 2).map((topic) => (
                    <span key={topic} className="rounded-sm bg-surface-subtle px-2 py-0.5 font-sans text-xs text-ink-secondary">
                      {topic}
                    </span>
                  ))}
                </div>

                <SaveToLibraryButton
                  itemType={item.kind}
                  itemId={item.id}
                  title={item.title}
                  url={item.href}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  return (
    <ResponsivePaneLayout
      leftRail={leftRail}
      leftRailTitle="Filter feed"
      main={mainStream}
      rightRail={rightRail}
      rightRailTitle="Network actions"
    />
  );
}
