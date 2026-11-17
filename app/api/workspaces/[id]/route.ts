import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { getWorkspaceById, listWorkspaceMembers, updateWorkspace } from '@/lib/v34/wave2-store';
import { UpdateWorkspaceInputSchema } from '@/lib/v34/wave7-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const workspace = getWorkspaceById(id);
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
  }
  const members = listWorkspaceMembers(workspace.id);
  return NextResponse.json({ workspace, members });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-workspace-update', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const workspace = getWorkspaceById(id);
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
  }
  const members = listWorkspaceMembers(workspace.id);
  const member = members.find((m) => m.userId === auth.actor.id);
  if (!member && !auth.actor.isEditor) {
    return NextResponse.json(
      { error: 'Workspace membership required to modify workspace settings.' },
      { status: 403 },
    );
  }

  const parsed = await parseJsonBody(request, UpdateWorkspaceInputSchema);
  if (!parsed.ok) return parsed.response;

  const result = await updateWorkspace({
    workspaceId: workspace.id,
    name: parsed.data.name,
    description: parsed.data.description,
    visibility: parsed.data.visibility,
    supabase: auth.actor.supabase,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json({ workspace: result.workspace });
}
