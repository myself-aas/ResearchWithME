import { NextResponse } from 'next/server';
import {
  enforceRateLimit,
  handleV34Error,
  parseJsonBody,
  requireAuthorized,
  requireContributor,
} from '@/lib/v34/http';
import { AddWorkspaceMemberInputSchema } from '@/lib/v34/wave2-contracts';
import {
  addWorkspaceMember,
  getWorkspaceById,
  listWorkspaceMembers,
} from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-workspace-members-read', 60, 60_000);
  if (limited) return limited;

  const { id } = await context.params;
  const members = listWorkspaceMembers(id);
  return NextResponse.json({ members, total: members.length });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-workspace-members-write', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, AddWorkspaceMemberInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const workspace = getWorkspaceById(id);
  const existingMembers = listWorkspaceMembers(workspace?.id ?? id);
  const actorRole = existingMembers.find((m) => m.userId === auth.actor.id)?.role;
  const authz = requireAuthorized(auth.actor, 'workspace:admin', {
    kind: 'workspace',
    id: workspace?.id ?? id,
    workspaceId: workspace?.id ?? id,
    workspaceRole: actorRole,
  });
  if (!authz.ok) return authz.response;

  try {
    const result = await addWorkspaceMember({
      workspaceId: id,
      ...parsed.data,
      supabase: auth.actor.supabase,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }
    return NextResponse.json({ member: result.member }, { status: 201 });
  } catch (err) {
    return handleV34Error(err);
  }
}
