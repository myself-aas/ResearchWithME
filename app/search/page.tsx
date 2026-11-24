import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import SearchClient from '@/components/search/SearchClient';
import { getSearchIndex } from '@/lib/content/posts';
import { searchDocs, toLiteDoc, toLiteDocs } from '@/lib/search';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Search',
  description:
    'Search every essay on ResearchWithMe by title, topic, description, or full text. The index is built with the site, so results appear without waiting.',
  path: '/search',
  noIndex: true,
});

/**
 * Search is server-rendered for the current `?q=` and then hydrated. The first
 * paint already contains the matching results, so the page works without
 * JavaScript, in a text browser, and for anything that fetches the URL instead
 * of driving the input.
 *
 * Only the short index is inlined; `/search-index.json` carries the bodies and
 * is fetched when the reader starts searching.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const docs = getSearchIndex();
  const { q } = await searchParams;
  const initialQuery = (Array.isArray(q) ? q[0] : q)?.slice(0, 120) ?? '';
  // Rank against the full index so `?q=` can match body text on the server, then
  // send the results stripped: the client component's props are inlined in the
  // HTML, and a body attached to a result would put the whole archive back.
  const lite = toLiteDocs(docs);
  const liteBySlug = new Map(lite.map((doc) => [doc.slug, doc]));
  // Re-use the same objects so the RSC payload references them instead of
  // repeating each result a second time.
  const initialResults = searchDocs(docs, initialQuery).map(
    (doc) => liteBySlug.get(doc.slug) ?? toLiteDoc(doc),
  );

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-4xl flex-1 px-5 pb-8 pt-12 sm:px-6 lg:px-8"
      >
        <header className="max-w-2xl border-b border-line pb-8">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-ink sm:text-5xl">Search</h1>
          <p className="mt-3 font-sans text-base leading-relaxed text-ink-secondary">
            Titles and topics match instantly; full text is matched in your browser after the archive
            index loads from this site. No query is ever sent to a server.
          </p>
        </header>

        <div className="mt-8">
          <SearchClient docs={lite} initialQuery={initialQuery} initialResults={initialResults} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
