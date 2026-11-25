'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BookOpen, Search, SlidersHorizontal, X } from 'lucide-react';
import { formatDateShort, readingTimeLabel } from '@/lib/content/format';
import { tagToSlug } from '@/lib/content/slug';
import type { PostMeta, TagSummary } from '@/lib/content/types';
import PostCover from './PostCover';

type SortOrder = 'newest' | 'oldest' | 'shortest';

function EssayCard({ post }: { post: PostMeta }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-floating">
      <Link href={post.href} aria-label={`Read: ${post.title}`} className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <PostCover post={post} sizes="(max-width: 768px) 100vw, 50vw" className="rounded-none border-0 transition duration-300 group-hover:scale-[1.015]" />
      </Link>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs text-muted-foreground">
          <time dateTime={post.date}>{formatDateShort(post.date)}</time>
          <span aria-hidden="true" className="text-border-strong">·</span>
          <span>{readingTimeLabel(post.readingTimeMinutes)}</span>
        </div>
        <h3 className="mt-3 font-serif text-xl font-semibold leading-snug tracking-tight text-card-foreground sm:text-2xl">
          <Link href={post.href} className="rounded-sm transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.description}</p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
          <ul aria-label="Topics" className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <li key={tag}>
                <Link
                  href={`/tags/${tagToSlug(tag)}`}
                  className="inline-flex min-h-7 items-center rounded-full bg-muted px-2.5 py-1 font-mono text-[0.6875rem] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}

function SpotlightCard({ post, isLatest }: { post: PostMeta; isLatest: boolean }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-border bg-card shadow-raised">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-between gap-7 p-6 sm:p-8 lg:p-9">
          <div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-primary/10 px-3 font-semibold text-primary">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                {isLatest ? 'Latest essay' : 'First in this view'}
              </span>
              <time dateTime={post.date}>{formatDateShort(post.date)}</time>
              <span aria-hidden="true">·</span>
              <span>{readingTimeLabel(post.readingTimeMinutes)}</span>
            </div>
            <h3 className="mt-5 font-serif text-3xl font-bold leading-[1.08] tracking-tight text-card-foreground text-balance sm:text-4xl">
              <Link href={post.href} className="rounded-sm transition-colors group-hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                {post.title}
              </Link>
            </h3>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{post.description}</p>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <ul aria-label="Topics" className="flex flex-wrap gap-2">
              {post.tags.slice(0, 4).map((tag) => (
                <li key={tag}>
                  <Link
                    href={`/tags/${tagToSlug(tag)}`}
                    className="inline-flex min-h-8 items-center rounded-full border border-border bg-background px-3 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    #{tag}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={post.href} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-sans text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              Read the essay
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <Link href={post.href} aria-label={`Read: ${post.title}`} className="order-first block overflow-hidden p-3 pb-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:order-last lg:p-3">
          <PostCover
            post={post}
            priority
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="h-full min-h-56 rounded-2xl border-0 transition duration-500 group-hover:scale-[1.015] sm:min-h-80 lg:aspect-auto"
          />
        </Link>
      </div>
    </article>
  );
}

export default function ArchiveExplorer({
  posts,
  topics,
}: {
  posts: PostMeta[];
  topics: TagSummary[];
}) {
  const [query, setQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const featuredSlug = posts[0]?.slug;
  const popularTopics = topics.slice(0, 6);

  const visiblePosts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const matches = posts.filter((post) => {
      const matchesTopic = !activeTopic || post.tags.some((tag) => tagToSlug(tag) === activeTopic);
      const searchable = `${post.title} ${post.description} ${post.tags.join(' ')}`.toLocaleLowerCase();
      return matchesTopic && (!needle || searchable.includes(needle));
    });

    return matches.sort((a, b) => {
      if (sortOrder === 'oldest') return a.date.localeCompare(b.date) || a.title.localeCompare(b.title);
      if (sortOrder === 'shortest') {
        return a.readingTimeMinutes - b.readingTimeMinutes || b.date.localeCompare(a.date);
      }
      return b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
    });
  }, [activeTopic, posts, query, sortOrder]);

  const hasFilters = Boolean(query.trim() || activeTopic || sortOrder !== 'newest');
  const firstPost = visiblePosts[0];
  const remainingPosts = visiblePosts.slice(1);

  function clearFilters() {
    setQuery('');
    setActiveTopic(null);
    setSortOrder('newest');
  }

  return (
    <section aria-labelledby="archive-explorer-heading" className="mt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">Browse the notebook</p>
          <h2 id="archive-explorer-heading" className="mt-2 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Explore every essay
          </h2>
        </div>
        <Link href="/tags" className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-full border border-border bg-card px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary sm:self-auto">
          All topics
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem]">
          <label className="relative block">
            <span className="sr-only">Search essays by title, summary, or topic</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the archive…"
              className="h-12 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm text-foreground shadow-xs outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </label>

          <label className="relative block">
            <span className="sr-only">Sort essays</span>
            <SlidersHorizontal className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              className="h-12 w-full appearance-none rounded-xl border border-input bg-background pl-10 pr-4 text-sm font-medium text-foreground shadow-xs outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="shortest">Quick reads</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="mr-1 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Topic</span>
          <div role="group" aria-label="Filter essays by topic" className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={activeTopic === null}
              onClick={() => setActiveTopic(null)}
              className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                activeTopic === null
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-primary'
              }`}
            >
              All <span className="ml-1.5 font-mono opacity-75">{posts.length}</span>
            </button>
            {popularTopics.map((topic) => (
              <button
                key={topic.slug}
                type="button"
                aria-pressed={activeTopic === topic.slug}
                onClick={() => setActiveTopic((current) => (current === topic.slug ? null : topic.slug))}
                className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  activeTopic === topic.slug
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-primary'
                }`}
              >
                {topic.tag} <span className="ml-1.5 font-mono opacity-75">{topic.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex min-h-8 flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="font-mono text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{visiblePosts.length}</span>{' '}
          {visiblePosts.length === 1 ? 'essay' : 'essays'}
          {activeTopic ? <> in <span className="font-semibold text-foreground">#{topics.find((topic) => topic.slug === activeTopic)?.tag}</span></> : null}
        </p>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>

      {firstPost ? (
        <div className="mt-3 space-y-5">
          <SpotlightCard post={firstPost} isLatest={!hasFilters && sortOrder === 'newest' && firstPost.slug === featuredSlug} />
          {remainingPosts.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {remainingPosts.map((post) => <EssayCard key={post.slug} post={post} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-muted-foreground shadow-xs">
            <Search className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-serif text-xl font-semibold text-foreground">No essays found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Try a broader phrase or clear the topic filter to see the full notebook.
          </p>
          <button type="button" onClick={clearFilters} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Reset search
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
