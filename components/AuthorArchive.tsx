'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, FileText, MessageSquare, Quote, Search } from 'lucide-react';
import type { BlogPost } from '@/lib/blog-data';
import { readStringArray, writeLocal } from '@/lib/storage';
import { Text } from '@/components/primitives';

type SortKey = 'newest' | 'likes' | 'readTime';

/**
 * The searchable half of an author page. The page itself is a server component
 * that resolves the profile and its articles from Supabase; this owns only the
 * state that has to live in the browser -- search, filters, sort, and the
 * localStorage reading list.
 */
export default function AuthorArchive({ articles }: { articles: BlogPost[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setSavedIds(readStringArray('rwm_saved_posts'));
  }, []);

  const categories = useMemo(() => [...new Set(articles.map((post) => post.category))], [articles]);
  const formats = useMemo(() => [...new Set(articles.map((post) => post.format))], [articles]);

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = articles.filter((post) => {
      if (selectedCategory !== 'All' && post.category !== selectedCategory) return false;
      if (selectedFormat !== 'All' && post.format !== selectedFormat) return false;
      if (!query) return true;
      const haystack = [
        post.title,
        post.subtitle,
        post.summary,
        ...(post.tags ?? []),
        post.reviewedArtifact?.title ?? '',
        post.reviewedArtifact?.identifier ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    // The previous implementation returned 0 for 'newest', so that option never
    // actually ordered anything.
    const publishedAt = (post: BlogPost) => new Date(post.dateISO ?? post.publishedAt).getTime();

    return [...filtered].sort((a, b) => {
      if (sortBy === 'likes') return (b.likes ?? 0) - (a.likes ?? 0);
      if (sortBy === 'readTime') {
        return Number.parseInt(b.readTime, 10) - Number.parseInt(a.readTime, 10);
      }
      return publishedAt(b) - publishedAt(a);
    });
  }, [articles, searchQuery, selectedCategory, selectedFormat, sortBy]);

  function toggleSave(postId: string) {
    const next = savedIds.includes(postId)
      ? savedIds.filter((item) => item !== postId)
      : [...savedIds, postId];
    setSavedIds(next);
    setSaveMessage(
      writeLocal('rwm_saved_posts', next)
        ? null
        : 'Your browser blocked local storage, so the reading list was not updated.',
    );
    // BlogHeader listens for this to refresh its own saved count.
    window.dispatchEvent(new Event('rwm:reading-list-changed'));
  }

  return (
    <section aria-labelledby="author-archive" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <Text id="author-archive" as="h2" variant="page-title">
          Publication archive
        </Text>
        <p className="text-sm text-ink-secondary">
          {filteredArticles.length} of {articles.length}{' '}
          {articles.length === 1 ? 'article' : 'articles'}
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="mt-6 border border-line bg-surface-raised p-8">
          <FileText className="h-8 w-8 text-ink-secondary" aria-hidden="true" />
          <Text as="h3" variant="card-title" className="mt-3">
            No articles published yet
          </Text>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-ink">
            This contributor has a profile but no published reviews in the current archive. Check
            back after the next editorial cycle.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex min-h-11 items-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover"
          >
            Browse the latest reviews
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="author-article-search" className="mb-1.5 block text-sm font-medium text-ink">
                Search this archive
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-secondary" aria-hidden="true" />
                <input
                  id="author-article-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Title, tag, or artifact"
                  className="h-11 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-sm text-ink placeholder:text-ink-secondary"
                />
              </div>
            </div>

            <div>
              <label htmlFor="author-category" className="mb-1.5 block text-sm font-medium text-ink">
                Category
              </label>
              <select
                id="author-category"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-ink"
              >
                <option value="All">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="author-format" className="mb-1.5 block text-sm font-medium text-ink">
                Format
              </label>
              <select
                id="author-format"
                value={selectedFormat}
                onChange={(event) => setSelectedFormat(event.target.value)}
                className="h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-ink"
              >
                <option value="All">All formats</option>
                {formats.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="author-sort" className="mb-1.5 block text-sm font-medium text-ink">
                Sort
              </label>
              <select
                id="author-sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortKey)}
                className="h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-ink"
              >
                <option value="newest">Newest first</option>
                <option value="likes">Most liked</option>
                <option value="readTime">Longest read</option>
              </select>
            </div>
          </div>

          {saveMessage && (
            <p role="status" className="mt-4 border-l-2 border-brand-hover bg-brand/5 px-4 py-3 text-sm text-brand-pressed">
              {saveMessage}
            </p>
          )}

          {filteredArticles.length === 0 ? (
            <div className="mt-6 border border-line bg-surface-raised p-8">
              <Text as="h3" variant="card-title">
                No articles match those filters
              </Text>
              <p className="mt-2 max-w-xl text-base leading-relaxed text-ink">
                Clear the search text and filters to see this contributor&apos;s full archive.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedFormat('All');
                }}
                className="mt-5 inline-flex min-h-11 items-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-brand-hover"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {filteredArticles.map((post) => {
                const isSaved = savedIds.includes(post.id);
                return (
                  <li key={post.id} className="py-6">
                    <article>
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-secondary">
                        <span className="font-medium text-brand">{post.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.format}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.publishedAt}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.readTime}</span>
                      </p>
                      <h3 className="mt-2 font-serif text-2xl font-semibold leading-snug text-ink">
                        <Link href={`/post/${post.slug}`} className="hover:text-brand">
                          {post.title}
                        </Link>
                      </h3>
                      <p className="mt-2 max-w-prose text-base leading-relaxed text-ink">{post.subtitle}</p>

                      {post.reviewedArtifact && (
                        <p className="mt-3 break-all font-mono text-sm text-ink-secondary">
                          Artifact: {post.reviewedArtifact.identifier}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                        <Link
                          href={`/post/${post.slug}`}
                          className="inline-flex min-h-10 items-center font-semibold text-brand underline-offset-4 hover:underline"
                        >
                          Read the review
                        </Link>
                        <Link
                          href={`/cite?article=${encodeURIComponent(post.slug)}`}
                          className="inline-flex min-h-10 items-center gap-1.5 text-ink underline-offset-4 hover:text-ink hover:underline"
                        >
                          <Quote className="h-4 w-4" aria-hidden="true" />
                          <span>Cite</span>
                        </Link>
                        <span className="inline-flex items-center gap-1.5 text-ink-secondary">
                          <MessageSquare className="h-4 w-4" aria-hidden="true" />
                          <span>{post.commentsCount} comments</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleSave(post.id)}
                          aria-pressed={isSaved}
                          className="inline-flex min-h-10 items-center gap-1.5 text-ink underline-offset-4 hover:text-ink hover:underline"
                        >
                          <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-brand text-brand' : ''}`} aria-hidden="true" />
                          <span>{isSaved ? 'Saved' : 'Save'}</span>
                        </button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
