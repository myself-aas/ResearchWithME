import { redirect } from 'next/navigation';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import ScholarlyEditorWorkspace from '@/components/v34/ScholarlyEditorWorkspace';
import { requireEditor } from '@/lib/cms/auth';
import { pageMetadata } from '@/lib/seo';
import { listSources } from '@/lib/v34/store';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return pageMetadata({
    title: `Scholarly Editor · ${id}`,
    description:
      'Continue authoring a shared ResearchWithME v3.4 scholarly draft with structured blocks, offline sync, and publication blocker checks.',
    path: `/editor/${id}`,
  });
}

export default async function ScholarlyEditorDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await requireEditor();
  if (!gate.ok) {
    redirect(gate.status === 401 ? '/login?next=%2Feditor' : '/dashboard/access?error=not-editor');
  }

  const { id } = await params;
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
        contextTitle={`Draft · ${id}`}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-16 sm:px-6 lg:px-8"
      >
        <h1 className="mb-4 font-serif text-2xl font-bold text-ink sm:text-3xl">
          Scholarly MDX Workspace
        </h1>
        <ScholarlyEditorWorkspace
          initialDraftId={id}
          initialSources={sources}
          editorName={gate.user?.name ?? 'Local demo editor'}
        />
      </main>
      <BlogFooter />
    </div>
  );
}
