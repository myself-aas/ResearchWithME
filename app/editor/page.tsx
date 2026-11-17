import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import ScholarlyEditorWorkspace from '@/components/v34/ScholarlyEditorWorkspace';
import { pageMetadata } from '@/lib/seo';
import { listSources } from '@/lib/v34/store';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata({
  title: 'Scholarly MDX Editor Workspace',
  description:
    'Multi-pane ResearchWithME v3.4 scholarly MDX workspace with structured Evidence and Claim blocks, offline autosave, conflict reconciliation, and live publication preconditions.',
  path: '/editor',
});

export default async function ScholarlyEditorIndexPage() {
  const sources = (await listSources()).map((s) => ({
    id: s.id,
    title: s.title,
    authors: s.authors,
    venue: s.venue,
    identifierScheme: s.identifierScheme,
    identifierValue: s.identifierValue,
    integrityStatus: s.integrityStatus,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader
        variant="editor"
        backHref="/feed"
        backLabel="Back to feed"
        contextTitle="Scholarly MDX Workspace"
      />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-16 sm:px-6 lg:px-8"
      >
        <h1 className="mb-4 font-serif text-2xl font-bold text-ink sm:text-3xl">
          Scholarly MDX Workspace
        </h1>
        <ScholarlyEditorWorkspace initialDraftId="draft-workspace-default" initialSources={sources} />
      </main>
      <BlogFooter />
    </div>
  );
}
