import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { parsePaginationParams } from '@/lib/v34/pagination';
import { listWorkspacesPage } from '@/lib/v34/sql-list-readers';
import { CreateWorkspaceInputSchema } from '@/lib/v34/wave2-contracts';
import { createWorkspace } from '@/lib/v34/wave2-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'v34-workspaces-read', 120, 60_000);
  if (limited) return limited;

  const page = await listWorkspacesPage(parsePaginationParams(request.url));
  return NextResponse.json({
    workspaces: page.items,
    cursor: page.cursor,
    limit: page.limit,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    total: page.total,
  });
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
