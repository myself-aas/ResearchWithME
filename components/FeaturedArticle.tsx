import Link from 'next/link';
import Image from 'next/image';
import { coverLoader, isProcessedCover } from '@/lib/images/urls';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { ArrowRight, Bookmark, CheckCircle2, FileText, GitBranch } from 'lucide-react';
import { BlogPost, categoryToSlug } from '@/lib/blog-data';
import Pressable from '@/components/motion/Pressable';
import SuccessCheck from '@/components/motion/SuccessCheck';
import { EASING } from '@/lib/motion/tokens';
import { Text } from '@/components/primitives';

interface FeaturedArticleProps {
  post: BlogPost;
  isSaved: boolean;
  onToggleSave: (postId: string) => void;
}

export default function FeaturedArticle({ post, isSaved, onToggleSave }: FeaturedArticleProps) {
  const coverSrc = post.coverImage && post.coverImage.trim() !== '' ? post.coverImage : '/images/folio-hero.jpeg';

  return (
    <section
      aria-labelledby="featured-heading"
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="card grid gap-0 overflow-hidden border border-line bg-surface lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="relative min-h-64 overflow-hidden border-b border-line bg-canvas lg:min-h-full lg:border-b-0 lg:border-r">
          {post.coverImage && post.coverImage.startsWith('data:') ? (
            <picture className="h-full w-full">
              <source srcSet={post.coverImage} type="image/avif" />
              <img
                src={post.coverImage}
                alt=""
                className="h-full w-full object-cover"
              />
            </picture>
          ) : (
            <Image
              src={coverSrc}
              alt=""
              loader={isProcessedCover(coverSrc) ? coverLoader : undefined}
              fill
              loading="lazy"
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover"
            />
          )}
          <Text as="span" variant="eyebrow" weight="semibold" className="absolute left-4 top-4 rounded-full border border-line bg-canvas/95 px-3 py-1">
            Featured review
          </Text>
        </div>

        <div className="flex flex-col justify-between gap-8 p-6 sm:p-10">
          <div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-ink-secondary">
              <Link
                href={`/category/${categoryToSlug(post.category)}`}
                className="font-semibold text-brand underline-offset-4 hover:underline"
              >
                {post.category}
              </Link>
              <span aria-hidden="true">·</span>
              <span>{post.format}</span>
              <span aria-hidden="true">·</span>
              <span>{post.publishedAt}</span>
              <span aria-hidden="true">·</span>
              <span>{post.readTime}</span>
            </p>

            <h2 id="featured-heading" className="mt-3 font-serif text-3xl font-bold leading-tight text-ink sm:text-4xl">
              <Link href={`/post/${post.slug}`} className="transition-colors hover:text-brand">
                {post.title}
              </Link>
            </h2>

            <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-ink-secondary">
              {post.subtitle}
            </p>

            <div className="mt-6 border-l-2 border-brand pl-4">
              <Text as="h3" variant="eyebrow" weight="semibold">
                Empirical Findings
              </Text>
              <ul className="mt-2 space-y-2 font-sans text-sm leading-relaxed text-ink-secondary">
                {post.keyTakeaways.slice(0, 2).map((takeaway) => (
                  <li key={takeaway} className="flex gap-2">
                    <span aria-hidden="true" className="font-mono text-brand">—</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            {post.reviewedArtifact && (
              <p className="mt-5 flex min-w-0 flex-wrap items-center gap-2 rounded-sm border border-line bg-canvas px-3 py-2 font-mono text-xs text-ink-secondary">
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  {post.reviewedArtifact.type === 'github' ? (
                    <GitBranch className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                  )}
                  <span>Artifact</span>
                </span>
                <span className="break-all text-ink">{post.reviewedArtifact.identifier}</span>
                <span aria-hidden="true">·</span>
                <span>{post.reviewedArtifact.meta}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            <Link
              href={`/author/${post.author.id}`}
              className="flex min-w-0 items-center gap-3 font-sans text-sm text-ink hover:text-brand"
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-line bg-canvas font-mono text-xs font-semibold text-ink"
              >
                {post.author.avatar}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 truncate font-semibold">
                  <span className="truncate">{post.author.name}</span>
                  {post.author.verifiedVia && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  )}
                </span>
                <span className="block truncate text-xs text-ink-secondary">{post.author.role}</span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Pressable
                onClick={() => onToggleSave(post.id)}
                aria-pressed={isSaved}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-sm border transition-colors ${
                  isSaved
                    ? 'border-brand bg-brand text-on-primary'
                    : 'border-line bg-canvas text-ink-secondary hover:bg-surface-subtle hover:text-ink'
                }`}
              >
                <AnimatePresence initial={false} mode="wait">
                  <m.span
                    key={isSaved ? 'saved' : 'unsaved'}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.18, ease: [...EASING.emphasize] }}
                    className="inline-flex"
                    aria-hidden="true"
                  >
                    {isSaved ? (
                      <SuccessCheck size={16} />
                    ) : (
                      <Bookmark className="h-4 w-4" aria-hidden="true" />
                    )}
                  </m.span>
                </AnimatePresence>
                <span className="sr-only">
                  {isSaved ? 'Remove from reading list' : 'Save to reading list'}
                </span>
              </Pressable>

              <Link
                href={`/post/${post.slug}`}
                className="group inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-ink px-5 py-2.5 font-sans text-xs font-semibold uppercase tracking-wider text-canvas transition-opacity hover:opacity-90"
              >
                <span>Read manuscript</span>
                <ArrowRight
                  className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
