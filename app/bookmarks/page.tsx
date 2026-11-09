'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bookmark, Check, Download, Trash2 } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { BlogPost, INITIAL_BLOG_POSTS } from '@/lib/blog-data';
import { readStringArray, removeLocal, writeLocal } from '@/lib/storage';

const SAVED_KEY = 'rwm_saved_posts';

export default function BookmarksPage() {
  const [articles, setArticles] = useState<BlogPost[]>(INITIAL_BLOG_POSTS);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setSavedIds(readStringArray(SAVED_KEY));
    let active = true;
    async function load() {
      try {
        const res = await fetch('/api/articles', { headers: { accept: 'application/json' } });
        if (!res.ok) return;
        const data: { articles?: BlogPost[] } = await res.json();
        if (active && Array.isArray(data.articles) && data.articles.length > 0) {
          setArticles(data.articles);
        }
      } catch {
        // Bundled articles remain available when the API is unreachable.
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const savedArticles = useMemo(
    () => articles.filter((article) => savedIds.includes(article.id) || savedIds.includes(article.slug)),
    [articles, savedIds],
  );

  const categories = useMemo(() => [...new Set(savedArticles.map((article) => article.category))], [savedArticles]);
  const filteredArticles = useMemo(
    () => (selectedCategory === 'All' ? savedArticles : savedArticles.filter((article) => article.category === selectedCategory)),
    [savedArticles, selectedCategory],
  );

  const totalMinutes = savedArticles.reduce((total, article) => {
    const minutes = Number.parseInt(article.readTime, 10);
    return total + (Number.isFinite(minutes) ? minutes : 0);
  }, 0);

  function handleRemove(id: string) {
    const updated = savedIds.filter((item) => item !== id);
    setSavedIds(updated);
    const stored = writeLocal(SAVED_KEY, updated);
    setStatus(stored ? 'Removed from your reading list.' : null);
    setError(stored ? null : 'Your browser blocked local storage, so this change will not persist.');
  }

  function handleClearAll() {
    setSavedIds([]);
    removeLocal(SAVED_KEY);
    setConfirmClear(false);
    setStatus('Reading list cleared. Saved items are gone from this device.');
  }

  function handleExport() {
    const exportedOn = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date());
    const markdown = [
      '# ResearchWithMe reading list',
      '',
      `Exported ${exportedOn}. ${savedArticles.length} articles, about ${totalMinutes} minutes of reading.`,
      '',
      ...savedArticles.map((article, index) =>
        [
          `${index + 1}. [${article.title}](https://researchwith.me/post/${article.slug})`,
          `   - ${article.author.name} · ${article.category} · ${article.readTime}`,
          `   - ${article.summary}`,
          '',
        ].join('\n'),
      ),
    ].join('\n');

    try {
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'researchwithme-reading-list.md';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setError(null);
      setStatus('Reading list downloaded as Markdown.');
    } catch {
      setError('The download could not start. Check your browser download permissions and try again.');
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <BlogHeader savedCount={savedIds.length} />

      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <header className="border-b border-stone-200 pb-8">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-5xl">Your reading list</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-700">
            Saved articles live in this browser only, so they survive a refresh but not a device change. {savedArticles.length > 0
              ? `${savedArticles.length} ${savedArticles.length === 1 ? 'article' : 'articles'}, about ${totalMinutes} minutes of reading.`
              : 'Nothing saved yet.'}
          </p>
        </header>

        {savedArticles.length === 0 ? (
          <div className="mt-8 border border-stone-200 bg-white p-8 sm:p-12">
            <Bookmark className="h-8 w-8 text-stone-500" aria-hidden="true" />
            <h2 className="mt-4 font-serif text-2xl font-semibold text-stone-900">Nothing saved yet</h2>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-stone-700">
              Use the bookmark button on any article or paper to keep it here for later. The list stays on this device.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <span>Browse the latest reviews</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
              <div>
                <label htmlFor="bookmark-category" className="mr-2 text-sm font-medium text-stone-800">
                  Filter by field
                </label>
                <select
                  id="bookmark-category"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900"
                >
                  <option value="All">All fields</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-stone-400"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>Export Markdown</span>
                </button>
                {!confirmClear ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span>Clear list</span>
                  </button>
                ) : (
                  <span className="flex flex-wrap items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                    <span>Remove all {savedArticles.length} saved items?</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="min-h-9 font-semibold underline underline-offset-4"
                    >
                      Yes, clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="min-h-9 underline underline-offset-4"
                    >
                      Keep them
                    </button>
                  </span>
                )}
              </div>
            </div>

            {status && (
              <p role="status" className="mt-4 flex items-center gap-2 border-l-2 border-emerald-700 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>{status}</span>
              </p>
            )}
            {error && (
              <p role="alert" className="mt-4 border-l-2 border-red-800 bg-red-50 px-4 py-3 text-sm text-red-900">
                {error}
              </p>
            )}

            {filteredArticles.length === 0 ? (
              <div className="mt-6 border border-stone-200 bg-white p-8">
                <h2 className="font-serif text-xl font-semibold text-stone-900">No saved articles in this field</h2>
                <p className="mt-2 text-base text-stone-700">Choose another field or show the full list.</p>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className="mt-4 inline-flex min-h-11 items-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  Show all saved
                </button>
              </div>
            ) : (
              <ul className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
                {filteredArticles.map((article) => (
                  <li key={article.id} className="py-6">
                    <article className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600">
                          <span className="font-medium text-brand">{article.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{article.format}</span>
                          <span aria-hidden="true">·</span>
                          <span>{article.readTime}</span>
                        </p>
                        <h2 className="mt-2 font-serif text-2xl font-semibold leading-snug text-stone-900">
                          <Link href={`/post/${article.slug}`} className="hover:text-brand">
                            {article.title}
                          </Link>
                        </h2>
                        <p className="mt-2 max-w-prose text-base leading-relaxed text-stone-700">{article.summary}</p>
                        <p className="mt-3 text-sm text-stone-600">By {article.author.name}</p>
                      </div>

                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <Link
                          href={`/post/${article.slug}`}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                        >
                          <span>Read</span>
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleRemove(article.id)}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-red-300 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      <BlogFooter />
    </div>
  );
}
