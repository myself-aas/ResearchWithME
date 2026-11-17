import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateWorkspaceAccessRequestInputSchema } from '@/lib/v34/wave8-contracts';
import {
  createWorkspaceAccessRequest,
  isWorkspaceAdminOrOwner,
  listWorkspaceAccessRequests,
} from '@/lib/v34/wave8-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-ws-access-list', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const all = listWorkspaceAccessRequests(id);
  const canModerate = auth.actor.isEditor || isWorkspaceAdminOrOwner(id, auth.actor.id);
  const visible = canModerate ? all : all.filter((r) => r.requesterId === auth.actor.id);
  return NextResponse.json({ accessRequests: visible, total: visible.length });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-ws-access-create', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateWorkspaceAccessRequestInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const reqRecord = await createWorkspaceAccessRequest({
    workspaceId: id,
    requesterId: auth.actor.id,
    requestedRole: parsed.data.requestedRole,
    rationale: parsed.data.rationale,
    supabase: auth.actor.supabase,
  });
  if (!reqRecord) {
    return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });
  }
  return NextResponse.json({ accessRequest: reqRecord }, { status: 201 });
}
