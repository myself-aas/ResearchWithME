import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Hash } from 'lucide-react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { getAllTags } from '@/lib/content/posts';
import { pageMetadata } from '@/lib/seo';
import { jsonLdScript, tagIndexJsonLd } from '@/lib/seo/jsonld';

export const metadata: Metadata = pageMetadata({
  title: 'Topics',
  description: 'Every topic covered on ResearchWithMe, with the number of essays filed under each.',
  path: '/tags',
});

export default function TagsPage() {
  const tags = getAllTags();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(tagIndexJsonLd(tags)) }}
      />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-5 pb-8 pt-12 sm:px-6 lg:px-8">
        <header className="max-w-2xl border-b border-line pb-8">
          <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary">
            {tags.length} {tags.length === 1 ? 'topic' : 'topics'}
          </p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl">Topics</h1>
          <p className="mt-3 font-sans text-base leading-relaxed text-ink-secondary">
            Essays are tagged by subject rather than filed in a single category, so one piece can sit under
            several topics at once. Pick a thread and follow it.
          </p>
        </header>

        {tags.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-line bg-surface p-8 font-sans text-sm text-ink-secondary">
            No topics yet. Tags appear here as soon as a post declares them in its frontmatter.
          </p>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tags.map((tag) => (
              <li key={tag.slug}>
                <Link
                  href={`/tags/${tag.slug}`}
                  className="group flex h-full items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Hash className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                    <span className="truncate font-serif text-lg font-semibold text-ink group-hover:text-brand">
                      {tag.tag}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 font-mono text-xs text-ink-secondary">
                    {tag.count}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
