import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { CreateWorkspaceInputSchema } from '@/lib/v34/wave2-contracts';
import { createWorkspace, listWorkspaces } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const workspaces = await listWorkspaces();
  return NextResponse.json({ workspaces, total: workspaces.length });
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-workspaces-write', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, CreateWorkspaceInputSchema);
  if (!parsed.ok) return parsed.response;

  const workspace = await createWorkspace({
    ...parsed.data,
    ownerId: auth.actor.id,
    ownerHandle: auth.actor.handle,
    ownerName: auth.actor.name,
    supabase: auth.actor.supabase,
  });

  return NextResponse.json({ workspace }, { status: 201 });
}
