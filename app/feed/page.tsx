import type { Metadata } from 'next';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import ResearchFeedClient from '@/components/v34/ResearchFeedClient';
import { getUnifiedResearchFeed } from '@/lib/v34/feed';
import { listSources } from '@/lib/v34/store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Research Network Feed',
  description:
    'Discover evidence-linked paper reviews, tool benchmarks, replications, method teardowns, and open scholarly contributions on ResearchWithME.',
};

export default async function ResearchFeedPage() {
  const [feed, sources] = await Promise.all([getUnifiedResearchFeed(), listSources()]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main tabIndex={-1} id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-16">
        <header className="mb-8 flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-end">
          <div className="min-w-0 max-w-2xl">
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Research Contributions Feed
            </h1>
            <p className="mt-2 font-sans text-sm leading-relaxed text-ink-secondary sm:text-base">
              Every contribution links back to canonical sources, explicit evidence locators, and transparent trust dimensions rather than engagement vanity metrics.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href="/research-os"
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 py-2 font-sans text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Research OS
            </Link>
            <Link
              href="/tools"
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 py-2 font-sans text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Tools
            </Link>
            <Link
              href="/contribute"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 py-2.5 font-sans text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>New contribution</span>
            </Link>
          </div>
        </header>

        <ResearchFeedClient
          initialItems={feed.items}
          availableTopics={feed.availableTopics}
          sourceCount={sources.length}
        />
      </main>
      <BlogFooter />
    </div>
  );
}
