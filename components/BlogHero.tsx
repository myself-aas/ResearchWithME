'use client';

import React from 'react';
import { 
  Search, 
  GitBranch, 
  FileText, 
  Sparkles, 
  TrendingUp, 
  Award,
  BookOpen,
  Filter
} from 'lucide-react';
import { ArticleFormat } from '@/lib/blog-data';

interface BlogHeroProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedFormat: string;
  setSelectedFormat: (f: string) => void;
  totalArticles: number;
}

export default function BlogHero({
  searchQuery,
  setSearchQuery,
  selectedFormat,
  setSelectedFormat,
  totalArticles,
}: BlogHeroProps) {
  const formats: ('All' | ArticleFormat)[] = [
    'All',
    'Paper Review',
    'Repo Teardown',
    'Deep-Dive Essay',
    'Field Notes',
  ];

  return (
    <section className="bg-stone-50 border-b border-stone-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-amber-900 font-sans">
          <span className="w-2 h-2 rounded-full bg-amber-700"></span>
          <span>Independent Scholarly & Technical Blogging · Research Reviews & Code Teardowns</span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="max-w-4xl space-y-3">
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-stone-900 leading-[1.15]">
            Where domain experts review published research, deconstruct code, and dissect modern culture.
          </h1>
          <p className="text-base sm:text-lg text-stone-700 leading-relaxed font-sans max-w-3xl">
            Original long-form essays, GitHub repository teardowns, and analytical breakdowns of peer-reviewed literature across STEM, medicine, sociology, and open infrastructure. No paywalls, no clickbait—just writing worth your time.
          </p>
        </div>

        {/* Search Bar & Live Format Switcher */}
        <div className="pt-2 max-w-3xl space-y-3">
          <div className="relative flex items-center shadow-xs">
            <Search className="w-5 h-5 text-stone-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search across all blog posts, authors, reviewed GitHub repos, or paper DOIs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-xl pl-11 pr-24 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-800/30 focus:border-amber-800 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-20 text-xs text-stone-500 hover:text-stone-800 px-2 py-1 font-sans"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => {
                const el = document.getElementById('articles-feed');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="absolute right-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 px-4 py-2 rounded-lg text-xs font-medium transition-colors font-sans"
            >
              Search
            </button>
          </div>

          {/* Format Filter Bar (Button controls) */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 font-sans text-xs">
            <span className="text-stone-500 font-medium mr-1.5 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Format:</span>
            </span>
            {formats.map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  selectedFormat === fmt
                    ? 'bg-amber-900 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:border-stone-300'
                }`}
              >
                {fmt === 'All' ? 'All Formats' : fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Highlights Bar (Zero-pill, clean typographic dividers) */}
        <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-600 font-sans border-t border-stone-200/80">
          <div>
            <strong className="text-stone-900 font-serif font-bold text-sm mr-1">{totalArticles}</strong> Articles Published
          </div>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <div>
            <strong className="text-stone-900 font-serif font-bold text-sm mr-1">6</strong> Domain Specialists
          </div>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <div>
            <strong className="text-stone-900 font-serif font-bold text-sm mr-1">100%</strong> Independent & Non-commercial
          </div>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <div>
            Open Access under <strong className="text-stone-800">CC BY 4.0</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
