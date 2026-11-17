import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { runWithIdempotency } from '@/lib/v34/idempotency';
import { listToolRepositories } from '@/lib/v34/wave3-store';
import { LinkWorkspaceToolInputSchema } from '@/lib/v34/wave5-contracts';
import {
  linkToolToWorkspace,
  listWorkspaceTools,
  unlinkToolFromWorkspace,
} from '@/lib/v34/wave5-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const links = listWorkspaceTools(id);
  const allTools = await listToolRepositories();
  const byId = new Map(allTools.map((t) => [t.id, t]));
  const tools = links.map((link) => ({
    ...link,
    tool: byId.get(link.toolRepositoryId) ?? null,
  }));
  return NextResponse.json({ workspaceId: id, tools, total: tools.length });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-workspace-tool-link', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, LinkWorkspaceToolInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  return runWithIdempotency(
    request,
    {
      scope: `POST:/api/workspaces/${id}/tools`,
      actorId: auth.actor.id,
      payloadHashInput: parsed.data,
    },
    async () => {
      const result = await linkToolToWorkspace({
        workspaceId: id,
        toolRepositoryId: parsed.data.toolRepositoryId,
        pinned: parsed.data.pinned,
        notes: parsed.data.notes,
        actorId: auth.actor.id,
        supabase: auth.actor.supabase,
      });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.message, code: result.code },
          { status: result.status },
        );
      }
      return NextResponse.json({ workspaceTool: result.workspaceTool }, { status: 201 });
    },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-workspace-tool-unlink', 30, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const url = new URL(request.url);
  const toolRepositoryId = url.searchParams.get('toolRepositoryId')?.trim();
  if (!toolRepositoryId) {
    return NextResponse.json(
      { error: 'Query parameter toolRepositoryId is required.' },
      { status: 400 },
    );
  }

  const result = await unlinkToolFromWorkspace({
    workspaceId: id,
    toolRepositoryId,
    actorId: auth.actor.id,
    supabase: auth.actor.supabase,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json({ removed: true, workspaceId: id, toolRepositoryId });
}
