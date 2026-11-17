import { notFound, redirect } from 'next/navigation';
import { getProjectByIdOrSlug, getWorkspaceById, listProjects } from '@/lib/v34/wave2-store';

export const dynamic = 'force-dynamic';

/**
 * Part VI §3.2 canonical `/workspace/[id]` resolver supporting workspace IDs,
 * slugs, and direct project lookup without breaking `/workspaces/[slug]`.
 */
export default async function WorkspaceAliasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const projectMatch = await getProjectByIdOrSlug(id);
  if (projectMatch) {
    redirect(`/workspaces/${projectMatch.slug}`);
  }

  const workspace = getWorkspaceById(id);
  if (workspace) {
    const projects = await listProjects({ workspaceId: workspace.id });
    if (projects[0]) {
      redirect(`/workspaces/${projects[0].slug}`);
    }
    redirect('/workspaces');
  }

  notFound();
}
