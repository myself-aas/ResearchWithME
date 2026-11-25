import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, Clock3 } from 'lucide-react';
import type { Post } from '@/lib/content/types';
import { tagToSlug } from '@/lib/content/slug';
import { formatDateShort, readingTimeLabel, toDateTime } from '@/lib/content/format';
import { AUTHOR } from '@/lib/site';

export default function PostHeroBanner({ post }: { post: Post }) {
  const cover = post.cover;
  if (!cover) return null;

  const isLocal = cover.startsWith('/');

  return (
    <header className="relative isolate overflow-hidden rounded-3xl border border-border bg-slate-950 shadow-raised">
      <div className="absolute inset-0">
        {isLocal ? (
          <Image
            src={cover}
            alt={post.coverAlt ?? ''}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 72vw"
            className="object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- remote covers may live on any https host
          <img
            src={cover}
            alt={post.coverAlt ?? ''}
            width={1600}
            height={900}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-950/20"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-slate-950/45 via-transparent to-slate-950/10"
          aria-hidden="true"
        />
      </div>

      <div className="relative flex min-h-[22rem] flex-col justify-end p-6 sm:min-h-[28rem] sm:p-8 lg:min-h-[32rem] lg:p-10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs text-white/90">
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-white/15 px-3 font-semibold uppercase tracking-wider text-white ring-1 ring-white/20 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
            Research note
          </span>
          <span>{post.wordCount.toLocaleString()} words</span>
        </div>

        {post.tags.length > 0 && (
          <ul aria-label="Topics" className="mt-5 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/tags/${tagToSlug(tag)}`}
                  className="inline-flex min-h-8 items-center rounded-full border border-white/25 bg-white/15 px-3 font-mono text-[0.6875rem] text-white backdrop-blur-sm transition-colors hover:border-white/50 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  #{tag}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <h1
          id="post-title"
          className="mt-5 max-w-5xl font-serif text-[clamp(2.35rem,5.1vw,4.35rem)] font-bold leading-[1.02] tracking-[-0.04em] text-white text-balance"
        >
          {post.title}
        </h1>

        <p className="mt-5 max-w-3xl font-sans text-lg leading-relaxed text-white/90 sm:text-xl">
          {post.description}
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-white/20 pt-5">
          <Link
            href="/about"
            className="group flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 font-serif text-sm font-bold text-white backdrop-blur-sm transition-transform group-hover:scale-105"
            >
              {AUTHOR.initials}
            </span>
            <span>
              <span className="block font-sans text-sm font-semibold text-white group-hover:text-white/90">
                {AUTHOR.name}
              </span>
              <span className="mt-0.5 block font-mono text-[0.6875rem] uppercase tracking-wider text-white/85">
                {AUTHOR.role}
              </span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-white/90">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              <time dateTime={toDateTime(post.date)}>{formatDateShort(post.date)}</time>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{readingTimeLabel(post.readingTimeMinutes)}</span>
            </span>
            {post.updated && (
              <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1">
                Updated {formatDateShort(post.updated)}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
