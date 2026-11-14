/**
 * Shared bookmarks (reading list) surface — used by the Next app (app/bookmarks/page.tsx) and the
 * Pages target (cloudflare-pages/src/routes/bookmarks.tsx).
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { ArrowRight, Bookmark, Download, Trash2 } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { BlogPost, INITIAL_BLOG_POSTS } from '@/lib/blog-data';
import { useHydratePreferences, usePreferencesStore } from '@/lib/stores/preferences-store';
import { EASING } from '@/lib/motion/tokens';
import { MotionItem, MotionList } from './motion/MotionList';
import Pressable from './motion/Pressable';
import SuccessCheck from './motion/SuccessCheck';
import { Text, Link as TextLink } from '@/components/primitives';

/**
 * `initialArticles` — the catalogue from the server (metadata only), so the
 * route's HTML is complete without JavaScript. Optional: the Cloudflare Pages
 * build renders this without it and falls back to the client fetch below.
 */
export default function BookmarksPanel({ initialArticles }: { initialArticles?: BlogPost[] } = {}) {
  const hydrated = useHydratePreferences();
  const savedPostIds = usePreferencesStore((state) => state.savedPostIds);
  const removeSavedPost = usePreferencesStore((state) => state.removeSavedPost);
  const clearSavedPosts = usePreferencesStore((state) => state.clearSavedPosts);
  const storagePersisted = usePreferencesStore((state) => state.storagePersisted);

  const [articles, setArticles] = useState<BlogPost[]>(initialArticles ?? INITIAL_BLOG_POSTS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const savedIds = useMemo(() => (hydrated ? savedPostIds : []), [hydrated, savedPostIds]);

  useEffect(() => {
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

  const categories = useMemo(
    () => [...new Set(savedArticles.map((article) => article.category))],
    [savedArticles],
  );
  const filteredArticles = useMemo(
    () =>
      selectedCategory === 'All'
        ? savedArticles
        : savedArticles.filter((article) => article.category === selectedCategory),
    [savedArticles, selectedCategory],
  );

  const totalMinutes = savedArticles.reduce((total, article) => {
    const minutes = Number.parseInt(article.readTime, 10);
    return total + (Number.isFinite(minutes) ? minutes : 0);
  }, 0);

  function handleRemove(article: BlogPost) {
    const okId = removeSavedPost(article.id);
    const okSlug = savedIds.includes(article.slug) ? removeSavedPost(article.slug) : true;
    const ok = okId && okSlug;
    setStatus(ok ? 'Removed from your reading list.' : null);
    setError(ok ? null : 'Your browser blocked local storage, so this change will not persist.');
  }

  function handleClearAll() {
    clearSavedPosts();
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
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader savedCount={savedArticles.length} />

      <main tabIndex={-1} id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <header className="border-b border-line pb-8">
          <Text as="p" variant="eyebrow" color="secondary">
            Local Archive · Persisted on Device
          </Text>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-5xl">
            Your reading list
          </h1>
          <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-ink-secondary">
            Saved manuscripts live in your browser preferences so they survive refreshes without requiring an account.{' '}
            {savedArticles.length > 0
              ? `${savedArticles.length} ${savedArticles.length === 1 ? 'article' : 'articles'}, about ${totalMinutes} minutes of reading.`
              : 'Nothing saved yet.'}
          </p>
        </header>

        {!storagePersisted && !error && (
          <p role="alert" className="mt-4 border-l-2 border-destructive bg-surface px-4 py-3 font-sans text-sm text-destructive">
            Browser storage is currently restricted — changes apply to this tab session only.
          </p>
        )}

        {savedArticles.length === 0 ? (
          <div className="mt-8 rounded-sm border border-line bg-surface p-8 sm:p-12">
            <Bookmark className="h-7 w-7 text-ink-secondary" aria-hidden="true" />
            <Text as="h2" variant="section-title" className="mt-4">Nothing saved yet</Text>
            <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink-secondary">
              Use the bookmark button on any teardown or paper to queue it here for uninterrupted study.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm bg-ink px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90"
            >
              <span>Browse the latest reviews</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <label htmlFor="bookmark-category" className="mr-2 font-sans text-xs font-medium text-ink-secondary">
                  Filter by column
                </label>
                <select
                  id="bookmark-category"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="min-h-11 rounded-sm border border-line bg-surface px-3 font-sans text-sm text-ink"
                >
                  <option value="All">All columns</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Pressable
                  type="button"
                  onClick={handleExport}
                  className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-line bg-surface px-4 py-2 font-sans text-xs font-medium text-ink transition-colors hover:bg-surface-subtle"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>Export Markdown</span>
                </Pressable>
                <AnimatePresence initial={false} mode="wait">
                  {!confirmClear ? (
                    <m.button
                      key="clear-trigger"
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.16, ease: [...EASING.standard] }}
                      className="inline-flex min-h-11 items-center gap-2 rounded-sm px-3 py-2 font-sans text-xs font-medium text-ink-secondary transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span>Clear list</span>
                    </m.button>
                  ) : (
                    <m.span
                      key="clear-confirm"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.16, ease: [...EASING.enter] }}
                      className="flex flex-wrap items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2 font-sans text-xs text-ink"
                    >
                      <span>Remove all {savedArticles.length} saved items?</span>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="min-h-9 font-semibold text-destructive underline underline-offset-4"
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
                    </m.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence initial={false} mode="wait">
              {status && (
                <m.p
                  key={status}
                  role="status"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16, ease: [...EASING.standard] }}
                  className="mt-4 flex items-center gap-2 border-l-2 border-brand bg-surface px-4 py-3 font-sans text-sm text-ink"
                >
                  <SuccessCheck size={16} className="text-brand" />
                  <span>{status}</span>
                </m.p>
              )}
            </AnimatePresence>
            {error && (
              <p role="alert" className="mt-4 border-l-2 border-destructive bg-surface px-4 py-3 font-sans text-sm text-destructive">
                {error}
              </p>
            )}

            {filteredArticles.length === 0 ? (
              <div className="mt-6 rounded-sm border border-line bg-surface p-8">
                <Text as="h2" variant="card-title">No saved articles in this column</Text>
                <p className="mt-2 font-sans text-sm text-ink-secondary">Choose another column or show the full list.</p>
                <Pressable
                  type="button"
                  feedback="lift"
                  onClick={() => setSelectedCategory('All')}
                  className="mt-4 inline-flex min-h-11 items-center rounded-sm bg-brand px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-brand-hover"
                >
                  Show all saved
                </Pressable>
              </div>
            ) : (
              <MotionList className="mt-6 divide-y divide-line border-y border-line">
                {filteredArticles.map((article) => (
                  <MotionItem key={article.id} className="py-6">
                    <article className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-secondary">
                          <span className="font-semibold text-brand">{article.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{article.format}</span>
                          <span aria-hidden="true">·</span>
                          <span>{article.readTime}</span>
                        </p>
                        <h2 className="mt-2 font-serif text-2xl font-semibold leading-snug text-ink">
                          <Link href={`/post/${article.slug}`} className="hover:text-brand">
                            {article.title}
                          </Link>
                        </h2>
                        <p className="mt-2 max-w-prose font-sans text-sm leading-relaxed text-ink-secondary">
                          {article.summary}
                        </p>
                        <p className="mt-3 font-sans text-xs text-ink-secondary">By {article.author.name}</p>
                      </div>

                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <Link
                          href={`/post/${article.slug}`}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-ink px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90"
                        >
                          <span>Read</span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                        <Pressable
                          type="button"
                          onClick={() => handleRemove(article)}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-3 py-2 font-sans text-xs font-medium text-ink-secondary transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Remove</span>
                        </Pressable>
                      </div>
                    </article>
                  </MotionItem>
                ))}
              </MotionList>
            )}
          </>
        )}

        <section aria-labelledby="reading-list-privacy-heading" className="mt-14 border-t border-line pt-8">
          <Text id="reading-list-privacy-heading" as="h2" variant="card-title">
            Local-first bibliography storage and offline export
          </Text>
          <p className="mt-2 max-w-3xl font-sans text-sm leading-relaxed text-ink-secondary">
            Your saved reading list stays entirely in your browser storage—no account registration or cloud telemetry is
            required to bookmark reviews from the{' '}
            <TextLink href="/">home catalog</TextLink>. Export saved items as clean Markdown notes for Obsidian, Notion,
            or lab notebooks, generate structured BibTeX and RIS files in the{' '}
            <TextLink href="/cite">citation builder</TextLink>, or inspect our zero-tracking guarantees in the{' '}
            <TextLink href="/privacy">privacy policy</TextLink>
            . Saved items persist across sessions on this device so you can assemble seminar packets, replication queues,
            and literature review checklists at your own pace without exposing reading habits to third-party servers.
          </p>
        </section>
      </main>

      <BlogFooter />
    </div>
  );
}
