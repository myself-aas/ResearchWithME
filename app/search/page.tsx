import type { Metadata } from 'next';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import SearchClient from '@/components/v34/SearchClient';
import { executeUnifiedSearch } from '@/lib/v34/search';
import { SEARCH_ENTITY_TYPES, type SearchEntityType } from '@/lib/v34/wave6-contracts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Search Knowledge Network',
  description:
    'Search across canonical sources, contributions, structured claims, open-source tools, projects, and FK-backed topics with transparent match reasons.',
};

const VALID_TYPES = new Set<string>(SEARCH_ENTITY_TYPES);

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; topic?: string; integrity?: string; access?: string; language?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const requestedType = params.type?.trim().toLowerCase();
  const types =
    requestedType && VALID_TYPES.has(requestedType)
      ? [requestedType as SearchEntityType]
      : undefined;

  const initialResponse = await executeUnifiedSearch({
    query: q,
    types,
    integrity: params.integrity?.trim() || undefined,
    access: params.access?.trim() || undefined,
    language: params.language?.trim() || undefined,
    topic: params.topic?.trim() || undefined,
    authorizedClassifications: ['PUBLIC'],
  });

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-16"
      >
        <header className="mb-8 border-b border-line pb-6">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Search ResearchWithME
          </h1>
          <p className="mt-2 max-w-2xl font-sans text-sm text-ink-secondary sm:text-base">
            Query canonical sources, empirical contributions, structured claims, global tool repositories, projects, and topics with transparent match reasons and optional editable expansions.
          </p>
        </header>

        <SearchClient initialResponse={initialResponse} />
      </main>
      <BlogFooter />
    </div>
  );
}
