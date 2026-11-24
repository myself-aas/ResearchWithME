import Link from 'next/link';
import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { PostRow } from '@/components/post/PostCard';
import { getAllPostMeta, getAllTags, getArchive } from '@/lib/content/posts';
import { pageMetadata } from '@/lib/seo';
import { collectionPageJsonLd, jsonLdScript } from '@/lib/seo/jsonld';

export const metadata: Metadata = pageMetadata({
  title: 'Archive',
  description:
    'Every essay on ResearchWithMe, grouped by year — paper reviews, repository teardowns, and notes on reproducible work.',
  path: '/blog',
});

export default function ArchivePage() {
  const archive = getArchive();
  const tags = getAllTags();
  const posts = getAllPostMeta();
  const total = posts.length;

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            collectionPageJsonLd({
              name: 'Archive',
              description:
                'Every essay on ResearchWithMe, grouped by year — paper reviews, repository teardowns, and notes on reproducible work.',
              path: '/blog',
              posts,
            }),
          ),
        }}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-5 pb-8 pt-12 sm:px-6 lg:px-8">
        <header className="border-b border-line pb-8">
          <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
            {total} {total === 1 ? 'essay' : 'essays'} · newest first
          </p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl">Archive</h1>
          <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-ink-secondary">
            Everything published here, grouped by year. The{' '}
            <Link href="/search" className="text-brand underline underline-offset-4 hover:text-brand-pressed">
              search page
            </Link>{' '}
            and the{' '}
            <Link href="/rss.xml" className="text-brand underline underline-offset-4 hover:text-brand-pressed">
              RSS feed
            </Link>{' '}
            cover the same set.
          </p>

          {tags.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag.slug}>
                  <Link
                    href={`/tags/${tag.slug}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 font-sans text-xs text-ink-secondary transition-colors hover:border-brand hover:text-ink"
                  >
                    #{tag.tag}
                    <span className="font-mono text-[0.6875rem]">{tag.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </header>

        {archive.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-line bg-surface p-8 font-sans text-sm text-ink-secondary">
            No essays published yet. Add an MDX file to <code className="font-mono text-ink">content/posts/</code> and
            it will appear here.
          </p>
        ) : (
          <div className="mt-4">
            {archive.map(({ year, posts }) => (
              <section key={year} aria-labelledby={`year-${year}`} className="mt-10">
                <h2
                  id={`year-${year}`}
                  className="border-b border-line pb-2 font-mono text-xs font-semibold uppercase tracking-wider text-ink-secondary"
                >
                  {year}
                  <span className="ml-2 font-normal normal-case tracking-normal">
                    {posts.length} {posts.length === 1 ? 'essay' : 'essays'}
                  </span>
                </h2>
                {posts.map((post) => (
                  <PostRow key={post.slug} post={post} />
                ))}
              </section>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
