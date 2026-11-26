import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { PostMeta } from '@/lib/content/types';
import { formatMonthYear, readingTimeLabel, toDateTime } from '@/lib/content/format';
import PostCover from './PostCover';

/**
 * Editorial homepage hero governed by the `reme v3.2` generative 12-column
 * layout system:
 *
 * - Mobile (`<768px`, e.g. `390px` with `px-4` -> `358px` inner): stacked
 *   single-column cadence (`gap-6`), `32px` Newsreader `<h1>`, mono date/time
 *   row (`mt-3`), full-width `44px` brand CTA (`mt-5`), and `16:9` `PostCover`
 *   (`~201px` tall).
 * - Tablet (`768px-1023px`, `md:` with `px-6` -> `720px` inner): stacked with
 *   `md:gap-8`, auto-width `44px` CTA (`md:mt-4`), and full-width `16:9`
 *   `PostCover` (`405px` tall).
 * - Desktop (`≥1024px`, `lg:` `12-column` grid with `gap-10` = `40px` inside
 *   `1216px` inner width): `5-col` (`~483px`) editorial stack paired with
 *   `7-col` (`~693px`) `PostCover` frame (`~390px` at `16:9`, `~297px` at `21:9`).
 */
export default function HomeHero({ post }: { post?: PostMeta }) {
  if (!post) {
    return (
      <section aria-labelledby="home-hero-title" className="border-b border-line pb-10 md:pb-12 lg:pb-14">
        <div className="max-w-xl">
          <h1
            id="home-hero-title"
            className="font-serif text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.15] tracking-tight text-ink text-balance"
          >
            Research papers and open code, reviewed in public.
          </h1>
          <p className="mt-3 font-sans text-sm leading-relaxed text-ink-secondary">
            Essays live as MDX files in this repository. Add a published post under{' '}
            <code className="font-mono text-xs text-ink">content/posts/</code> to populate the lead study.
          </p>
          <Link
            href="/lab"
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-2.5 font-sans text-sm font-semibold text-on-primary transition-colors duration-200 ease-standard hover:bg-brand-hover active:bg-brand-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none md:mt-4 md:w-auto"
          >
            Explore research
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="home-hero-title" className="border-b border-line pb-10 md:pb-12 lg:pb-14">
      <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div className="max-w-xl lg:col-span-5">
          <h1
            id="home-hero-title"
            className="font-serif text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.15] tracking-tight text-ink text-balance"
          >
            {post.title}
          </h1>

          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs leading-[1.5] text-ink-secondary">
            <time dateTime={toDateTime(post.date)}>{formatMonthYear(post.date)}</time>
            {post.readingTimeMinutes > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{readingTimeLabel(post.readingTimeMinutes)}</span>
              </>
            )}
          </p>

          <Link
            href={post.href}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-2.5 font-sans text-sm font-semibold text-on-primary transition-colors duration-200 ease-standard hover:bg-brand-hover active:bg-brand-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none md:mt-4 md:w-auto"
          >
            Read study
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="lg:col-span-7">
          <PostCover
            post={post}
            priority
            sizes="(max-width: 1023px) 100vw, 58vw"
            aspect={post.coverStyle === 'hero' && post.cover ? 'aspect-video lg:aspect-[21/9]' : 'aspect-video'}
          />
        </div>
      </div>
    </section>
  );
}
