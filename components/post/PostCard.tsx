import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { PostMeta } from '@/lib/content/types';
import { formatDateShort, readingTimeLabel } from '@/lib/content/format';
import PostCover from './PostCover';

/** Compact list row used on the home page, archive, and tag pages. */
export function PostRow({ post }: { post: PostMeta }) {
  return (
    <article className="group relative grid gap-2 border-b border-line py-7 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-6">
      <div className="flex items-center gap-2 font-mono text-xs leading-relaxed text-ink-secondary sm:block">
        <time dateTime={post.date}>{formatDateShort(post.date)}</time>
        <span className="sm:mt-1 sm:block">{readingTimeLabel(post.readingTimeMinutes)}</span>
        {post.draft && (
          <span className="rounded-full border border-trust-emerging/50 px-2 py-0.5 text-[0.6875rem] uppercase tracking-wider text-trust-emerging sm:mt-2 sm:inline-flex">
            Draft
          </span>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="font-serif text-xl font-semibold leading-snug tracking-tight text-ink sm:text-2xl">
          <Link
            href={post.href}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-focus"
          >
            {post.title}
          </Link>
        </h3>
        <p className="mt-1.5 max-w-2xl font-sans text-sm leading-relaxed text-ink-secondary">
          {post.description}
        </p>
        {post.tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
            {post.tags.slice(0, 4).map((tag) => (
              <li key={tag}>#{tag}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

/** The lead item at the top of the home page. */
export function FeaturedPost({ post }: { post: PostMeta }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
          <div>
            <p className="flex flex-wrap items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
              <span className="rounded-full bg-selection px-2.5 py-1 font-semibold text-brand">Featured</span>
              <time dateTime={post.date}>{formatDateShort(post.date)}</time>
              <span aria-hidden="true">·</span>
              <span>{readingTimeLabel(post.readingTimeMinutes)}</span>
            </p>
            <h2 className="mt-4 font-serif text-3xl font-bold leading-[1.1] tracking-tight text-ink text-balance sm:text-4xl">
              <Link
                href={post.href}
                className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-focus"
              >
                {post.title}
              </Link>
            </h2>
            <p className="mt-3 max-w-xl font-sans text-base leading-relaxed text-ink-secondary">
              {post.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <ul className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
              {post.tags.slice(0, 4).map((tag) => (
                <li key={tag}>#{tag}</li>
              ))}
            </ul>
            <span className="inline-flex items-center gap-1 font-sans text-sm font-semibold text-brand">
              Read the essay
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>

        {post.cover ? (
          <div className="order-first p-3 pb-0 lg:order-last lg:p-3">
            <PostCover post={post} priority className="aspect-[16/9]" />
          </div>
        ) : (
          <div className="hidden place-items-center border-l border-line bg-surface-subtle p-8 lg:grid">
            <span className="font-serif text-7xl font-bold leading-none text-brand/25" aria-hidden="true">
              reme
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
