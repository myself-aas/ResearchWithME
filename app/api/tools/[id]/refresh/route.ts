import { NextResponse } from 'next/server';
import { enforceRateLimit, requireContributor } from '@/lib/v34/http';
import { refreshToolRepositoryMetadata } from '@/lib/v34/wave3-store';
import { emitDomainEvent, enqueueBackgroundJob } from '@/lib/v34/outbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = await enforceRateLimit(request, 'v34-tools-refresh', 15, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const res = await refreshToolRepositoryMetadata({
    idOrSlug: id,
    supabase: auth.actor.supabase,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.message }, { status: res.status });
  }
  await enqueueBackgroundJob({
    ownerId: auth.actor.id,
    jobType: 'source.refresh',
    payload: { toolId: res.tool.id, repositoryUrl: res.tool.repositoryUrl },
    supabase: auth.actor.supabase,
  });
  await emitDomainEvent(
    { type: 'ToolMetadataRefreshed', toolId: res.tool.id, actorId: auth.actor.id },
    { actorId: auth.actor.id, supabase: auth.actor.supabase },
  );
  return NextResponse.json({ tool: res.tool, refreshedAt: res.refreshedAt });
}
