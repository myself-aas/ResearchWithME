import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { updateProjectMemberRole } from '@/lib/v34/wave2-store';
import { UpdateProjectMemberRoleInputSchema } from '@/lib/v34/wave8-contracts';
import type { WorkspaceRole } from '@/lib/v34/wave2-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toWorkspaceRole(role: 'LEAD' | 'RESEARCHER' | 'REVIEWER' | 'VIEWER'): WorkspaceRole {
  if (role === 'LEAD') return 'ADMIN';
  if (role === 'REVIEWER') return 'REVIEWER';
  if (role === 'VIEWER') return 'VIEWER';
  return 'CONTRIBUTOR';
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-proj-member-patch', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateProjectMemberRoleInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id, userId } = await context.params;
  const member = await updateProjectMemberRole({
    projectId: id,
    userId,
    role: toWorkspaceRole(parsed.data.role),
    supabase: auth.actor.supabase,
  });
  if (!member) {
    return NextResponse.json({ error: 'Project member not found.' }, { status: 404 });
  }
  return NextResponse.json({ member });
}
