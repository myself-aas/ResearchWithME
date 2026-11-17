import type { Metadata } from 'next';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import LibraryClient from '@/components/v34/LibraryClient';
import { getDashboardUser } from '@/lib/cms/auth';
import { listLibraryItems } from '@/lib/v34/store';
import {
  listCitationCollections,
  listHydratedResearchGoals,
  listSavedSearches,
} from '@/lib/v34/wave5-store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Personal Research Library',
  description:
    'Organize saved sources, citation collections with BibTeX export, saved search alerts, and calm Personal Research OS goals.',
};

export default async function LibraryPage() {
  const user = await getDashboardUser();
  const userId = user?.id ?? 'local-contributor';
  const items = listLibraryItems(userId);
  const goals = listHydratedResearchGoals(userId);
  const citationCollections = listCitationCollections(userId);
  const savedSearches = listSavedSearches(userId);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-16">
        <header className="mb-8 border-b border-line pb-6">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Research Library, Citations &amp; Goals
          </h1>
          <p className="mt-2 max-w-2xl font-sans text-sm text-ink-secondary sm:text-base">
            Curate canonical sources and contributions into citation collections, manage saved search alerts, and monitor calm research milestones.
          </p>
        </header>

        <LibraryClient
          initialItems={items}
          initialGoals={goals}
          initialCitationCollections={citationCollections}
          initialSavedSearches={savedSearches}
        />
      </main>
      <BlogFooter />
    </div>
  );
}
