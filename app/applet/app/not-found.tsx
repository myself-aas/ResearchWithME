'use client';

import Link from 'next/link';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { BookOpen, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900 flex flex-col font-sans antialiased">
      <BlogHeader />

      <main className="flex-1 max-w-3xl mx-auto px-4 py-20 text-center flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center shadow-xs">
          <BookOpen className="w-8 h-8 text-amber-800" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-amber-900 font-semibold bg-amber-100/80 px-2.5 py-1 rounded">
            404 — Page Not Found
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Article or Publication Not Found
          </h1>
          <p className="text-sm sm:text-base text-stone-600 font-serif max-w-md leading-relaxed">
            The requested research manuscript, author profile, or publication portal could not be located in our index.
          </p>
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Articles Feed</span>
          </Link>

          <Link
            href="/papers"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-lg text-xs font-semibold transition-colors"
          >
            <Search className="w-4 h-4 text-stone-500" />
            <span>Browse Research Papers</span>
          </Link>
        </div>
      </main>

      <BlogFooter />
    </div>
  );
}
