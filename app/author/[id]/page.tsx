'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, ChevronRight, FileText, MessageSquare, Quote, Search } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import AuthorProfileCard from '@/components/AuthorProfileCard';
import PageState from '@/components/PageState';
import { AUTHORS, INITIAL_BLOG_POSTS, type BlogPost } from '@/lib/blog-data';
import { readStringArray, writeLocal } from '@/lib/storage';

import AuthorImpactRadarChart from '@/components/AuthorImpactRadarChart';

type SortKey = 'newest' | 'likes' | 'readTime';

export default function AuthorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const author = AUTHORS[id] ??
    Object.values(AUTHORS).find(
      (candidate) =>
        candidate.id.toLowerCase() === id.toLowerCase() ||
        candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === id.toLowerCase(),
    );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [livePosts, setLivePosts] = useState<BlogPost[] | null>(null);

  // Bundled posts render immediately; the archive is then refreshed from the
  // publication API so editor-published CMS articles appear on the profile.
  useEffect(() => {
    if (!author) return;
    const controller = new AbortController();
    async function loadArchive() {
      try {
        const res = await fetch(`/api/articles?limit=100&author=${encodeURIComponent(author.id)}`, {
          headers: { accept: 'application/json' },
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data: { articles?: BlogPost[] } = await res.json();
        if (Array.isArray(data.articles)) setLivePosts(data.articles);
      } catch {
        // Keep the bundled archive when the API is unreachable.
      }
    }
    loadArchive();
    return () => controller.abort();
  }, [author]);

  const articles = useMemo(() => {
    if (!author) return [];
    const source = livePosts ?? INITIAL_BLOG_POSTS;
    return source.filter((post) => post.author.id === author.id || post.author.name === author.name);
  }, [author, livePosts]);

  const categories = useMemo(() => [...new Set(articles.map((post) => post.category))], [articles]);
  const formats = useMemo(() => [...new Set(articles.map((post) => post.format))], [articles]);

  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return articles
      .filter((post) => {
        if (selectedCategory !== 'All' && post.category !== selectedCategory) return false;
        if (selectedFormat !== 'All' && post.format !== selectedFormat) return false;
        if (!query) return true;
        return [post.title, post.subtitle, post.summary, ...post.tags, post.reviewedArtifact?.identifier ?? ''].some((value) =>
          value.toLowerCase().includes(query),
        );
      })
      .sort((a, b) => {
        if (sortBy === 'likes') return b.likes - a.likes;
        if (sortBy === 'readTime') return Number.parseInt(b.readTime, 10) - Number.parseInt(a.readTime, 10);
        return 0;
      });
  }, [articles, searchQuery, selectedCategory, selectedFormat, sortBy]);

  const metrics = useMemo(
    () => ({
      totalArticles: articles.length,
      totalLikes: articles.reduce((total, post) => total + post.likes, 0),
      totalComments: articles.reduce((total, post) => total + post.commentsCount, 0),
      reviewedArtifactsCount: articles.filter((post) => post.reviewedArtifact).length,
    }),
    [articles],
  );

  if (!author) {
    return (
      <div className="flex min-h-dvh flex-col bg-stone-50">
        <BlogHeader />
        <PageState
          code="404"
          title="Author not found"
          description="No contributor profile matches this address. The profile may have moved, or the link may be incomplete."
          primaryAction={{ href: '/authors', label: 'Browse all authors' }}
          secondaryAction={{ href: '/', label: 'Return to the journal' }}
        />
        <BlogFooter />
      </div>
    );
  }

  function toggleSave(postId: string) {
    const current = readStringArray('rwm_saved_posts');
    const next = current.includes(postId) ? current.filter((item) => item !== postId) : [...current, postId];
    setSavedIds(next);
    setSaveMessage(writeLocal('rwm_saved_posts', next) ? null : 'Your browser blocked local storage, so the reading list was not updated.');
  }

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <BlogHeader savedCount={savedIds.length} />

      <main id="main-content" className="page-container page-main max-w-focus flex-1">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-stone-600">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-stone-900 hover:underline">
                Journal
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-stone-500" />
            </li>
            <li>
              <Link href="/authors" className="hover:text-stone-900 hover:underline">
                Authors
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-4 w-4 text-stone-500" />
            </li>
            <li aria-current="page" className="font-medium text-stone-900">
              {author.name}
            </li>
          </ol>
        </nav>

        <AuthorProfileCard author={author} metrics={metrics} headingLevel="h1" />

        <AuthorImpactRadarChart
          author={author}
          articleCount={metrics.totalArticles}
          totalLikes={metrics.totalLikes}
          totalComments={metrics.totalComments}
        />

        <section aria-labelledby="author-archive" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-4">
            <h2 id="author-archive" className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
              Published reviews
            </h2>
            <p className="text-sm text-stone-600">
              {filteredArticles.length} of {articles.length} {articles.length === 1 ? 'review' : 'reviews'}
            </p>
          </div>

          {articles.length === 0 ? (
            <div className="mt-6 border border-stone-200 bg-white p-8">
              <FileText className="h-8 w-8 text-stone-500" aria-hidden="true" />
              <h3 className="mt-3 font-serif text-xl font-semibold text-stone-900">No published reviews yet</h3>
              <p className="mt-2 max-w-xl text-base leading-relaxed text-stone-700">
                This contributor&apos;s profile is on file, but nothing is published here yet.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex min-h-11 items-center rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
              >
                Browse the latest reviews
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label htmlFor="author-article-search" className="mb-1.5 block text-sm font-medium text-stone-800">
                    Search these reviews
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-600" aria-hidden="true" />
                    <input
                      id="author-article-search"
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Title, tag, or artifact"
                      className="h-11 w-full rounded-md border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-600"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="author-category" className="mb-1.5 block text-sm font-medium text-stone-800">
                    Category
                  </label>
                  <select
                    id="author-category"
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900"
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
                  <label htmlFor="author-format" className="mb-1.5 block text-sm font-medium text-stone-800">
                    Format
                  </label>
                  <select
                    id="author-format"
                    value={selectedFormat}
                    onChange={(event) => setSelectedFormat(event.target.value)}
                    className="h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900"
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
                  <label htmlFor="author-sort" className="mb-1.5 block text-sm font-medium text-stone-800">
                    Sort
                  </label>
                  <select
                    id="author-sort"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortKey)}
                    className="h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900"
                  >
                    <option value="newest">Newest first</option>
                    <option value="likes">Most liked</option>
                    <option value="readTime">Longest read</option>
                  </select>
                </div>
              </div>

              {saveMessage && (
                <p role="status" className="rounded-md mt-4 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  {saveMessage}
                </p>
              )}

              {filteredArticles.length === 0 ? (
                <div className="mt-6 border border-stone-200 bg-white p-8">
                  <h3 className="font-serif text-xl font-semibold text-stone-900">No reviews match those filters</h3>
                  <p className="mt-2 max-w-xl text-base leading-relaxed text-stone-700">
                    Clear the search text and filters to see this contributor&apos;s full archive.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setSelectedFormat('All');
                    }}
                    className="mt-5 inline-flex min-h-11 items-center rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <ul className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
                  {filteredArticles.map((post: BlogPost) => {
                    const isSaved = savedIds.includes(post.id);
                    return (
                      <li key={post.id} className="py-6">
                        <article>
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600">
                            <span className="font-medium text-amber-900">{post.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{post.format}</span>
                            <span aria-hidden="true">·</span>
                            <span>{post.publishedAt}</span>
                            <span aria-hidden="true">·</span>
                            <span>{post.readTime}</span>
                          </p>
                          <h3 className="mt-2 font-serif text-2xl font-semibold leading-snug text-stone-900">
                            <Link href={`/post/${post.slug}`} className="hover:text-amber-900">
                              {post.title}
                            </Link>
                          </h3>
                          <p className="mt-2 max-w-prose text-base leading-relaxed text-stone-700">{post.subtitle}</p>

                          {post.reviewedArtifact && (
                            <p className="mt-3 break-all font-mono text-sm text-stone-600">
                              Artifact: {post.reviewedArtifact.identifier}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                            <Link
                              href={`/post/${post.slug}`}
                              className="inline-flex min-h-10 items-center font-semibold text-amber-900 underline-offset-4 hover:underline"
                            >
                              Read the review
                            </Link>
                            <Link
                              href={`/cite?article=${encodeURIComponent(post.slug)}`}
                              className="inline-flex min-h-10 items-center gap-1.5 text-stone-700 underline-offset-4 hover:text-stone-900 hover:underline"
                            >
                              <Quote className="h-4 w-4" aria-hidden="true" />
                              <span>Cite</span>
                            </Link>
                            <span className="inline-flex items-center gap-1.5 text-stone-600">
                              <MessageSquare className="h-4 w-4" aria-hidden="true" />
                              <span>{post.commentsCount} comments</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSave(post.id)}
                              aria-pressed={isSaved}
                              className="inline-flex min-h-10 items-center gap-1.5 text-stone-700 underline-offset-4 hover:text-stone-900 hover:underline"
                            >
                              <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-amber-900 text-amber-900' : ''}`} aria-hidden="true" />
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
      </main>

      <BlogFooter />
    </div>
  );
}
