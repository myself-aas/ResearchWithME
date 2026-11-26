import Link from 'next/link';
import type { PostMeta } from '@/lib/content/types';
import { formatDateShort, readingTimeLabel } from '@/lib/content/format';

/** Compact list row used on the home page, archive, and tag pages. */
export function PostRow({ post }: { post: PostMeta }) {
  return (
    <article className="group relative grid gap-2 border-b border-line py-7 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-6">
      <div className="flex items-center gap-2 font-mono text-xs leading-relaxed text-ink-secondary sm:block">
        <time dateTime={post.date}>{formatDateShort(post.date)}</time>
        <span className="sm:mt-1 sm:block">{readingTimeLabel(post.readingTimeMinutes)}</span>
        {post.draft && (
          <span className="rounded-full border border-trust-emerging/50 px-2 py-0.5 text-[0.6875rem] uppercase tracking-wider text-domain-text-emerging sm:mt-2 sm:inline-flex">
            Draft
          </span>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="font-serif text-xl font-semibold leading-snug tracking-tight text-ink sm:text-2xl">
          <Link
            href={post.href}
            className="inline-flex min-h-11 items-center after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-focus"
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
