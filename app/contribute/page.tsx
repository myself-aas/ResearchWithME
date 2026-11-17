import type { Metadata } from 'next';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import ContributeWizard from '@/components/v34/ContributeWizard';
import { getSourceWithDetails } from '@/lib/v34/store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contribute Research',
  description:
    'Guided scholarly contribution composer with canonical source resolution, evidence locators, offline autosave, and pre-publication integrity checks.',
};

export default async function ContributePage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const params = await searchParams;
  const sourceDetails = params.source ? await getSourceWithDetails(params.source) : null;
  const initialSource = sourceDetails
    ? {
        id: sourceDetails.source.id,
        versionId: sourceDetails.versions[0]?.id ?? `sv-${sourceDetails.source.id}-v1`,
        title: sourceDetails.source.title,
        venue: sourceDetails.source.venue,
        integrityStatus: sourceDetails.source.integrityStatus,
        identifierLabel:
          sourceDetails.source.identifierScheme && sourceDetails.source.identifierValue
            ? `${sourceDetails.source.identifierScheme.toUpperCase()}: ${sourceDetails.source.identifierValue}`
            : null,
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader
        variant="editor"
        backHref="/feed"
        backLabel="Back to research feed"
        contextTitle="New Research Contribution"
      />
      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Publish a Research Contribution
          </h1>
          <p className="mt-2 font-sans text-sm text-ink-secondary">
            Draft offline-first with automatic local snapshots, attach canonical sources and exact evidence locators, and pass transparent integrity gates.
          </p>
        </div>

        <ContributeWizard initialSource={initialSource} />
      </main>
      <BlogFooter />
    </div>
  );
}
