import { NextResponse } from 'next/server';
import {
  enforceRateLimit,
  handleV34Error,
  parseJsonBody,
  requireAuthorized,
  requireContributor,
} from '@/lib/v34/http';
import { UpdateProjectInputSchema } from '@/lib/v34/wave2-contracts';
import {
  deleteProject,
  getProjectByIdOrSlug,
  listWorkspaceMembers,
  updateProject,
} from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-projects-get', 120, 60_000);
  if (limited) return limited;

  const { id } = await context.params;
  const project = await getProjectByIdOrSlug(id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-projects-patch', 25, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateProjectInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const existing = await getProjectByIdOrSlug(id, auth.actor.supabase);
  if (existing) {
    const member = listWorkspaceMembers(existing.workspaceId).find(
      (m) => m.userId === auth.actor.id && m.status === 'ACTIVE',
    );
    const authz = requireAuthorized(auth.actor, 'project:write', {
      kind: 'project',
      id: existing.id,
      ownerId: existing.ownerId,
      workspaceId: existing.workspaceId,
      workspaceRole: member?.role ?? null,
      isWorkspaceMember: Boolean(member),
      visibility: existing.visibility,
    });
    if (!authz.ok) return authz.response;
  }

  try {
    const updated = await updateProject(id, parsed.data, auth.actor.supabase);
    if (!updated) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }
    return NextResponse.json({ project: updated });
  } catch (err) {
    return handleV34Error(err);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-projects-delete', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const existing = await getProjectByIdOrSlug(id, auth.actor.supabase);
  if (existing) {
    const member = listWorkspaceMembers(existing.workspaceId).find(
      (m) => m.userId === auth.actor.id && m.status === 'ACTIVE',
    );
    const authz = requireAuthorized(auth.actor, 'project:delete', {
      kind: 'project',
      id: existing.id,
      ownerId: existing.ownerId,
      workspaceId: existing.workspaceId,
      workspaceRole: member?.role ?? null,
      isWorkspaceMember: Boolean(member),
      visibility: existing.visibility,
    });
    if (!authz.ok) return authz.response;
  }

  try {
    const ok = await deleteProject(id, auth.actor.supabase);
    if (!ok) {
      return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return handleV34Error(err);
  }
}
