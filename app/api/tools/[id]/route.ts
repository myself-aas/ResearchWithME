import { NextResponse } from 'next/server';
import { enforceRateLimit, parseJsonBody, requireContributor } from '@/lib/v34/http';
import { getToolRepositoryByIdOrSlug, updateToolRepository } from '@/lib/v34/wave3-store';
import { UpdateToolRepoInputSchema } from '@/lib/v34/wave7-contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const tool = getToolRepositoryByIdOrSlug(id);
  if (!tool) {
    return NextResponse.json({ error: 'Tool repository not found.' }, { status: 404 });
  }
  return NextResponse.json({ tool });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, 'v34-tool-update', 20, 60_000);
  if (limited) return limited;

  const auth = await requireContributor();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, UpdateToolRepoInputSchema);
  if (!parsed.ok) return parsed.response;

  const { id } = await context.params;
  const result = await updateToolRepository({
    idOrSlug: id,
    ...parsed.data,
    supabase: auth.actor.supabase,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json({ tool: result.tool });
}
