'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Cpu,
  FileText,
  GitBranch,
  Globe,
  Heart,
  MessageSquare,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { BlogCategory, BlogPost, categoryToSlug } from '@/lib/blog-data';
import { MotionItem, MotionList } from './motion/MotionList';
import Pressable from './motion/Pressable';
import Reveal from './motion/Reveal';
import SuccessCheck from './motion/SuccessCheck';
import { Stagger, StaggerItem } from './motion/Stagger';

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
      return <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />;
    case 'GitHub Repo Teardowns':
      return <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />;
    case 'STEM & Tech':
      return <Cpu className="h-3.5 w-3.5" aria-hidden="true" />;
    case 'Health & Medicine':
      return <Activity className="h-3.5 w-3.5" aria-hidden="true" />;
    case 'Sociology & Culture':
      return <Globe className="h-3.5 w-3.5" aria-hidden="true" />;
    case 'Data & Policy':
      return <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />;
    default:
      return <FileText className="h-3.5 w-3.5" aria-hidden="true" />;
  }
}

interface ArticleFeedProps {
  posts: BlogPost[];
  savedPostIds: string[];
  /** Post ids the reader has liked on this device (optional; drives feedback). */
  likedPostIds?: string[];
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
  likedPostIds = [],
  onToggleSave,
  onLikePost,
  selectedCategory,
  selectedFormat,
  searchQuery,
  onClearFilters,
}: ArticleFeedProps) {
  const showCategoryGrid = selectedCategory === 'All' && !searchQuery;
  const activeCategory = selectedCategory !== 'All' ? (selectedCategory as BlogCategory) : null;
  const activeMeta = activeCategory ? CATEGORY_META[activeCategory] : null;
  const hasFilters = selectedCategory !== 'All' || selectedFormat !== 'All' || Boolean(searchQuery);

  return (
    <section id="articles-feed" aria-labelledby="catalogue-title" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {showCategoryGrid && (
        <div className="mb-14">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-ink-secondary">
                Six Specialist Columns
              </p>
              <h2 id="columns-heading" className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Browse by editorial column
              </h2>
            </div>
            <p className="max-w-md font-sans text-xs leading-relaxed text-ink-secondary">
              Each column is curated by domain specialists and anchored to primary code, datasets, or peer-reviewed papers.
            </p>
          </div>

          <Stagger
            as="ul"
            data-layout-grid="category-cards"
            className="mt-6 grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
          >
            {Object.entries(CATEGORY_META).map(([category, meta], idx) => {
              const count = posts.filter((post) => post.category === category).length;
              const code = String(idx + 1).padStart(2, '0');
              return (
                <StaggerItem as="li" key={category} variant="rise">
                  <Link
                    href={`/category/${categoryToSlug(category)}`}
                    className="group flex h-full flex-col justify-between rounded-sm border border-line bg-surface p-5 transition-colors hover:border-brand hover:bg-surface-subtle"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 font-mono text-xs text-ink-secondary">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-brand">
                          <span>{code}</span>
                          <span aria-hidden="true">·</span>
                          {categoryIcon(category)}
                        </span>
                        <span>
                          {count} {count === 1 ? 'review' : 'reviews'}
                        </span>
                      </div>
                      <h3 className="mt-3 font-serif text-xl font-semibold text-ink transition-colors group-hover:text-brand">
                        {category}
                      </h3>
                      <p className="mt-2 font-sans text-xs leading-relaxed text-ink-secondary">
                        {meta.description}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3 font-mono text-xs text-ink-secondary">
                      {meta.tags.map((tag) => (
                        <span key={tag} className="rounded-xs border border-line bg-canvas px-1.5 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      )}

      {activeMeta && activeCategory && (
        <Reveal variant="stage" className="mb-10 border-y border-line py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-brand">Active Column</p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-ink sm:text-3xl">{activeCategory}</h2>
              <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
                {activeMeta.description}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2 font-mono text-xs text-ink-secondary">
                {activeMeta.tags.map((tag) => (
                  <li key={tag} className="rounded-sm border border-line bg-surface px-2 py-0.5">
                    #{tag}
                  </li>
                ))}
              </ul>
            </div>
            <Pressable
              type="button"
              onClick={onClearFilters}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-line bg-surface px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-surface-subtle"
            >
              All columns
            </Pressable>
          </div>
        </Reveal>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 id="catalogue-title" className="font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {activeCategory ? `${activeCategory} reviews` : 'Latest reviews'}
          </h2>
          <p className="mt-1.5 font-mono text-xs text-ink-secondary">
            {posts.length} {posts.length === 1 ? 'manuscript' : 'manuscripts'}
            {selectedFormat !== 'All' ? ` · ${selectedFormat}` : ''}
            {searchQuery ? ` · matching “${searchQuery}”` : ''}
          </p>
        </div>

        {hasFilters && (
          <Pressable
            type="button"
            onClick={onClearFilters}
            className="min-h-11 font-sans text-xs font-semibold uppercase tracking-wider text-brand underline underline-offset-4 hover:text-brand-pressed"
          >
            Clear all filters
          </Pressable>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="mt-8 rounded-sm border border-line bg-surface p-8 sm:p-12">
          <p className="font-mono text-xs uppercase tracking-wider text-ink-secondary">
            Diagnostic Empty State · Zero Matches
          </p>
          <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">
            No manuscripts match the active filter constraints
          </h3>
          <p className="mt-2 max-w-xl font-sans text-sm leading-relaxed text-ink-secondary">
            No published review satisfies all of the constraints below simultaneously. Relax a filter or reset the index to view the complete specialist catalog.
          </p>

          <div
            data-testid="active-filter-chips"
            className="mt-5 flex flex-wrap items-center gap-2 font-mono text-xs"
          >
            {selectedCategory !== 'All' && (
              <span className="rounded-sm border border-brand bg-canvas px-2.5 py-1 text-ink">
                Column: {selectedCategory}
              </span>
            )}
            {selectedFormat !== 'All' && (
              <span className="rounded-sm border border-brand bg-canvas px-2.5 py-1 text-ink">
                Format: {selectedFormat}
              </span>
            )}
            {searchQuery && (
              <span className="rounded-sm border border-brand bg-canvas px-2.5 py-1 text-ink">
                Query: {searchQuery}
              </span>
            )}
          </div>

          <Pressable
            type="button"
            feedback="lift"
            onClick={onClearFilters}
            className="mt-6 inline-flex min-h-11 items-center rounded-sm bg-brand px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-on-primary transition-colors hover:bg-brand-hover"
          >
            Reset filters
          </Pressable>
        </div>
      ) : (
        <MotionList data-layout-grid="article-cards" className="mt-8 grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => {
              const isSaved = savedPostIds.includes(post.id) || savedPostIds.includes(post.slug);
              const canonicalDoi = `10.5555/rwm.${post.id}`;

              return (
                <MotionItem key={post.id} className="flex min-w-0">
                  <article className="group flex w-full min-w-0 flex-col justify-between rounded-sm border border-line bg-surface transition-[color,border-color,box-shadow,transform] duration-200 hover:border-brand hover:shadow-raised motion-safe:hover:-translate-y-0.5">
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
                        <span className="rounded-xs border border-line bg-canvas px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wider text-ink-secondary">
                          {post.format}
                        </span>
                        <Pressable
                          type="button"
                          onClick={() => onToggleSave(post.id)}
                          aria-pressed={isSaved}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-sm border transition-colors ${
                            isSaved
                              ? 'border-brand bg-brand text-on-primary'
                              : 'border-line bg-canvas text-ink-secondary hover:bg-surface-subtle hover:text-ink'
                          }`}
                        >
                          <AnimatePresence initial={false} mode="wait">
                            <m.span
                              key={isSaved ? 'saved' : 'unsaved'}
                              initial={{ scale: 0.7, opacity: 0, rotate: -12 }}
                              animate={{ scale: 1, opacity: 1, rotate: 0 }}
                              exit={{ scale: 0.7, opacity: 0, rotate: 12 }}
                              transition={{ duration: 0.16, ease: 'easeOut' }}
                              className="inline-flex"
                            >
                              {isSaved ? (
                                <SuccessCheck size={14} quiet />
                              ) : (
                                <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                            </m.span>
                          </AnimatePresence>
                          <span className="sr-only">
                            {isSaved
                              ? `Remove ${post.title} from reading list`
                              : `Save ${post.title} to reading list`}
                          </span>
                        </Pressable>
                      </div>

                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-secondary">
                        <Link
                          href={`/category/${categoryToSlug(post.category)}`}
                          className="inline-flex items-center gap-1 font-semibold text-brand underline-offset-4 hover:underline"
                        >
                          {categoryIcon(post.category)}
                          <span>{post.category}</span>
                        </Link>
                        <span aria-hidden="true">·</span>
                        <span>{post.publishedAt}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.readTime}</span>
                      </div>

                      <h3 className="break-words font-serif text-xl font-semibold leading-snug text-ink">
                        <Link href={`/post/${post.slug}`} className="transition-colors hover:text-brand">
                          {post.title}
                        </Link>
                      </h3>

                      <p className="break-words font-sans text-sm leading-relaxed text-ink-secondary">
                        {post.summary.length > 180 ? `${post.summary.slice(0, 177)}…` : post.summary}
                      </p>

                      <div className="mt-auto space-y-1.5 pt-2 font-mono text-xs text-ink-secondary">
                        {post.reviewedArtifact && (
                          <p className="flex min-w-0 items-center gap-1.5 truncate text-ink">
                            {post.reviewedArtifact.type === 'github' ? (
                              <GitBranch className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                            )}
                            <span className="truncate">{post.reviewedArtifact.identifier}</span>
                          </p>
                        )}
                        <p className="truncate">DOI {canonicalDoi}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-line bg-canvas/60 px-5 py-3">
                      <Link
                        href={`/author/${post.author.id}`}
                        className="flex min-w-0 items-center gap-2 font-sans text-xs text-ink hover:text-brand"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-line bg-surface font-mono text-xs font-semibold text-ink"
                        >
                          {post.author.avatar}
                        </span>
                        <span className="truncate font-medium">{post.author.name}</span>
                        {post.author.verifiedVia && (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                        )}
                      </Link>

                      <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs text-ink-secondary">
                        <Pressable
                          type="button"
                          onClick={() => onLikePost(post.id)}
                          aria-pressed={likedPostIds.includes(post.id)}
                          className="inline-flex min-h-9 items-center gap-1 rounded-sm px-1.5 transition-colors hover:text-brand"
                        >
                          <m.span
                            aria-hidden="true"
                            className="inline-flex"
                            animate={
                              likedPostIds.includes(post.id)
                                ? { scale: [1, 1.3, 1], rotate: [0, -8, 0] }
                                : { scale: 1, rotate: 0 }
                            }
                            transition={{ duration: 0.38, times: [0, 0.45, 1], ease: 'easeInOut' }}
                          >
                            <Heart
                              className={`h-3.5 w-3.5 ${likedPostIds.includes(post.id) ? 'fill-brand text-brand' : ''}`}
                            />
                          </m.span>
                          <span>{post.likes}</span>
                          <span className="sr-only">likes. Add a like to {post.title}</span>
                        </Pressable>
                        <Link
                          href={`/post/${post.slug}#discussion`}
                          className="inline-flex min-h-9 items-center gap-1 rounded-sm px-1.5 transition-colors hover:text-ink"
                        >
                          <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{post.commentsCount}</span>
                          <span className="sr-only">comments on {post.title}</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                </MotionItem>
              );
            })}
        </MotionList>
      )}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <p className="font-mono text-xs text-ink-secondary">
          Every review is open access under CC BY 4.0 · ISSN 2994-0821.
        </p>
        <Link
          href="/papers"
          className="inline-flex min-h-11 items-center gap-2 font-sans text-xs font-semibold uppercase tracking-wider text-brand underline underline-offset-4 hover:text-brand-pressed"
        >
          <span>Browse the paper archive</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
