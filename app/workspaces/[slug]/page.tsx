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
import { listProjectNotes, listToolRepositories } from '@/lib/v34/wave3-store';
import { listWorkspaceTools } from '@/lib/v34/wave5-store';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectByIdOrSlug(slug);
  if (!project) return { title: 'Project workspace not found' };
  return {
    title: `${project.title} — Workspace`,
    description: project.objective,
  };
}

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectByIdOrSlug(slug);
  if (!project) notFound();

  const [allSources, allEvidence, allClaims, allContributions] = await Promise.all([
    listSources(),
    Promise.resolve(listEvidence()),
    Promise.resolve(listClaims()),
    Promise.resolve(listContributions()),
  ]);

  const linkedSourceIds = new Set(
    project.objects.filter((o) => o.objectType === 'source').map((o) => o.objectId),
  );
  const linkedEvidenceIds = new Set(
    project.objects.filter((o) => o.objectType === 'evidence').map((o) => o.objectId),
  );
  const linkedClaimIds = new Set(
    project.objects.filter((o) => o.objectType === 'claim').map((o) => o.objectId),
  );
  const linkedContributionIds = new Set(
    project.objects.filter((o) => o.objectType === 'contribution').map((o) => o.objectId),
  );

  const scopedSources = allSources.filter((s) => linkedSourceIds.has(s.id));
  const scopedEvidence = allEvidence.filter(
    (e) => linkedEvidenceIds.has(e.id) || linkedSourceIds.has(e.sourceId),
  );
  const scopedClaims = allClaims.filter((c) => linkedClaimIds.has(c.id));
  const scopedContributions = allContributions.filter((c) => linkedContributionIds.has(c.id));

  const allLinks = getClaimEvidenceLinks();
  const scopedLinks = allLinks.filter(
    (link) =>
      scopedClaims.some((c) => c.id === link.claimId) ||
      scopedEvidence.some((e) => e.id === link.evidenceId),
  );

  // Include any evidence/claims referenced by scoped links so graph edges stay complete
  const extraEvidenceIds = new Set(scopedLinks.map((l) => l.evidenceId));
  const extraClaimIds = new Set(scopedLinks.map((l) => l.claimId));
  const graphSources = scopedSources.length > 0 ? scopedSources : allSources;
  const graphEvidence = allEvidence.filter(
    (e) => scopedEvidence.some((se) => se.id === e.id) || extraEvidenceIds.has(e.id),
  );
  const graphClaims = allClaims.filter(
    (c) => scopedClaims.some((sc) => sc.id === c.id) || extraClaimIds.has(c.id),
  );

  const graph = toProvenanceGraphData({
    sources: graphSources,
    evidence: graphEvidence,
    claims: graphClaims,
    claimEvidence: scopedLinks,
    contributions: scopedContributions,
  });

  const workspaceMembers = listWorkspaceMembers(project.workspaceId);
  const projectNotes = await listProjectNotes(project.id);
  const workspaceToolLinks = listWorkspaceTools(project.workspaceId);
  const allTools = await listToolRepositories();
  const toolById = new Map(allTools.map((t) => [t.id, t]));
  const linkedWorkspaceTools = workspaceToolLinks
    .map((wt) => ({ ...wt, tool: toolById.get(wt.toolRepositoryId) ?? null }))
    .filter((wt) => wt.tool !== null);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <BlogHeader />
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-8 lg:pb-16 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/workspaces"
            className="inline-flex min-h-11 items-center gap-1.5 font-sans text-sm text-ink-secondary hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to workspaces</span>
          </Link>
          <span className="font-mono text-xs text-ink-secondary">
            Workspace: {project.workspaceName}
          </span>
        </div>

        <header className="border-b border-line pb-5 space-y-2">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 font-semibold text-brand">
              {project.stage.replace(/_/g, ' ')}
            </span>
            {project.topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-ink-secondary"
              >
                {topic}
              </span>
            ))}
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">
            {project.title}
          </h1>
          <p className="font-sans text-sm leading-relaxed text-ink-secondary max-w-3xl">
            {project.objective}
          </p>
        </header>

        <ProjectWorkspaceClient
          initialProject={project}
          initialNotes={projectNotes}
          workspaceMembers={workspaceMembers}
          availableSources={allSources}
          availableContributions={allContributions}
          graphObjects={graph.objects}
          graphRelationships={graph.relationships}
          claimEvidence={scopedLinks}
        />

        {/* ADR-032-07: WorkspaceTool access bridge to deduplicated global ToolRepositories */}
        <section
          aria-labelledby="workspace-tools-heading"
          className="rounded-xl border border-line bg-surface p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="workspace-tools-heading" className="font-serif text-xl font-semibold text-ink">
                Workspace Linked Tools ({linkedWorkspaceTools.length})
              </h2>
              <p className="font-sans text-xs text-ink-secondary">
                Global deduplicated ToolRepositories linked into this workspace via WorkspaceTool without duplicating repository metadata.
              </p>
            </div>
            <Link
              href="/tools"
              className="inline-flex min-h-10 items-center rounded-full border border-line bg-canvas px-3 py-1 font-sans text-xs font-medium text-ink hover:border-brand hover:text-brand"
            >
              Browse global tool registry
            </Link>
          </div>
          {linkedWorkspaceTools.length === 0 ? (
            <p className="font-sans text-sm text-ink-secondary">
              No global tools are linked to this workspace yet.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {linkedWorkspaceTools.map((entry) => (
                <li
                  key={entry.toolRepositoryId}
                  className="rounded-lg border border-line bg-canvas p-3 space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-serif text-base font-semibold text-ink">
                      {entry.tool!.name}
                    </span>
                    <span className="font-mono text-xs text-brand">
                      {entry.pinned ? 'Pinned' : 'Linked'} · {entry.tool!.license ?? 'Open source'}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-ink-secondary">
                    {entry.tool!.ownerName}/{entry.tool!.repoName}
                  </p>
                  {entry.notes ? (
                    <p className="font-sans text-xs text-ink-secondary">{entry.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}
