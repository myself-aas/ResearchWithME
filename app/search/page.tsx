import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import SearchClient from '@/components/search/SearchClient';
import { getSearchIndex } from '@/lib/content/posts';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Search',
  description: 'Search every essay on ResearchWithMe by title, topic, description, or full text.',
  path: '/search',
  noIndex: true,
});

export default function SearchPage() {
  const docs = getSearchIndex();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-4xl flex-1 px-5 pb-8 pt-12 sm:px-6 lg:px-8">
        <header className="max-w-2xl border-b border-line pb-8">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl">Search</h1>
          <p className="mt-3 font-sans text-base leading-relaxed text-ink-secondary">
            The whole archive is indexed at build time, so results are instant and nothing leaves your browser.
          </p>
        </header>

        <div className="mt-8">
          <SearchClient docs={docs} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
