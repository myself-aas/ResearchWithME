import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import {
  getWorkspaceById,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from '@/lib/v34/wave2-store';
import { UpdateWorkspaceMemberRoleInputSchema } from '@/lib/v34/wave8-contracts';
import { isWorkspaceAdminOrOwner } from '@/lib/v34/wave8-store';
import type { WorkspaceRole } from '@/lib/v34/wave2-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mapRole(role: 'OWNER' | 'ADMIN' | 'RESEARCHER' | 'REVIEWER' | 'VIEWER'): WorkspaceRole {
  if (role === 'OWNER') return 'OWNER';
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'REVIEWER') return 'REVIEWER';
  if (role === 'VIEWER') return 'VIEWER';
  return 'CONTRIBUTOR';
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-ws-member-patch', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateWorkspaceMemberRoleInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id, userId } = await context.params;
  if (!getWorkspaceById(id)) {
    return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
  }
  if (!auth.actor.isEditor && !isWorkspaceAdminOrOwner(id, auth.actor.id)) {
    return NextResponse.json({ error: 'Workspace admin or owner role required.' }, { status: 403 });
  }

  const member = await updateWorkspaceMemberRole({
    workspaceId: id,
    userId,
    role: mapRole(parsed.data.role),
    supabase: auth.actor.supabase,
  });
  if (!member) {
    return NextResponse.json({ error: 'Workspace member not found.' }, { status: 404 });
  }
  return NextResponse.json({ member });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-ws-member-delete', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id, userId } = await context.params;
  if (!getWorkspaceById(id)) {
    return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
  }
  if (!auth.actor.isEditor && auth.actor.id !== userId && !isWorkspaceAdminOrOwner(id, auth.actor.id)) {
    return NextResponse.json({ error: 'Workspace admin or owner role required.' }, { status: 403 });
  }

  const res = await removeWorkspaceMember({
    workspaceId: id,
    userId,
    supabase: auth.actor.supabase,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.message }, { status: res.status });
  }
  return NextResponse.json({ removed: true, workspaceId: id, userId });
}
