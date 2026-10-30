'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bookmark,
  BookOpen,
  Cpu,
  FileText,
  GitBranch,
  Globe,
  Heart,
  MessageSquare,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { BlogCategory, BlogPost } from '@/lib/blog-data';

interface CategoryMeta {
  thumbnail: string;
  description: string;
  tags: string[];
}

export const CATEGORY_META: Record<BlogCategory, CategoryMeta> = {
  'Research Reviews': {
    thumbnail: '/images/folio-process.jpeg',
    description: 'Methodology audits, replication notes, and critiques of primary literature.',
    tags: ['Methodology', 'Replication', 'Meta-analysis'],
  },
  'GitHub Repo Teardowns': {
    thumbnail: '/images/folio-code.jpeg',
    description: 'Architecture inspections, memory profiling, and runtime teardowns of open repositories.',
    tags: ['Architecture', 'Performance', 'Tooling'],
  },
  'STEM & Tech': {
    thumbnail: '/images/folio-dashboard.jpeg',
    description: 'Hardware, semiconductor lithography, quantum runtimes, and engineering systems.',
    tags: ['Hardware', 'Quantum', 'Robotics'],
  },
  'Health & Medicine': {
    thumbnail: '/images/folio-hero.jpeg',
    description: 'Clinical trial audits, pharmacology, gene editing, and biomedical delivery.',
    tags: ['Trials', 'Pharmacology', 'Genomics'],
  },
  'Sociology & Culture': {
    thumbnail: '/images/folio-design.jpeg',
    description: 'Publication economics, peer-review incentives, and digital labour.',
    tags: ['Open access', 'Digital labour', 'Governance'],
  },
  'Data & Policy': {
    thumbnail: '/images/folio-design.jpeg',
    description: 'Quantitative data science, algorithmic accountability, and technology policy.',
    tags: ['Privacy', 'AI policy', 'Data rights'],
  },
};

function categoryIcon(category: string): ReactNode {
  switch (category) {
    case 'Research Reviews':
      return <BookOpen className="h-4 w-4" aria-hidden="true" />;
    case 'GitHub Repo Teardowns':
      return <GitBranch className="h-4 w-4" aria-hidden="true" />;
    case 'STEM & Tech':
      return <Cpu className="h-4 w-4" aria-hidden="true" />;
    case 'Health & Medicine':
      return <Activity className="h-4 w-4" aria-hidden="true" />;
    case 'Sociology & Culture':
      return <Globe className="h-4 w-4" aria-hidden="true" />;
    case 'Data & Policy':
      return <BarChart3 className="h-4 w-4" aria-hidden="true" />;
    default:
      return <FileText className="h-4 w-4" aria-hidden="true" />;
  }
}

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
  const showCategoryGrid = selectedCategory === 'All' && !searchQuery;
  const activeCategory = selectedCategory !== 'All' ? (selectedCategory as BlogCategory) : null;
  const activeMeta = activeCategory ? CATEGORY_META[activeCategory] : null;
  const hasFilters = selectedCategory !== 'All' || selectedFormat !== 'All' || Boolean(searchQuery);

  return (
    <section id="articles-feed" aria-label="Reviews" className="page-container page-section max-w-wide">
      {showCategoryGrid && (
        <div className="mb-14">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-4">
            <h2 id="catalogue-title" className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Browse by field
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-stone-600">
              Six editorial sections. Pick one to see its reviews.
            </p>
          </div>

          <ul className="editorial-grid mt-6">
            {Object.entries(CATEGORY_META).map(([category, meta]) => {
              const count = posts.filter((post) => post.category === category).length;
              return (
                <li key={category} className="col-span-12 sm:col-span-6 lg:col-span-4">
                  <button
                    type="button"
                    onClick={() => onSelectCategory?.(category)}
                    className="group relative flex h-48 w-full flex-col justify-end overflow-hidden rounded-lg border border-stone-200 bg-stone-900 text-left transition-colors hover:border-amber-700"
                  >
                    <Image
                      src={meta.thumbnail}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover opacity-45 transition-opacity group-hover:opacity-55"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-stone-900/20" />
                    <span className="relative z-10 flex flex-col gap-1 p-5">
                      <span className="flex items-center gap-2 text-sm font-medium text-amber-200">
                        {categoryIcon(category)}
                        <span>{count} {count === 1 ? 'review' : 'reviews'}</span>
                      </span>
                      <span className="font-serif text-xl font-semibold text-white group-hover:text-amber-200">
                        {category}
                      </span>
                      <span className="line-clamp-2 max-w-sm text-sm leading-snug text-stone-200">
                        {meta.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {activeMeta && activeCategory && (
        <div className="mb-10 border-y border-stone-200 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">{activeCategory}</h2>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-stone-700">{activeMeta.description}</p>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
                {activeMeta.tags.map((tag) => (
                  <li key={tag}>#{tag}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-stone-400 hover:bg-white"
            >
              All fields
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h2 id="latest-title" className="font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            {activeCategory ? `${activeCategory} reviews` : 'Latest reviews'}
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            {posts.length} {posts.length === 1 ? 'review' : 'reviews'}
            {selectedFormat !== 'All' ? ` · ${selectedFormat}` : ''}
            {searchQuery ? ` · matching “${searchQuery}”` : ''}
          </p>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="min-h-11 text-sm font-medium text-amber-900 underline underline-offset-4 hover:text-amber-950"
          >
            Clear all filters
          </button>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="mt-8 border border-stone-200 bg-white p-8 sm:p-12">
          <h3 className="font-serif text-2xl font-semibold text-stone-900">No reviews match these filters</h3>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-stone-700">
            Nothing in the archive matches this search, field, and format together. Clear the filters to see every review.
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-6 inline-flex min-h-11 items-center rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <ul className="editorial-grid mt-8">
          {posts.map((post) => {
            const isSaved = savedPostIds.includes(post.id) || savedPostIds.includes(post.slug);
            const meta = CATEGORY_META[post.category as BlogCategory] ?? CATEGORY_META['Research Reviews'];

            return (
              <li key={post.id} className="col-span-12 flex min-w-0 sm:col-span-6 lg:col-span-4">
                <article className="group flex w-full min-w-0 flex-col overflow-hidden rounded-lg border border-stone-200 bg-white transition-colors hover:border-stone-300">
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-900">
                    <Image
                      src={post.coverImage && post.coverImage.trim() !== '' ? post.coverImage : meta.thumbnail}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <span className="absolute left-3 top-3 rounded bg-stone-950/90 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-stone-100">
                      {post.format}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleSave(post.id)}
                      aria-pressed={isSaved}
                      className={`absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                        isSaved
                          ? 'bg-amber-900 text-white'
                          : 'bg-stone-950/80 text-stone-200 hover:bg-stone-950 hover:text-white'
                      }`}
                    >
                      <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
                      <span className="sr-only">
                        {isSaved ? `Remove ${post.title} from reading list` : `Save ${post.title} to reading list`}
                      </span>
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600">
                      <button
                        type="button"
                        onClick={() => onSelectCategory?.(post.category)}
                        className="inline-flex items-center gap-1 font-medium text-amber-900 underline-offset-4 hover:underline"
                      >
                        {categoryIcon(post.category)}
                        <span>{post.category}</span>
                      </button>
                      <span aria-hidden="true">·</span>
                      <span>{post.publishedAt}</span>
                      <span aria-hidden="true">·</span>
                      <span>{post.readTime}</span>
                    </div>

                    <h3 className="break-words font-serif text-xl font-semibold leading-snug text-stone-900">
                      <Link href={`/post/${post.slug}`} className="hover:text-amber-900">
                        {post.title}
                      </Link>
                    </h3>

                    <p className="line-clamp-3 break-words text-sm leading-relaxed text-stone-700">{post.summary}</p>

                    {post.reviewedArtifact && (
                      <p className="mt-auto flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden font-mono text-sm text-stone-600">
                        {post.reviewedArtifact.type === 'github' ? (
                          <GitBranch className="h-4 w-4 shrink-0" aria-hidden="true" />
                        ) : (
                          <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                        )}
                        <span className="truncate">{post.reviewedArtifact.identifier}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-stone-200 px-5 py-3">
                    <Link
                      href={`/author/${post.author.id}`}
                      className="flex min-w-0 items-center gap-2 text-sm text-stone-800 hover:text-amber-900"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-900 font-serif text-xs font-bold text-stone-50"
                      >
                        {post.author.avatar}
                      </span>
                      <span className="truncate font-medium">{post.author.name}</span>
                    </Link>

                    <div className="flex shrink-0 items-center gap-2 text-sm text-stone-600">
                      <button
                        type="button"
                        onClick={() => onLikePost(post.id)}
                        className="inline-flex min-h-10 items-center gap-1 rounded px-1.5 transition-colors hover:text-red-800"
                      >
                        <Heart className="h-4 w-4" aria-hidden="true" />
                        <span>{post.likes}</span>
                        <span className="sr-only">likes. Add a like to {post.title}</span>
                      </button>
                      <Link
                        href={`/post/${post.slug}#discussion`}
                        className="inline-flex min-h-10 items-center gap-1 rounded px-1.5 transition-colors hover:text-stone-900"
                      >
                        <MessageSquare className="h-4 w-4" aria-hidden="true" />
                        <span>{post.commentsCount}</span>
                        <span className="sr-only">comments on {post.title}</span>
                      </Link>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-6">
        <p className="text-sm text-stone-600">Open access under CC BY 4.0.</p>
        <Link
          href="/papers"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-amber-900 underline underline-offset-4 hover:text-amber-950"
        >
          <span>Browse the paper archive</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
