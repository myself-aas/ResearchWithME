import Link from 'next/link';
import { ArrowRight, PenLine } from 'lucide-react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { FeaturedPost, PostRow } from '@/components/post/PostCard';
import { getAllPostMeta, getAllTags, getFeaturedPost, getSiteStats } from '@/lib/content/posts';
import { AUTHOR, SITE } from '@/lib/site';
import { jsonLdScript, websiteJsonLd } from '@/lib/seo/jsonld';

export default function HomePage() {
  const posts = getAllPostMeta();
  const featured = getFeaturedPost();
  const latest = posts.filter((post) => post.slug !== featured?.slug).slice(0, 6);
  const topics = getAllTags().slice(0, 8);
  const stats = getSiteStats();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd()) }} />
      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-5 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <section aria-labelledby="home-title" className="grid gap-10 border-b border-line pb-14 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14">
          <div>
            <p className="flex flex-wrap items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
              <PenLine className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              <span>Essays on research &amp; open code</span>
              <span aria-hidden="true">·</span>
              <span>
                {stats.posts} {stats.posts === 1 ? 'essay' : 'essays'}
              </span>
            </p>
            <h1
              id="home-title"
              className="mt-5 max-w-3xl font-serif text-[clamp(2.5rem,6vw,4.25rem)] font-bold leading-[1.02] tracking-[-0.03em] text-ink text-balance"
            >
              Research papers and open code, reviewed in public.
            </h1>
            <p className="mt-5 max-w-2xl font-sans text-lg leading-relaxed text-ink-secondary">
              {SITE.description}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {featured && (
                <Link
                  href={featured.href}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-action-primary px-6 py-2.5 font-sans text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  Read the latest
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
              <Link
                href="/blog"
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-5 py-2.5 font-sans text-sm font-semibold text-ink transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Browse the archive
              </Link>
            </div>
          </div>

          <aside aria-label="About the author" className="h-fit rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-selection font-serif text-sm font-bold text-brand"
              >
                {AUTHOR.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate font-serif text-base font-semibold text-ink">{AUTHOR.name}</p>
                <p className="truncate font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
                  {AUTHOR.role}
                </p>
              </div>
            </div>
            <p className="mt-4 font-sans text-sm leading-relaxed text-ink-secondary">{AUTHOR.shortBio}</p>
            <Link
              href="/about"
              className="mt-4 inline-flex items-center gap-1 font-sans text-sm font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed"
            >
              About this site
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
              <div>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">Essays</dt>
                <dd className="font-serif text-xl font-semibold text-ink">{stats.posts}</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">Topics</dt>
                <dd className="font-serif text-xl font-semibold text-ink">{stats.tags}</dd>
              </div>
            </dl>
          </aside>
        </section>

        {featured && (
          <section aria-labelledby="featured-heading" className="pt-12">
            <h2 id="featured-heading" className="sr-only">
              Featured essay
            </h2>
            <FeaturedPost post={featured} />
          </section>
        )}

        {(latest.length > 0 || posts.length === 0) && (
          <section aria-labelledby="latest-heading" className="pt-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="latest-heading" className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Latest writing
              </h2>
              {latest.length > 0 && (
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1 font-sans text-sm font-semibold text-brand underline underline-offset-4 hover:text-brand-pressed"
                >
                  All essays
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>

            {latest.length > 0 ? (
              <div className="mt-4 border-t border-line">
                {latest.map((post) => (
                  <PostRow key={post.slug} post={post} />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-line bg-surface p-8">
                <p className="font-serif text-xl font-semibold text-ink">The first essay is on its way.</p>
                <p className="mt-2 max-w-lg font-sans text-sm leading-relaxed text-ink-secondary">
                  Posts are written as MDX files in this repository. Until one is published, this page is
                  honestly empty — no placeholder cards, no invented writing.
                </p>
              </div>
            )}
          </section>
        )}

        {topics.length > 0 && (
          <section aria-labelledby="topics-heading" className="pt-14">
            <h2 id="topics-heading" className="font-serif text-2xl font-bold tracking-tight text-ink">
              Browse by topic
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {topics.map((topic) => (
                <li key={topic.slug}>
                  <Link
                    href={`/tags/${topic.slug}`}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 font-sans text-sm text-ink-secondary transition-colors hover:border-brand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    {topic.tag}
                    <span className="font-mono text-[0.6875rem] text-ink-secondary">{topic.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
