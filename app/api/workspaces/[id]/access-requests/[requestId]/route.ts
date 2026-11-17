import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { DecideWorkspaceAccessRequestInputSchema } from '@/lib/v34/wave8-contracts';
import { decideWorkspaceAccessRequest, isWorkspaceAdminOrOwner } from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; requestId: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-ws-access-decide', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, DecideWorkspaceAccessRequestInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id, requestId } = await context.params;
  if (!auth.actor.isEditor && !isWorkspaceAdminOrOwner(id, auth.actor.id)) {
    return NextResponse.json({ error: 'Workspace admin or owner role required.' }, { status: 403 });
  }

  const updated = await decideWorkspaceAccessRequest({
    workspaceId: id,
    requestId,
    decidedBy: auth.actor.id,
    status: parsed.data.status,
    decisionNote: parsed.data.decisionNote,
    supabase: auth.actor.supabase,
  });
  if (!updated) {
    return NextResponse.json({ error: 'Workspace access request not found.' }, { status: 404 });
  }
  return NextResponse.json({ accessRequest: updated });
}
