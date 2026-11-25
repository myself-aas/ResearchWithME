import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowUpRight, BookOpenText, Rss, Search } from 'lucide-react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import ArchiveExplorer from '@/components/post/ArchiveExplorer';
import { getAllPostMeta, getAllTags } from '@/lib/content/posts';
import { pageMetadata } from '@/lib/seo';
import { collectionPageJsonLd, jsonLdScript } from '@/lib/seo/jsonld';

export const metadata: Metadata = pageMetadata({
  title: 'Essays on research and reproducible code',
  description:
    'Every essay on ResearchWithMe, grouped by year: paper reviews, repository teardowns, and notes on reproducible research, with tags, search, and an RSS feed.',
  path: '/blog',
});

export default function ArchivePage() {
  const posts = getAllPostMeta();
  const tags = getAllTags();
  const totalWords = posts.reduce((total, post) => total + post.wordCount, 0);
  const formattedWords = new Intl.NumberFormat('en-US').format(totalWords);

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
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-5 pb-8 pt-8 sm:px-6 sm:pt-10 lg:px-8">
        <header className="relative isolate overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/60 p-6 shadow-raised sm:p-9 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full border border-primary/10 bg-[radial-gradient(circle_at_center,rgba(109,69,47,.14),transparent_66%)]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute -right-4 top-5 hidden h-64 w-64 rounded-full border border-border/70 lg:block" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end lg:gap-12">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <BookOpenText className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                A research notebook
              </p>
              <h1 className="mt-5 font-serif text-5xl font-bold tracking-[-0.04em] text-foreground sm:text-6xl">
                Archive
              </h1>
              <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-muted-foreground sm:text-lg">
                Close reads of research papers and open-source code, with the methods, evidence, and reproducibility details left in view.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/search"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-sans text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Search essays
                </Link>
                <Link
                  href="/rss.xml"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-5 font-sans text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Rss className="h-4 w-4" aria-hidden="true" />
                  Follow by RSS
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-background/75 p-3 backdrop-blur-sm sm:p-4 lg:grid-cols-1">
              <div className="rounded-xl bg-card px-4 py-3 shadow-xs">
                <dt className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Essays</dt>
                <dd className="mt-1 font-serif text-2xl font-bold tabular-nums text-foreground">{posts.length}</dd>
              </div>
              <div className="rounded-xl bg-card px-4 py-3 shadow-xs">
                <dt className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Topics</dt>
                <dd className="mt-1 font-serif text-2xl font-bold tabular-nums text-foreground">{tags.length}</dd>
              </div>
              <div className="col-span-2 rounded-xl bg-card px-4 py-3 shadow-xs lg:col-span-1">
                <dt className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Words examined</dt>
                <dd className="mt-1 font-serif text-2xl font-bold tabular-nums text-foreground">{formattedWords}</dd>
              </div>
            </dl>
          </div>
        </header>

        {posts.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-border bg-card p-8 font-sans text-sm text-muted-foreground">
            No essays published yet. Add an MDX file to <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">content/posts/</code> and it will appear here.
          </p>
        ) : (
          <ArchiveExplorer posts={posts} topics={tags} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
