import type { Metadata } from 'next';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import TopicsClient from '@/components/v34/TopicsClient';
import { listTopics } from '@/lib/v34/wave5-store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Topic Taxonomy',
  description:
    'Browse and curate first-class FK-backed scholarly topics linking contributions, canonical sources, projects, and open-source tools.',
};

export default async function TopicsPage() {
  const topics = await listTopics();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-16"
      >
        <header className="mb-8 border-b border-line pb-6">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-brand">
            Canonical Knowledge Taxonomy
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Scholarly Topics
          </h1>
          <p className="mt-2 max-w-2xl font-sans text-sm text-ink-secondary sm:text-base">
            Explore normalized, FK-backed research topics connecting empirical contributions, primary sources, collaborative projects, and open-source tools.
          </p>
        </header>

        <TopicsClient initialTopics={topics} />
      </main>
      <BlogFooter />
    </div>
  );
}
