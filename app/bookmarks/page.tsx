'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { 
  Bookmark, 
  Trash2, 
  ArrowRight, 
  Clock, 
  Download, 
  ArrowLeft, 
  BookOpen, 
  Check, 
  Share2 
} from 'lucide-react';
import { BlogPost, INITIAL_BLOG_POSTS } from '@/lib/blog-data';

export default function BookmarksPage() {
  const [allArticles, setAllArticles] = useState<BlogPost[]>(INITIAL_BLOG_POSTS);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedExport, setCopiedExport] = useState(false);

  // Load articles & saved IDs
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/articles');
        if (res.ok) {
          const data = await res.json();
          if (data.articles) setAllArticles(data.articles);
        }
      } catch (e) {
        console.warn('Failed to load articles:', e);
      }

      try {
        const stored = localStorage.getItem('rwm_saved_posts');
        if (stored) {
          setSavedIds(JSON.parse(stored));
        } else {
          setSavedIds(['post-1', 'post-2']);
        }
      } catch (e) {
        console.warn('Failed to load bookmarks:', e);
      }
    }
    load();
  }, []);

  const savedArticles = allArticles.filter((a) => savedIds.includes(a.id) || savedIds.includes(a.slug));

  const filteredArticles = selectedCategory === 'All'
    ? savedArticles
    : savedArticles.filter((a) => a.category === selectedCategory);

  const totalMinutes = savedArticles.reduce((acc, a) => {
    const mins = parseInt(a.readTime.split(' ')[0], 10) || 5;
    return acc + mins;
  }, 0);

  const handleRemove = (id: string) => {
    const updated = savedIds.filter((item) => item !== id);
    setSavedIds(updated);
    try {
      localStorage.setItem('rwm_saved_posts', JSON.stringify(updated));
    } catch (e) {
      console.warn(e);
    }
  };

  const handleClearAll = () => {
    setSavedIds([]);
    try {
      localStorage.removeItem('rwm_saved_posts');
    } catch (e) {
      console.warn(e);
    }
  };

  const handleExportMarkdown = () => {
    const md = `# ResearchWithMe Saved Reading List\n\nExported on ${new Date().toLocaleDateString()}\nTotal articles: ${savedArticles.length} (${totalMinutes} min read)\n\n` +
      savedArticles.map((a, i) => 
        `${i + 1}. **[${a.title}](https://researchwith.me/post/${a.slug})**\n   - By ${a.author.name} · ${a.category} · ${a.readTime}\n   - ${a.summary}\n`
      ).join('\n');

    navigator.clipboard.writeText(md);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  };

  return (
    <div className="min-h-screen bg-white text-stone-900 flex flex-col font-sans antialiased selection:bg-amber-900 selection:text-white">
      <BlogHeader savedCount={savedIds.length} />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-6 font-sans">
          <Link href="/" className="hover:text-stone-900 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Feed</span>
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-amber-900">Personal Reading List</span>
        </div>

        {/* Header Banner */}
        <div className="border-b border-stone-200 pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 mb-1">
              <Bookmark className="w-4 h-4 fill-amber-900" />
              <span>Offline Reading Queue</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight">
              Saved Articles & Bookmarks
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 font-sans mt-1">
              {savedArticles.length} {savedArticles.length === 1 ? 'article' : 'articles'} queued · Estimated reading time: <strong className="text-stone-800">{totalMinutes} mins</strong>
            </p>
          </div>

          {savedArticles.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportMarkdown}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg text-xs font-medium text-stone-800 transition-colors"
                title="Copy reading bibliography as Markdown"
              >
                {copiedExport ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied Markdown!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Export Reading List</span>
                  </>
                )}
              </button>

              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-500 hover:text-red-700 font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Stream */}
        {savedArticles.length === 0 ? (
          <div className="text-center py-20 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
            <Bookmark className="w-12 h-12 text-stone-300 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-stone-900">
              Your reading queue is empty
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
              When browsing the articles stream, click the bookmark icon on any paper review or repo teardown to save it for offline and focused reading.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Explore Articles Feed</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="p-5 sm:p-6 bg-white border border-stone-200 rounded-2xl hover:border-stone-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <span className="font-semibold text-amber-900">{article.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{article.format}</span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTime}
                    </span>
                  </div>

                  <Link
                    href={`/post/${article.slug}`}
                    className="font-serif text-lg sm:text-xl font-bold text-stone-900 group-hover:text-amber-900 transition-colors block leading-snug"
                  >
                    {article.title}
                  </Link>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {article.summary}
                  </p>

                  <div className="text-xs text-stone-500 pt-1">
                    Written by <strong className="text-stone-700">{article.author.name}</strong> ({article.author.role})
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:border-l sm:border-stone-100 sm:pl-6 shrink-0 justify-between sm:justify-start">
                  <button
                    onClick={() => handleRemove(article.id)}
                    className="p-2 text-stone-400 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <Link
                    href={`/post/${article.slug}`}
                    className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors"
                  >
                    <span>Read Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BlogFooter onCategorySelect={() => {}} onOpenWriteModal={() => {}} />
    </div>
  );
}
