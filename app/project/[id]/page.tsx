import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import BlogHeader from '@/components/BlogHeader';
import BlogFooter from '@/components/BlogFooter';
import { ProjectWorkspaceClient } from '@/components/v34/ProjectWorkspaceClient';
import { toProvenanceGraphData } from '@/lib/v34/scholarly-adapter';
import {
  getClaimEvidenceLinks,
  listClaims,
  listContributions,
  listEvidence,
  listSources,
} from '@/lib/v34/store';
import { getProjectByIdOrSlug, listWorkspaceMembers } from '@/lib/v34/wave2-store';
import { listProjectNotes } from '@/lib/v34/wave3-store';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectByIdOrSlug(id);
  if (!project) return { title: 'Project not found' };
  return {
    title: `${project.title} — Research Project`,
    description: project.objective,
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectByIdOrSlug(id);
  if (!project) notFound();

  const [allSources, allEvidence, allClaims, allContributions, notes] = await Promise.all([
    listSources(),
    Promise.resolve(listEvidence()),
    Promise.resolve(listClaims()),
    Promise.resolve(listContributions()),
    listProjectNotes(project.id),
  ]);

  const allLinks = getClaimEvidenceLinks();
  const graph = toProvenanceGraphData({
    sources: allSources,
    evidence: allEvidence,
    claims: allClaims,
    contributions: allContributions,
    claimEvidence: allLinks,
  });
  const workspaceMembers = listWorkspaceMembers(project.workspaceId);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <BlogHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8 lg:pb-12"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All Research Projects
          </Link>
          <span className="rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs text-ink-secondary">
            Workspace: {project.workspaceName}
          </span>
        </div>

        <header className="mb-6 space-y-2 border-b border-line pb-5">
          <h1 className="font-serif text-3xl font-bold text-ink">{project.title}</h1>
          <p className="max-w-3xl text-sm text-ink-secondary">{project.objective}</p>
        </header>

        <ProjectWorkspaceClient
          initialProject={project}
          initialNotes={notes}
          workspaceMembers={workspaceMembers}
          availableSources={allSources}
          availableContributions={allContributions}
          graphObjects={graph.objects}
          graphRelationships={graph.relationships}
          claimEvidence={allLinks}
        />
      </main>
      <BlogFooter />
    </div>
  );
}
