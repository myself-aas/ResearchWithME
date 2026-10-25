'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  GitBranch, 
  FileText, 
  Bookmark, 
  Heart, 
  MessageSquare, 
  ArrowRight,
  BookOpen,
  Cpu,
  Activity,
  Globe,
  BarChart3,
  Sparkles,
  Layers,
  Filter,
  Check
} from 'lucide-react';
import { BlogPost, BlogCategory } from '@/lib/blog-data';

export interface CategoryHeaderConfig {
  id: string;
  name: BlogCategory;
  title: string;
  badge: string;
  thumbnail: string;
  description: string;
  tags: string[];
  gradient: string;
  accentColor: string;
  badgeColor: string;
}

export const CATEGORY_HEADER_DATA: Record<BlogCategory, CategoryHeaderConfig> = {
  'Research Reviews': {
    id: 'research-reviews',
    name: 'Research Reviews',
    title: 'Research Reviews & Literature Breakdowns',
    badge: 'Peer Literature',
    thumbnail: 'https://picsum.photos/seed/research-reviews-banner/800/400',
    description: 'Analytical audits of primary literature, peer-review critiques, and empirical replication notes across computer science, AI safety, and quantitative economics.',
    tags: ['Methodology Audits', 'Empirical Replication', 'Meta-Analyses'],
    gradient: 'from-amber-950/90 via-stone-900/90 to-stone-950',
    accentColor: 'text-amber-400 border-amber-500/30',
    badgeColor: 'bg-amber-900/90 text-amber-200 border-amber-700/50',
  },
  'GitHub Repo Teardowns': {
    id: 'github-repo-teardowns',
    name: 'GitHub Repo Teardowns',
    title: 'GitHub Repo Teardowns & Systems Code Audits',
    badge: 'Code & Infrastructure',
    thumbnail: 'https://picsum.photos/seed/github-teardown-banner/800/400',
    description: 'Deep codebase architecture inspections, KV cache memory profiling, and high-performance C++/Rust runtime teardowns.',
    tags: ['vLLM Architecture', 'Distributed Consensus', 'GPU Profiling'],
    gradient: 'from-slate-950/90 via-stone-900/90 to-stone-950',
    accentColor: 'text-sky-400 border-sky-500/30',
    badgeColor: 'bg-sky-950/90 text-sky-200 border-sky-700/50',
  },
  'STEM & Tech': {
    id: 'stem-tech',
    name: 'STEM & Tech',
    title: 'STEM & Applied Engineering Column',
    badge: 'Applied Engineering',
    thumbnail: 'https://picsum.photos/seed/stem-tech-banner/800/400',
    description: 'Hardware architecture breakdowns, semiconductor lithography, quantum computing runtimes, and robotics engineering.',
    tags: ['EUV Lithography', 'Quantum Runtimes', 'Robotics Hardware'],
    gradient: 'from-emerald-950/90 via-stone-900/90 to-stone-950',
    accentColor: 'text-emerald-400 border-emerald-500/30',
    badgeColor: 'bg-emerald-950/90 text-emerald-200 border-emerald-700/50',
  },
  'Health & Medicine': {
    id: 'health-medicine',
    name: 'Health & Medicine',
    title: 'Health & Medical Science Analyses',
    badge: 'Biomedical Science',
    thumbnail: 'https://picsum.photos/seed/health-medicine-banner/800/400',
    description: 'Clinical trial audits, GLP-1 receptor agonist pathways, CRISPR gene editing, and biotherapeutic delivery vectors.',
    tags: ['GLP-1 Pathways', 'CRISPR Cas12f', 'Oncology Trials'],
    gradient: 'from-rose-950/90 via-stone-900/90 to-stone-950',
    accentColor: 'text-rose-400 border-rose-500/30',
    badgeColor: 'bg-rose-950/90 text-rose-200 border-rose-700/50',
  },
  'Sociology & Culture': {
    id: 'sociology-culture',
    name: 'Sociology & Culture',
    title: 'Sociology & Academic Publishing Economics',
    badge: 'Human Systems',
    thumbnail: 'https://picsum.photos/seed/sociology-culture-banner/800/400',
    description: 'Empirical studies on scientific publishing economics, Diamond Open Access models, and digital labor dynamics.',
    tags: ['Open Access Economics', 'Peer-Review Incentives', 'Digital Labor'],
    gradient: 'from-purple-950/90 via-stone-900/90 to-stone-950',
    accentColor: 'text-purple-400 border-purple-500/30',
    badgeColor: 'bg-purple-950/90 text-purple-200 border-purple-700/50',
  },
  'Data & Policy': {
    id: 'data-policy',
    name: 'Data & Policy',
    title: 'Data Science & Public Technology Policy',
    badge: 'Governance & Data',
    thumbnail: 'https://picsum.photos/seed/data-policy-banner/800/400',
    description: 'In-depth research bridging quantitative data science, algorithmic accountability, EU AI Act compliance, and synthetic data rights.',
    tags: ['AI Act Governance', 'Synthetic Data Rights', 'Differential Privacy'],
    gradient: 'from-blue-950/90 via-stone-900/90 to-stone-950',
    accentColor: 'text-blue-400 border-blue-500/30',
    badgeColor: 'bg-blue-950/90 text-blue-200 border-blue-700/50',
  },
};

export const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Research Reviews':
      return <BookOpen className="w-4 h-4" />;
    case 'GitHub Repo Teardowns':
      return <GitBranch className="w-4 h-4" />;
    case 'STEM & Tech':
      return <Cpu className="w-4 h-4" />;
    case 'Health & Medicine':
      return <Activity className="w-4 h-4" />;
    case 'Sociology & Culture':
      return <Globe className="w-4 h-4" />;
    case 'Data & Policy':
      return <BarChart3 className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

interface ArticleFeedProps {
  posts: BlogPost[];
  savedPostIds: string[];
  onToggleSave: (postId: string) => void;
  onLikePost: (postId: string) => void;
  selectedCategory: string;
  selectedFormat: string;
  searchQuery: string;
  onClearFilters: () => void;
  onSelectCategory?: (category: string) => void;
}

export default function ArticleFeed({
  posts,
  savedPostIds,
  onToggleSave,
  onLikePost,
  selectedCategory,
  selectedFormat,
  searchQuery,
  onClearFilters,
  onSelectCategory,
}: ArticleFeedProps) {
  const activeCategoryMeta = selectedCategory !== 'All' && selectedCategory in CATEGORY_HEADER_DATA
    ? CATEGORY_HEADER_DATA[selectedCategory as BlogCategory]
    : null;

  return (
    <section id="articles-feed" className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Category Header Showcase Cards Grid (when viewing 'All' and no active search) */}
      {selectedCategory === 'All' && !searchQuery && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-900 font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-800" />
                <span>Topic Domains & Section Portals</span>
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                Explore Specialized Research Columns
              </h2>
            </div>
            <span className="text-xs text-stone-500 font-mono hidden sm:inline">
              Select category section to filter
            </span>
          </div>

          {/* 6 Category Header Thumbnail Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(CATEGORY_HEADER_DATA).map(([catName, meta]) => {
              const categoryPostCount = posts.filter((p) => p.category === catName).length;

              return (
                <div
                  key={catName}
                  onClick={() => onSelectCategory && onSelectCategory(catName)}
                  className="group relative rounded-xl overflow-hidden border border-stone-200/80 bg-stone-900 cursor-pointer shadow-2xs hover:shadow-md hover:border-amber-400/50 transition-all flex flex-col justify-between h-48"
                >
                  {/* Category Unique Header Thumbnail Background Image */}
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={meta.thumbnail}
                      alt={meta.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                      referrerPolicy="no-referrer"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${meta.gradient}`} />
                  </div>

                  {/* Top Bar: Icon & Badge */}
                  <div className="relative z-10 p-4 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border backdrop-blur-md font-mono ${meta.badgeColor}`}>
                      {getCategoryIcon(catName)}
                      <span>{meta.badge}</span>
                    </span>

                    <span className="text-[11px] font-mono text-stone-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs font-semibold">
                      {categoryPostCount} {categoryPostCount === 1 ? 'Article' : 'Articles'}
                    </span>
                  </div>

                  {/* Bottom Bar: Title & Tags */}
                  <div className="relative z-10 p-4 space-y-1.5 font-sans">
                    <h3 className="font-serif text-lg font-bold text-white group-hover:text-amber-300 transition-colors flex items-center justify-between">
                      <span>{meta.name}</span>
                      <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-300 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
                      {meta.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Focused Category Section Header Banner (when a specific category is selected) */}
      {activeCategoryMeta && (
        <div className="relative rounded-2xl overflow-hidden border border-stone-800 bg-stone-900 shadow-md">
          {/* Header Unique Background Thumbnail */}
          <div className="absolute inset-0 z-0">
            <Image
              src={activeCategoryMeta.thumbnail}
              alt={activeCategoryMeta.name}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-40"
              referrerPolicy="no-referrer"
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${activeCategoryMeta.gradient}`} />
          </div>

          <div className="relative z-10 p-6 sm:p-8 space-y-4 text-stone-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-4">
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-lg border backdrop-blur-md bg-stone-950/80 ${activeCategoryMeta.accentColor}`}>
                  {getCategoryIcon(activeCategoryMeta.name)}
                </span>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-semibold block">
                    Category Section Focus
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                    {activeCategoryMeta.title}
                  </h2>
                </div>
              </div>

              <button
                onClick={onClearFilters}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-medium transition-colors"
              >
                <span>View All Categories</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-stone-300 font-serif leading-relaxed max-w-3xl">
              {activeCategoryMeta.description}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="text-stone-400">Section Scope:</span>
              {activeCategoryMeta.tags.map((tag) => (
                <span key={tag} className="bg-stone-800/90 text-stone-200 px-2.5 py-0.5 rounded border border-stone-700">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Feed Sub-Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200">
        <div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>{selectedCategory === 'All' ? 'Complete Article Catalogue' : `${selectedCategory} Articles`}</span>
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 font-sans mt-0.5">
            {posts.length} {posts.length === 1 ? 'article' : 'articles'} found
            {selectedFormat !== 'All' ? ` in ${selectedFormat}` : ''}
            {searchQuery ? ` matching "${searchQuery}"` : ''}
          </p>
        </div>

        {(selectedCategory !== 'All' || selectedFormat !== 'All' || searchQuery) && (
          <button
            onClick={onClearFilters}
            className="text-xs text-amber-900 hover:text-amber-950 font-medium underline underline-offset-4"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Empty State */}
      {posts.length === 0 ? (
        <div className="text-center py-20 bg-stone-50 border border-stone-200 rounded-2xl">
          <BookOpen className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <h3 className="font-serif text-lg font-bold text-stone-900">
            No articles match this criteria
          </h3>
          <p className="text-xs text-stone-500 font-sans mt-1 max-w-sm mx-auto leading-relaxed">
            Try resetting your search query or selecting &quot;All Articles&quot; to see our complete technical and scholarly catalogue.
          </p>
          <button
            onClick={onClearFilters}
            className="mt-4 bg-stone-900 hover:bg-stone-800 text-stone-50 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Articles Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => {
            const isSaved = savedPostIds.includes(post.id) || savedPostIds.includes(post.slug);
            const meta = CATEGORY_HEADER_DATA[post.category as BlogCategory];

            return (
              <article
                key={post.id}
                className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs hover:border-stone-300 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Article Card Top Thumbnail with Category Overlay Badge */}
                  <Link href={`/post/${post.slug}`} className="relative h-44 w-full bg-stone-900 overflow-hidden block">
                    <Image
                      src={post.coverImage && post.coverImage.trim() !== '' ? post.coverImage : (meta?.thumbnail || '/images/folio-hero.jpeg')}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                    
                    {/* Format Pill */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="bg-stone-900/90 text-stone-100 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-xs font-sans border border-stone-700/50">
                        {post.format}
                      </span>
                    </div>

                    {/* Bookmark quick button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleSave(post.id);
                      }}
                      className={`absolute top-3 right-3 p-1.5 rounded-md backdrop-blur-xs transition-colors z-10 ${
                        isSaved
                          ? 'bg-amber-900 text-white'
                          : 'bg-stone-900/60 text-stone-300 hover:text-white hover:bg-stone-900/80'
                      }`}
                      title={isSaved ? 'Saved' : 'Save article'}
                    >
                      <Bookmark className="w-3.5 h-3.5 fill-current" />
                    </button>

                    {/* Reviewed Artifact Tag */}
                    {post.reviewedArtifact && (
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-1.5 text-amber-300 font-mono text-[11px] truncate">
                        {post.reviewedArtifact.type === 'github' ? (
                          <GitBranch className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="truncate">{post.reviewedArtifact.identifier}</span>
                      </div>
                    )}
                  </Link>

                  {/* Body Content */}
                  <div className="p-5 space-y-3 font-sans">
                    {/* Category & Date Metadata */}
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <span 
                        onClick={() => onSelectCategory && onSelectCategory(post.category)}
                        className="font-semibold text-amber-900 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        {getCategoryIcon(post.category)}
                        <span>{post.category}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{post.publishedAt}</span>
                      <span aria-hidden="true">·</span>
                      <span>{post.readTime}</span>
                    </div>

                    {/* Title */}
                    <Link href={`/post/${post.slug}`} className="block">
                      <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-amber-900 transition-colors leading-snug line-clamp-2">
                        {post.title}
                      </h3>
                    </Link>

                    {/* Summary */}
                    <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                      {post.summary}
                    </p>
                  </div>
                </div>

                {/* Footer Toolbar */}
                <div className="px-5 py-4 border-t border-stone-100 flex items-center justify-between font-sans text-xs">
                  {/* Author */}
                  <Link 
                    href={`/author/${post.author.id}`}
                    className="flex items-center gap-2 group/author hover:opacity-90 transition-opacity"
                    title={`View ${post.author.name}'s bio and publication history`}
                  >
                    <div className="w-7 h-7 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-[10px] font-bold group-hover/author:bg-amber-900 transition-colors">
                      {post.author.avatar}
                    </div>
                    <span className="font-medium text-stone-800 text-xs group-hover/author:text-amber-900 transition-colors">
                      {post.author.name}
                    </span>
                  </Link>

                  {/* Reactions & Direct Link */}
                  <div className="flex items-center gap-3 text-stone-500">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onLikePost(post.id);
                      }}
                      className="flex items-center gap-1 hover:text-red-700 transition-colors"
                      title="Like / Clap"
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{post.likes}</span>
                    </button>

                    <Link
                      href={`/post/${post.slug}#discussion`}
                      className="flex items-center gap-1 text-stone-500 hover:text-stone-900 transition-colors"
                      title="View discussion"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="text-[11px]">{post.commentsCount}</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
